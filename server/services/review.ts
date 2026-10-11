import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { Actor } from "../auth";
import { assertRole, canAttachAsReviewer, canChangeStatus, canReviewCase, enforce } from "../authz";
import { db } from "../db";
import {
  caseCollaborators,
  caseEvents,
  caseEvidence,
  cases,
  evidence,
  evidenceShares,
  user,
} from "../db/schema";
import { conflict } from "../errors";
import { listCaseEvidence, listCollaborators, loadCase } from "./cases";
import { excerpt, notify } from "./notifications";

async function counts(caseIds: string[]) {
  if (!caseIds.length) return { evidence: new Map<string, number>(), collaborators: new Map<string, number>() };
  const [ev, co] = await Promise.all([
    db
      .select({ caseId: caseEvidence.caseId, n: count() })
      .from(caseEvidence)
      .where(and(inArray(caseEvidence.caseId, caseIds), eq(caseEvidence.side, "reporter")))
      .groupBy(caseEvidence.caseId),
    db
      .select({ caseId: caseCollaborators.caseId, n: count() })
      .from(caseCollaborators)
      .where(inArray(caseCollaborators.caseId, caseIds))
      .groupBy(caseCollaborators.caseId),
  ]);
  return {
    evidence: new Map(ev.map((r) => [r.caseId, r.n])),
    collaborators: new Map(co.map((r) => [r.caseId, r.n])),
  };
}

/** Board data: escalated and under review only. Drafts never appear (I1). */
export async function listBoard(actor: Actor, status?: "escalated" | "under_review") {
  assertRole(actor, "reviewer");
  const rows = await db
    .select({
      id: cases.id,
      title: cases.title,
      status: cases.status,
      escalatedAt: cases.escalatedAt,
      reporterName: user.name,
    })
    .from(cases)
    .innerJoin(user, eq(user.id, cases.ownerId))
    .where(status ? eq(cases.status, status) : inArray(cases.status, ["escalated", "under_review"]))
    .orderBy(asc(cases.escalatedAt));
  const c = await counts(rows.map((r) => r.id));
  return rows.map((r) => ({
    ...r,
    evidenceCount: c.evidence.get(r.id) ?? 0,
    collaboratorCount: c.collaborators.get(r.id) ?? 0,
  }));
}

export async function getReviewCase(actor: Actor, caseId: string) {
  assertRole(actor, "reviewer");
  const { c } = await loadCase(db, caseId);
  enforce(canReviewCase(actor, c));
  const [[owner], collaborators, reporterEvidence, reviewerEvidence, events] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, c.ownerId)),
    listCollaborators(db, caseId),
    listCaseEvidence(db, caseId, "reporter"),
    listCaseEvidence(db, caseId, "reviewer"),
    db
      .select({
        id: caseEvents.id,
        type: caseEvents.type,
        fromStatus: caseEvents.fromStatus,
        toStatus: caseEvents.toStatus,
        note: caseEvents.note,
        createdAt: caseEvents.createdAt,
        actorName: user.name,
      })
      .from(caseEvents)
      .innerJoin(user, eq(user.id, caseEvents.actorId))
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
    owner,
    collaborators,
    reporterEvidence,
    // Kept separate from the reporter's evidence, never shown to them (I5).
    reviewerEvidence,
    events,
  };
}

export async function setUnderReview(actor: Actor, caseId: string) {
  assertRole(actor, "reviewer");
  return db.transaction(async (tx) => {
    const { c, facts } = await loadCase(tx, caseId, { lock: true });
    enforce(canChangeStatus(actor, c.status, "under_review"), "Only an escalated case can be moved to under review.");
    const [updated] = await tx
      .update(cases)
      .set({ status: "under_review", updatedAt: new Date() })
      .where(eq(cases.id, caseId))
      .returning();
    await tx.insert(caseEvents).values({
      caseId,
      actorId: actor.id,
      type: "status_changed",
      fromStatus: c.status,
      toStatus: "under_review",
    });
    await notify(
      tx,
      [c.ownerId, ...facts.collaboratorIds].map((userId) => ({
        userId,
        type: "case_status_changed",
        title: "Your case is now under review",
        body: c.title,
        caseId,
      })),
    );
    return { id: updated.id, status: updated.status };
  });
}

export async function closeCase(actor: Actor, caseId: string, note: string) {
  assertRole(actor, "reviewer");
  return db.transaction(async (tx) => {
    const { c, facts } = await loadCase(tx, caseId, { lock: true });
    enforce(canChangeStatus(actor, c.status, "closed"), "This case is already closed.");
    const now = new Date();
    const [updated] = await tx
      .update(cases)
      .set({ status: "closed", closedAt: now, closedBy: actor.id, closingNote: note, updatedAt: now })
      .where(eq(cases.id, caseId))
      .returning();
    await tx.insert(caseEvents).values({
      caseId,
      actorId: actor.id,
      type: "closed",
      fromStatus: c.status,
      toStatus: "closed",
      note,
    });
    await notify(
      tx,
      [c.ownerId, ...facts.collaboratorIds].map((userId) => ({
        userId,
        type: "case_closed",
        title: "Your case has been closed",
        body: `${c.title}: ${excerpt(note)}`,
        caseId,
      })),
    );
    return { id: updated.id, status: updated.status, closedAt: updated.closedAt };
  });
}

/** Reviewer attachment: evidence owned by or shared with this reviewer, side = reviewer. */
export async function attachReviewerEvidence(actor: Actor, caseId: string, evidenceId: string) {
  assertRole(actor, "reviewer");
  return db.transaction(async (tx) => {
    const { c } = await loadCase(tx, caseId, { lock: true });
    const [ev] = await tx
      .select({ id: evidence.id, ownerId: evidence.ownerId })
      .from(evidence)
      .where(eq(evidence.id, evidenceId))
      .limit(1);
    const [share] = ev
      ? await tx
          .select({ userId: evidenceShares.userId })
          .from(evidenceShares)
          .where(and(eq(evidenceShares.evidenceId, evidenceId), eq(evidenceShares.userId, actor.id)))
          .limit(1)
      : [];
    enforce(
      canAttachAsReviewer(actor, c, ev ? { ownerId: ev.ownerId, sharedWithUser: Boolean(share) } : null),
      "This case is closed, so nothing more can be added.",
    );
    const inserted = await tx
      .insert(caseEvidence)
      .values({ caseId, evidenceId, attachedBy: actor.id, side: "reviewer" })
      .onConflictDoNothing()
      .returning({ id: caseEvidence.id });
    if (!inserted.length) throw conflict("That evidence is already attached to this case.", "already_attached");
    return { caseId, evidenceId, side: "reviewer" as const };
  });
}

export async function listArchives(actor: Actor, q?: string) {
  assertRole(actor, "reviewer");
  const term = q?.trim();
  const like = term ? `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%` : null;
  return db
    .select({
      id: cases.id,
      title: cases.title,
      closedAt: cases.closedAt,
      escalatedAt: cases.escalatedAt,
      closingNote: cases.closingNote,
      reporterName: user.name,
    })
    .from(cases)
    .innerJoin(user, eq(user.id, cases.ownerId))
    .where(
      and(
        eq(cases.status, "closed"),
        like
          ? or(ilike(cases.title, like), ilike(cases.description, like), ilike(cases.closingNote, like))
          : undefined,
      ),
    )
    .orderBy(desc(cases.closedAt))
    .limit(200);
}
