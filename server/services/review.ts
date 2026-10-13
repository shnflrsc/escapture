import { and, asc, count, desc, eq, gte, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { dayKey } from "@/lib/format";
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
      description: cases.description,
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
    description: excerpt(r.description, 160),
    evidenceCount: c.evidence.get(r.id) ?? 0,
    collaboratorCount: c.collaborators.get(r.id) ?? 0,
  }));
}

export const BOARD_PAGE_SIZE = 20;

export type BoardSort = "escalated" | "-escalated" | "status" | "-status" | "reporter" | "-reporter";
export type BoardQuery = {
  status?: "escalated" | "under_review";
  /** Matches the case title or the reporter's name. */
  q?: string;
  /** Left out: oldest escalated first, so what has waited longest is on top. */
  sort?: BoardSort;
  page?: number;
};

const likeTerm = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

/**
 * The Review Board's table: open cases only, filtered, sorted and paged. Drafts
 * and closed cases never appear, whatever the filters say (I1).
 */
export async function boardPage(actor: Actor, query: BoardQuery = {}) {
  assertRole(actor, "reviewer");
  const term = query.q?.trim();
  const search = term ? or(ilike(cases.title, likeTerm(term)), ilike(user.name, likeTerm(term))) : undefined;
  const open = inArray(cases.status, ["escalated", "under_review"]);
  const where = and(open, query.status ? eq(cases.status, query.status) : undefined, search);

  const sort = query.sort ?? "escalated";
  const dir = sort.startsWith("-") ? desc : asc;
  const column =
    sort.endsWith("status") ? cases.status : sort.endsWith("reporter") ? sql`lower(${user.name})` : cases.escalatedAt;
  const page = Math.max(1, query.page ?? 1);

  const [rows, byStatus] = await Promise.all([
    db
      .select({
        id: cases.id,
        title: cases.title,
        status: cases.status,
        escalatedAt: cases.escalatedAt,
        reporterName: user.name,
      })
      .from(cases)
      .innerJoin(user, eq(user.id, cases.ownerId))
      .where(where)
      .orderBy(dir(column), asc(cases.escalatedAt))
      .limit(BOARD_PAGE_SIZE)
      .offset((page - 1) * BOARD_PAGE_SIZE),
    // The tabs' counts follow the search, not the tab that is selected.
    db
      .select({ status: cases.status, n: count() })
      .from(cases)
      .innerJoin(user, eq(user.id, cases.ownerId))
      .where(and(open, search))
      .groupBy(cases.status),
  ]);
  const tally = { escalated: 0, under_review: 0 };
  for (const r of byStatus) if (r.status === "escalated" || r.status === "under_review") tally[r.status] = r.n;
  const total = query.status ? tally[query.status] : tally.escalated + tally.under_review;
  const c = await counts(rows.map((r) => r.id));
  return {
    items: rows.map((r) => ({
      ...r,
      evidenceCount: c.evidence.get(r.id) ?? 0,
      collaboratorCount: c.collaborators.get(r.id) ?? 0,
    })),
    counts: { all: tally.escalated + tally.under_review, ...tally },
    total,
    page,
    pages: Math.max(1, Math.ceil(total / BOARD_PAGE_SIZE)),
  };
}

/** The four numbers above the board. Each is a count with one plain fact beside it. */
export async function boardSummary(actor: Actor, now: Date = new Date()) {
  assertRole(actor, "reviewer");
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // The first of this month in Manila, where the university is.
  const monthStart = new Date(`${dayKey(now).slice(0, 7)}-01T00:00:00+08:00`);
  const [[open], [shared], [closed]] = await Promise.all([
    db
      .select({
        escalated: sql<number>`count(*) filter (where ${cases.status} = 'escalated')::int`,
        newThisWeek: sql<number>`count(*) filter (where ${cases.status} = 'escalated' and ${cases.escalatedAt} >= ${weekAgo.toISOString()}::timestamptz)::int`,
        underReview: sql<number>`count(*) filter (where ${cases.status} = 'under_review')::int`,
        oldestUnderReview: sql<Date | null>`min(${cases.escalatedAt}) filter (where ${cases.status} = 'under_review')`,
      })
      .from(cases)
      .where(inArray(cases.status, ["escalated", "under_review"])),
    // Evidence shared with this reviewer that no case holds yet.
    db
      .select({ n: count() })
      .from(evidenceShares)
      .innerJoin(evidence, eq(evidence.id, evidenceShares.evidenceId))
      .where(
        and(
          eq(evidenceShares.userId, actor.id),
          ne(evidence.ownerId, actor.id),
          sql`not exists (select 1 from ${caseEvidence} where ${caseEvidence.evidenceId} = ${evidence.id})`,
        ),
      ),
    db
      .select({ n: count() })
      .from(caseEvents)
      .where(and(eq(caseEvents.type, "closed"), gte(caseEvents.createdAt, monthStart))),
  ]);
  const oldest = open?.oldestUnderReview ? new Date(open.oldestUnderReview) : null;
  return {
    escalated: open?.escalated ?? 0,
    newThisWeek: open?.newThisWeek ?? 0,
    underReview: open?.underReview ?? 0,
    oldestUnderReviewDays: oldest ? Math.floor((now.getTime() - oldest.getTime()) / (24 * 60 * 60 * 1000)) : null,
    sharedUnattached: shared?.n ?? 0,
    closedThisMonth: closed?.n ?? 0,
  };
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

/** The cases (never drafts) a piece of evidence is attached to, and on which side. */
export async function casesWithEvidence(actor: Actor, evidenceId: string) {
  assertRole(actor, "reviewer");
  return db
    .select({ id: cases.id, title: cases.title, status: cases.status, side: caseEvidence.side })
    .from(caseEvidence)
    .innerJoin(cases, eq(cases.id, caseEvidence.caseId))
    .where(and(eq(caseEvidence.evidenceId, evidenceId), inArray(cases.status, ["escalated", "under_review", "closed"])))
    .orderBy(desc(caseEvidence.createdAt));
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
