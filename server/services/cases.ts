import { and, asc, count, desc, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { escalationDigest, type EscalationContent } from "@/lib/digest";
import { safeEqual } from "@/lib/hash";
import type { Actor } from "../auth";
import {
  canAddCollaborator,
  canAttachEvidence,
  canCreateCase,
  canDeleteCase,
  canDetachEvidence,
  canEditCase,
  canEscalate,
  canPreviewEscalation,
  canRemoveCollaborator,
  canViewCase,
  caseRole,
  enforce,
  type CaseStatus,
} from "../authz";
import { db, type Db, type Tx } from "../db";
import { caseCollaborators, caseEvents, caseEvidence, cases, evidence, user } from "../db/schema";
import { AppError, badRequest, conflict, forbidden, notFound } from "../errors";
import { notify } from "./notifications";
import { noAccount } from "./shares";

type CaseRow = typeof cases.$inferSelect;

/** Loads a case plus the facts authz needs. `lock` takes FOR UPDATE on the case row. */
export async function loadCase(dbx: Db | Tx, caseId: string, opts: { lock?: boolean } = {}) {
  const q = dbx.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  const [c] = await (opts.lock ? q.for("update") : q);
  if (!c) throw notFound();
  const collabs = await dbx
    .select({ userId: caseCollaborators.userId })
    .from(caseCollaborators)
    .where(eq(caseCollaborators.caseId, caseId));
  return {
    c,
    facts: {
      ownerId: c.ownerId,
      status: c.status as CaseStatus,
      collaboratorIds: collabs.map((x) => x.userId),
    },
  };
}

export async function listCollaborators(dbx: Db | Tx, caseId: string) {
  return dbx
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      via: caseCollaborators.via,
      addedAt: caseCollaborators.createdAt,
    })
    .from(caseCollaborators)
    .innerJoin(user, eq(user.id, caseCollaborators.userId))
    .where(eq(caseCollaborators.caseId, caseId))
    .orderBy(asc(caseCollaborators.createdAt));
}

/** One line of a closed case's evidence record. `evidenceId` is empty once the owner has deleted the item. */
export type CaseRecordItem = {
  key: string;
  evidenceId: string | null;
  label: string;
  kind: "facebook_post" | "facebook_message";
  capturedAt: Date;
  sha256: string;
  ownerName: string;
  ownerEmail: string;
  attachedAt: Date;
};

/**
 * A closed case's evidence, read from the record written when it closed, never
 * from the items themselves: those may since have been renamed or deleted by
 * their owners. Student-side callers always pass "reporter" (I5).
 */
export async function listCaseRecord(dbx: Db | Tx, caseId: string, side: "reporter" | "reviewer"): Promise<CaseRecordItem[]> {
  const rows = await dbx
    .select({
      key: caseEvidence.id,
      evidenceId: caseEvidence.evidenceId,
      label: caseEvidence.recordLabel,
      kind: caseEvidence.recordKind,
      capturedAt: caseEvidence.recordCapturedAt,
      sha256: caseEvidence.recordSha256,
      ownerName: caseEvidence.recordOwnerName,
      ownerEmail: caseEvidence.recordOwnerEmail,
      attachedAt: caseEvidence.createdAt,
    })
    .from(caseEvidence)
    .where(and(eq(caseEvidence.caseId, caseId), eq(caseEvidence.side, side)))
    .orderBy(asc(caseEvidence.createdAt));
  // The record columns are filled for every row when a case closes.
  return rows.map((r) => ({
    ...r,
    label: r.label ?? "",
    kind: r.kind ?? "facebook_post",
    capturedAt: r.capturedAt ?? r.attachedAt,
    sha256: r.sha256 ?? "",
    ownerName: r.ownerName ?? "",
    ownerEmail: r.ownerEmail ?? "",
  }));
}

/**
 * The ONLY way a live case's evidence is listed. Student-side callers always pass
 * "reporter", so reviewer attachments can never leak to them (I5).
 */
export async function listCaseEvidence(dbx: Db | Tx, caseId: string, side: "reporter" | "reviewer") {
  return dbx
    .select({
      id: evidence.id,
      label: evidence.label,
      kind: evidence.kind,
      capturedAt: evidence.capturedAt,
      sha256: evidence.sha256,
      ownerId: evidence.ownerId,
      ownerName: user.name,
      ownerEmail: user.email,
      attachedBy: caseEvidence.attachedBy,
      attachedAt: caseEvidence.createdAt,
    })
    .from(caseEvidence)
    .innerJoin(evidence, eq(evidence.id, caseEvidence.evidenceId))
    .innerJoin(user, eq(user.id, evidence.ownerId))
    .where(and(eq(caseEvidence.caseId, caseId), eq(caseEvidence.side, side)))
    .orderBy(asc(caseEvidence.createdAt));
}

async function owner(dbx: Db | Tx, c: CaseRow) {
  const [o] = await dbx
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, c.ownerId))
    .limit(1);
  return o;
}

export async function createCase(actor: Actor, input: { title: string; description: string }) {
  enforce(canCreateCase(actor));
  return db.transaction(async (tx) => {
    const [c] = await tx
      .insert(cases)
      .values({ ownerId: actor.id, title: input.title, description: input.description })
      .returning();
    await tx.insert(caseEvents).values({ caseId: c.id, actorId: actor.id, type: "created", toStatus: "draft" });
    return c;
  });
}

export async function listCases(actor: Actor) {
  enforce(canCreateCase(actor));
  const collabIds = (
    await db
      .select({ caseId: caseCollaborators.caseId })
      .from(caseCollaborators)
      .where(eq(caseCollaborators.userId, actor.id))
  ).map((r) => r.caseId);
  const rows = await db
    .select()
    .from(cases)
    .where(or(eq(cases.ownerId, actor.id), collabIds.length ? inArray(cases.id, collabIds) : undefined))
    .orderBy(desc(cases.updatedAt));
  if (rows.length === 0) return [];
  const counts = await db
    .select({ caseId: caseEvidence.caseId, n: count() })
    .from(caseEvidence)
    .where(
      and(
        inArray(
          caseEvidence.caseId,
          rows.map((r) => r.id),
        ),
        eq(caseEvidence.side, "reporter"),
      ),
    )
    .groupBy(caseEvidence.caseId);
  const byCase = new Map(counts.map((c) => [c.caseId, c.n]));
  const ids = rows.map((r) => r.id);
  const [people, owners] = await Promise.all([
    db
      .select({ caseId: caseCollaborators.caseId, n: count() })
      .from(caseCollaborators)
      .where(inArray(caseCollaborators.caseId, ids))
      .groupBy(caseCollaborators.caseId),
    db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(inArray(user.id, [...new Set(rows.map((r) => r.ownerId))])),
  ]);
  const collaborators = new Map(people.map((p) => [p.caseId, p.n]));
  const ownerName = new Map(owners.map((o) => [o.id, o.name]));
  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    role: c.ownerId === actor.id ? ("owner" as const) : ("collaborator" as const),
    ownerName: ownerName.get(c.ownerId) ?? "",
    evidenceCount: byCase.get(c.id) ?? 0,
    collaboratorCount: collaborators.get(c.id) ?? 0,
    updatedAt: c.updatedAt,
    escalatedAt: c.escalatedAt,
  }));
}

/**
 * For the evidence page: the cases holding this evidence that the viewer owns or
 * collaborates on, and the drafts its owner could still add it to. Says nothing about
 * anyone else's cases, and never counts what reviewers attached (I5).
 */
export async function casesForEvidence(actor: Actor, ev: { id: string; isOwner: boolean }) {
  const mine = await listCases(actor);
  if (mine.length === 0) return { attached: [], available: [] };
  const holding = new Set(
    (
      await db
        .select({ caseId: caseEvidence.caseId })
        .from(caseEvidence)
        .where(
          and(
            eq(caseEvidence.evidenceId, ev.id),
            eq(caseEvidence.side, "reporter"),
            inArray(
              caseEvidence.caseId,
              mine.map((c) => c.id),
            ),
          ),
        )
    ).map((r) => r.caseId),
  );
  const brief = (c: (typeof mine)[number]) => ({ id: c.id, title: c.title, status: c.status });
  return {
    attached: mine.filter((c) => holding.has(c.id)).map(brief),
    // Only your own evidence can go into a case, and only while the case is a draft.
    available: ev.isOwner ? mine.filter((c) => c.status === "draft" && !holding.has(c.id)).map(brief) : [],
  };
}

/** Student-side view: reporter evidence only, status events without reviewer identities. */
export async function getCase(actor: Actor, caseId: string) {
  const { c, facts } = await loadCase(db, caseId);
  enforce(canViewCase(actor, facts));
  const closed = c.status === "closed";
  const [o, collaborators, items, record, events] = await Promise.all([
    owner(db, c),
    listCollaborators(db, caseId),
    closed ? [] : listCaseEvidence(db, caseId, "reporter"),
    closed ? listCaseRecord(db, caseId, "reporter") : null,
    db
      .select({
        id: caseEvents.id,
        type: caseEvents.type,
        fromStatus: caseEvents.fromStatus,
        toStatus: caseEvents.toStatus,
        note: caseEvents.note,
        createdAt: caseEvents.createdAt,
      })
      .from(caseEvents)
      // Which reviewer was assigned is the review team's business, not the reporter's.
      .where(and(eq(caseEvents.caseId, caseId), notInArray(caseEvents.type, ["assigned", "unassigned"])))
      .orderBy(asc(caseEvents.createdAt)),
  ]);
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    escalatedAt: c.escalatedAt,
    closedAt: c.closedAt,
    closingNote: c.closingNote,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    role: caseRole(actor, facts)!,
    owner: o,
    collaborators,
    evidence: items,
    /** Set only on a closed case, in place of `evidence`. */
    record,
    events,
  };
}

export type CaseEdit = {
  title?: string;
  description?: string;
  /** The text each edited field had when the editor started from it. */
  base?: { title?: string; description?: string };
};

/**
 * Saves edits to a draft. Several people can edit one draft, so a field is only
 * written if it still holds the text the editor started from (`base`). If someone
 * else changed it meanwhile, nothing is written and the answer carries the
 * current text, so the editor can choose instead of overwriting.
 */
export async function updateCase(actor: Actor, caseId: string, input: CaseEdit) {
  return db.transaction(async (tx) => {
    const { c, facts } = await loadCase(tx, caseId, { lock: true });
    enforce(canEditCase(actor, facts), "This case has been escalated, so it can't be edited.");
    const changes: { title?: string; description?: string } = {};
    const current: { title?: string; description?: string } = {};
    for (const field of ["title", "description"] as const) {
      const next = input[field];
      if (next === undefined || next === c[field]) continue;
      const base = input.base?.[field];
      if (base !== undefined && base !== c[field]) current[field] = c[field];
      else changes[field] = next;
    }
    if (Object.keys(current).length) {
      throw new AppError("edit_conflict", 409, "Someone else changed this while you were editing.", { current });
    }
    if (Object.keys(changes).length === 0) return view(c);
    const [updated] = await tx
      .update(cases)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(cases.id, caseId))
      .returning();
    return view(updated);
  });
}

const view = (c: CaseRow) => ({ id: c.id, title: c.title, description: c.description, updatedAt: c.updatedAt });

/** A cheap "has anything changed?" for a page that is open on a draft. */
export async function caseVersion(actor: Actor, caseId: string) {
  const { c, facts } = await loadCase(db, caseId);
  enforce(canViewCase(actor, facts));
  return { updatedAt: c.updatedAt, status: c.status };
}

/**
 * Adds one or several of the actor's own items to a draft. All or nothing: one
 * item that can't be added (not theirs, already in the case) stops the lot.
 */
export async function attachEvidence(actor: Actor, caseId: string, evidenceIds: string[]) {
  const ids = [...new Set(evidenceIds)];
  return db.transaction(async (tx) => {
    const { facts } = await loadCase(tx, caseId, { lock: true });
    const found = await tx
      .select({ id: evidence.id, ownerId: evidence.ownerId })
      .from(evidence)
      .where(inArray(evidence.id, ids));
    for (const id of ids) {
      const decision = canAttachEvidence(actor, facts, found.find((e) => e.id === id) ?? null);
      if (decision === "forbidden") {
        throw forbidden("You can only add evidence from your own vault.");
      }
      enforce(decision, "This case has been escalated, so evidence can't be added.");
    }
    const inserted = await tx
      .insert(caseEvidence)
      .values(ids.map((evidenceId) => ({ caseId, evidenceId, attachedBy: actor.id, side: "reporter" as const })))
      .onConflictDoNothing()
      .returning({ id: caseEvidence.id });
    if (inserted.length !== ids.length) {
      // Throwing rolls back the ones that did go in.
      throw conflict(
        ids.length === 1 ? "That evidence is already in this case." : "Some of that evidence is already in this case.",
        "already_attached",
      );
    }
    await tx.update(cases).set({ updatedAt: new Date() }).where(eq(cases.id, caseId));
    return { caseId, evidenceIds: ids };
  });
}

export async function detachEvidence(actor: Actor, caseId: string, evidenceId: string) {
  await db.transaction(async (tx) => {
    const { facts } = await loadCase(tx, caseId, { lock: true });
    enforce(canViewCase(actor, facts));
    const [row] = await tx
      .select()
      .from(caseEvidence)
      .where(
        and(
          eq(caseEvidence.caseId, caseId),
          eq(caseEvidence.evidenceId, evidenceId),
          eq(caseEvidence.side, "reporter"),
        ),
      )
      .limit(1);
    // Check the lock before existence so a locked case always answers 409.
    if (facts.status !== "draft" || row) {
      enforce(
        canDetachEvidence(actor, facts, { attachedBy: row?.attachedBy ?? "" }),
        "This case has been escalated, so evidence can't be removed.",
      );
    }
    if (!row) throw notFound();
    await tx.delete(caseEvidence).where(eq(caseEvidence.id, row.id));
    await tx.update(cases).set({ updatedAt: new Date() }).where(eq(cases.id, caseId));
  });
}

export async function addCollaborator(actor: Actor, caseId: string, email: string) {
  return db.transaction(async (tx) => {
    const { c, facts } = await loadCase(tx, caseId, { lock: true });
    enforce(canAddCollaborator(actor, facts), "This case has been escalated, so new people can't be added.");
    const [recipient] = await tx
      .select({ id: user.id, name: user.name, email: user.email, role: user.role })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (!recipient) throw noAccount();
    if (recipient.id === actor.id) throw badRequest("You already own this case.");
    if (recipient.role !== "student") throw badRequest("Only student accounts can be added to a case.");
    const inserted = await tx
      .insert(caseCollaborators)
      .values({ caseId, userId: recipient.id, addedBy: actor.id, via: "email", acknowledgedAt: new Date() })
      .onConflictDoNothing()
      .returning({ userId: caseCollaborators.userId });
    if (inserted.length) {
      await notify(tx, [
        {
          userId: recipient.id,
          type: "case_shared",
          title: `${actor.name} added you to a case`,
          body: c.title,
          caseId,
        },
      ]);
      await tx.update(cases).set({ updatedAt: new Date() }).where(eq(cases.id, caseId));
    }
    return { added: { id: recipient.id, name: recipient.name, email: recipient.email } };
  });
}

/**
 * Deletes a draft for everyone on it. The evidence is only detached: it stays in
 * each person's vault. Collaborators, links and the draft's history go with it.
 */
export async function deleteCase(actor: Actor, caseId: string) {
  await db.transaction(async (tx) => {
    // The same lock escalation takes, so a case can't be escalated and deleted at once.
    const { c, facts } = await loadCase(tx, caseId, { lock: true });
    const decision = canDeleteCase(actor, facts);
    if (decision === "forbidden") throw forbidden("Only the person who started this case can delete it.");
    enforce(decision, "This case has been escalated, so it can't be deleted.");
    await tx.delete(cases).where(eq(cases.id, caseId));
    // Notifications that point at a case are removed with it, so this one doesn't.
    await notify(
      tx,
      facts.collaboratorIds.map((userId) => ({
        userId,
        type: "case_deleted",
        title: `${actor.name} deleted a case you were on`,
        body: `${c.title}. Your own evidence is still in your vault.`,
      })),
    );
  });
}

/**
 * Takes someone off a draft: the owner removing a collaborator, or a collaborator
 * leaving. The evidence that person added leaves the case with them, so nothing of
 * theirs can reach reviewers on a case they are no longer part of.
 */
export async function removeCollaborator(actor: Actor, caseId: string, userId: string) {
  return db.transaction(async (tx) => {
    const { c, facts } = await loadCase(tx, caseId, { lock: true });
    const decision = canRemoveCollaborator(actor, facts, userId);
    if (decision === "forbidden") {
      throw forbidden(
        userId === facts.ownerId
          ? "The person who started a case can't be removed from it."
          : "Only the person who started this case can remove someone else.",
      );
    }
    enforce(decision, "This case has been escalated, so the people on it can't change.");
    const theirs = tx.select({ id: evidence.id }).from(evidence).where(eq(evidence.ownerId, userId));
    const detached = await tx
      .delete(caseEvidence)
      .where(
        and(eq(caseEvidence.caseId, caseId), eq(caseEvidence.side, "reporter"), inArray(caseEvidence.evidenceId, theirs)),
      )
      .returning({ id: caseEvidence.id });
    await tx
      .delete(caseCollaborators)
      .where(and(eq(caseCollaborators.caseId, caseId), eq(caseCollaborators.userId, userId)));
    await tx.update(cases).set({ updatedAt: new Date() }).where(eq(cases.id, caseId));
    const left = actor.id === userId;
    await notify(tx, [
      left
        ? { userId: c.ownerId, type: "collaborator_left", title: `${actor.name} left your case`, body: c.title, caseId }
        : {
            // No link: they can no longer open the case.
            userId,
            type: "collaborator_removed",
            title: `${actor.name} removed you from a case`,
            body: `${c.title}. Your own evidence is still in your vault.`,
          },
    ]);
    return { removed: userId, left, evidenceRemoved: detached.length };
  });
}

async function buildEscalationContent(dbx: Db | Tx, c: CaseRow): Promise<EscalationContent> {
  const [o, collaborators, items] = await Promise.all([
    owner(dbx, c),
    listCollaborators(dbx, c.id),
    listCaseEvidence(dbx, c.id, "reporter"),
  ]);
  return {
    caseId: c.id,
    title: c.title,
    description: c.description,
    owner: o,
    collaborators: collaborators.map(({ id, name, email }) => ({ id, name, email })),
    evidence: items.map((e) => ({
      id: e.id,
      label: e.label,
      kind: e.kind,
      capturedAt: e.capturedAt.toISOString(),
      sha256: e.sha256,
      addedBy: e.ownerName,
    })),
  };
}

/** Exactly what reviewers will see, plus a digest of it (I4). */
export async function escalationPreview(actor: Actor, caseId: string) {
  const { c, facts } = await loadCase(db, caseId);
  enforce(canPreviewEscalation(actor, facts), "This case has already been escalated.");
  const content = await buildEscalationContent(db, c);
  return { ...content, digest: escalationDigest(content) };
}

export async function escalate(actor: Actor, caseId: string, digest: string) {
  return db.transaction(async (tx) => {
    const { c, facts } = await loadCase(tx, caseId, { lock: true });
    enforce(canEscalate(actor, facts), "This case has already been escalated.");
    const content = await buildEscalationContent(tx, c);
    if (content.evidence.length === 0) {
      throw badRequest("Add at least one piece of evidence before escalating.");
    }
    // The confirmed preview must equal what is submitted.
    if (!safeEqual(escalationDigest(content), digest)) {
      throw conflict("The case changed since you opened the preview. Review the preview again.", "preview_changed");
    }
    const now = new Date();
    const [updated] = await tx
      .update(cases)
      .set({ status: "escalated", escalatedAt: now, updatedAt: now })
      .where(eq(cases.id, caseId))
      .returning();
    await tx.insert(caseEvents).values({
      caseId,
      actorId: actor.id,
      type: "escalated",
      fromStatus: "draft",
      toStatus: "escalated",
    });
    // Administrators hear too: they decide who takes the case.
    const reviewers = await tx
      .select({ id: user.id })
      .from(user)
      .where(and(inArray(user.role, ["reviewer", "admin"]), sql`${user.deactivatedAt} is null`));
    await notify(tx, [
      ...reviewers.map((r) => ({
        userId: r.id,
        type: "case_escalated",
        title: "A new case was escalated",
        body: c.title,
        caseId,
      })),
      ...[c.ownerId, ...facts.collaboratorIds].map((userId) => ({
        userId,
        type: "case_escalated",
        title: "Your case has been escalated to reviewers",
        body: c.title,
        caseId,
      })),
    ]);
    return { id: updated.id, status: updated.status, escalatedAt: updated.escalatedAt };
  });
}
