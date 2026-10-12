import { and, asc, count, desc, eq, inArray, or } from "drizzle-orm";
import { escalationDigest, type EscalationContent } from "@/lib/digest";
import { safeEqual } from "@/lib/hash";
import type { Actor } from "../auth";
import {
  canAddCollaborator,
  canAttachEvidence,
  canCreateCase,
  canDetachEvidence,
  canEditCase,
  canEscalate,
  canPreviewEscalation,
  canViewCase,
  caseRole,
  enforce,
  type CaseStatus,
} from "../authz";
import { db, type Db, type Tx } from "../db";
import { caseCollaborators, caseEvents, caseEvidence, cases, evidence, user } from "../db/schema";
import { badRequest, conflict, forbidden, notFound } from "../errors";
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

/**
 * The ONLY way case evidence is listed. Student-side callers always pass
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
  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    role: c.ownerId === actor.id ? ("owner" as const) : ("collaborator" as const),
    evidenceCount: byCase.get(c.id) ?? 0,
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
  const [o, collaborators, items, events] = await Promise.all([
    owner(db, c),
    listCollaborators(db, caseId),
    listCaseEvidence(db, caseId, "reporter"),
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
      .where(eq(caseEvents.caseId, caseId))
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
    events,
  };
}

export async function updateCase(
  actor: Actor,
  caseId: string,
  input: { title?: string; description?: string },
) {
  return db.transaction(async (tx) => {
    const { facts } = await loadCase(tx, caseId, { lock: true });
    enforce(canEditCase(actor, facts), "This case has been escalated, so it can't be edited.");
    const [updated] = await tx
      .update(cases)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(cases.id, caseId))
      .returning();
    return updated;
  });
}

export async function attachEvidence(actor: Actor, caseId: string, evidenceId: string) {
  return db.transaction(async (tx) => {
    const { facts } = await loadCase(tx, caseId, { lock: true });
    const [ev] = await tx
      .select({ id: evidence.id, ownerId: evidence.ownerId })
      .from(evidence)
      .where(eq(evidence.id, evidenceId))
      .limit(1);
    const decision = canAttachEvidence(actor, facts, ev ?? null);
    if (decision === "forbidden") {
      throw forbidden("You can only add evidence from your own vault.");
    }
    enforce(decision, "This case has been escalated, so evidence can't be added.");
    const inserted = await tx
      .insert(caseEvidence)
      .values({ caseId, evidenceId, attachedBy: actor.id, side: "reporter" })
      .onConflictDoNothing()
      .returning({ id: caseEvidence.id });
    if (!inserted.length) throw conflict("That evidence is already in this case.", "already_attached");
    await tx.update(cases).set({ updatedAt: new Date() }).where(eq(cases.id, caseId));
    return { caseId, evidenceId };
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
    const reviewers = await tx.select({ id: user.id }).from(user).where(eq(user.role, "reviewer"));
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
