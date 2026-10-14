import { and, asc, count, desc, eq, gte, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { dayKey } from "@/lib/format";
import type { Actor } from "../auth";
import {
  assertRole,
  canAssignReviewer,
  canAttachAsReviewer,
  canChangeStatus,
  canReviewCase,
  enforce,
  STAFF,
} from "../authz";
import { db } from "../db";
import {
  caseAssignments,
  caseCollaborators,
  caseFlags,
  caseEvents,
  caseEvidence,
  cases,
  evidence,
  evidenceShares,
  user,
} from "../db/schema";
import { badRequest, conflict, notFound } from "../errors";
import { listCaseEvidence, listCaseRecord, listCollaborators, loadCase } from "./cases";
import { flagsFor } from "./flags";
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

/** Who is assigned to each of these cases, in the order they were assigned. */
async function assigneesOf(caseIds: string[]) {
  const byCase = new Map<string, { id: string; name: string }[]>();
  if (!caseIds.length) return byCase;
  const rows = await db
    .select({ caseId: caseAssignments.caseId, id: user.id, name: user.name })
    .from(caseAssignments)
    .innerJoin(user, eq(user.id, caseAssignments.reviewerId))
    .where(inArray(caseAssignments.caseId, caseIds))
    .orderBy(asc(caseAssignments.createdAt));
  for (const r of rows) byCase.set(r.caseId, [...(byCase.get(r.caseId) ?? []), { id: r.id, name: r.name }]);
  return byCase;
}

/** Board data: escalated and under review only. Drafts never appear (I1). */
export async function listBoard(actor: Actor, status?: "escalated" | "under_review") {
  assertRole(actor, ...STAFF);
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
  /** Only cases with at least one collaborator. */
  collab?: boolean;
  /** Only cases a reviewer has attached evidence to. */
  rev?: boolean;
  /** Only cases assigned to the person asking. */
  mine?: boolean;
  /** Only cases nobody is assigned to. */
  unassigned?: boolean;
  /** Only cases escalated within this many days. */
  days?: number;
  /** Only cases whose title or description contains a word from the word bank. */
  flagged?: boolean;
};

const likeTerm = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

/**
 * The Review Board's table: open cases only, filtered, sorted and paged. Drafts
 * and closed cases never appear, whatever the filters say (I1).
 */
export async function boardPage(actor: Actor, query: BoardQuery = {}) {
  assertRole(actor, ...STAFF);
  const term = query.q?.trim();
  const search = and(
    term ? or(ilike(cases.title, likeTerm(term)), ilike(user.name, likeTerm(term))) : undefined,
    query.collab
      ? sql`exists (select 1 from ${caseCollaborators} where ${caseCollaborators.caseId} = ${cases.id})`
      : undefined,
    query.rev
      ? sql`exists (select 1 from ${caseEvidence} where ${caseEvidence.caseId} = ${cases.id} and ${caseEvidence.side} = 'reviewer')`
      : undefined,
    query.mine
      ? sql`exists (select 1 from ${caseAssignments} where ${caseAssignments.caseId} = ${cases.id} and ${caseAssignments.reviewerId} = ${actor.id})`
      : undefined,
    query.unassigned
      ? sql`not exists (select 1 from ${caseAssignments} where ${caseAssignments.caseId} = ${cases.id})`
      : undefined,
    query.days ? gte(cases.escalatedAt, new Date(Date.now() - query.days * 24 * 60 * 60 * 1000)) : undefined,
    query.flagged ? sql`exists (select 1 from ${caseFlags} where ${caseFlags.caseId} = ${cases.id})` : undefined,
  );
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
  const ids = rows.map((r) => r.id);
  const [c, assignees, flags, latest] = await Promise.all([
    counts(ids),
    assigneesOf(ids),
    flagsFor(ids),
    // The newest event of each case on this page, for the "Last update" column.
    ids.length
      ? db
          .selectDistinctOn([caseEvents.caseId], {
            caseId: caseEvents.caseId,
            type: caseEvents.type,
            at: caseEvents.createdAt,
          })
          .from(caseEvents)
          .where(inArray(caseEvents.caseId, ids))
          .orderBy(caseEvents.caseId, desc(caseEvents.createdAt))
      : [],
  ]);
  const last = new Map(latest.map((e) => [e.caseId, e]));
  return {
    items: rows.map((r) => ({
      ...r,
      lastEvent: last.get(r.id) ? { type: last.get(r.id)!.type, at: last.get(r.id)!.at } : null,
      evidenceCount: c.evidence.get(r.id) ?? 0,
      collaboratorCount: c.collaborators.get(r.id) ?? 0,
      assignees: assignees.get(r.id) ?? [],
      flaggedWords: flags.get(r.id) ?? [],
    })),
    counts: { all: tally.escalated + tally.under_review, ...tally },
    total,
    page,
    pages: Math.max(1, Math.ceil(total / BOARD_PAGE_SIZE)),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
export type BoardRange = "30d" | "90d" | "all";
export const RANGE_DAYS: Record<BoardRange, number | null> = { "30d": 30, "90d": 90, all: null };

/**
 * What sits around the board's table: escalations per week for the last seven
 * weeks, how the cases escalated in the chosen period stand now, and the latest
 * things that happened on open cases. Counts only; nothing from inside a case.
 */
export async function boardInsights(actor: Actor, range: BoardRange = "90d", now: Date = new Date()) {
  assertRole(actor, ...STAFF);
  // Weeks run Monday to Sunday in Manila. `thisMonday` is the start of the current one.
  const today = new Date(`${dayKey(now)}T00:00:00+08:00`);
  const sinceMonday = (new Date(`${dayKey(now)}T12:00:00+08:00`).getUTCDay() + 6) % 7;
  const thisMonday = new Date(today.getTime() - sinceMonday * DAY_MS);
  const firstWeek = new Date(thisMonday.getTime() - 6 * 7 * DAY_MS);
  const days = RANGE_DAYS[range];
  const since = days === null ? null : new Date(now.getTime() - days * DAY_MS);

  const [escalations, statuses, events] = await Promise.all([
    db
      .select({ at: cases.escalatedAt })
      .from(cases)
      .where(and(ne(cases.status, "draft"), gte(cases.escalatedAt, firstWeek))),
    db
      .select({ status: cases.status, n: count() })
      .from(cases)
      .where(and(ne(cases.status, "draft"), since ? gte(cases.escalatedAt, since) : undefined))
      .groupBy(cases.status),
    db
      .select({
        id: caseEvents.id,
        type: caseEvents.type,
        createdAt: caseEvents.createdAt,
        caseId: cases.id,
        caseTitle: cases.title,
        actorName: user.name,
      })
      .from(caseEvents)
      .innerJoin(cases, eq(cases.id, caseEvents.caseId))
      .innerJoin(user, eq(user.id, caseEvents.actorId))
      // A case's time as a draft is the student's own business (I1).
      .where(and(inArray(cases.status, ["escalated", "under_review"]), ne(caseEvents.type, "created")))
      .orderBy(desc(caseEvents.createdAt))
      .limit(8),
  ]);

  const weeks = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(firstWeek.getTime() + i * 7 * DAY_MS);
    const end = new Date(start.getTime() + 7 * DAY_MS);
    return {
      start,
      count: escalations.filter((e) => e.at && e.at >= start && e.at < end).length,
    };
  });
  const tally = { escalated: 0, under_review: 0, closed: 0 };
  for (const r of statuses) if (r.status !== "draft") tally[r.status] = r.n;
  return { weeks, statuses: tally, range, activity: events };
}

/** The four numbers above the board. Each is a count with one plain fact beside it. */
export async function boardSummary(actor: Actor, now: Date = new Date()) {
  assertRole(actor, ...STAFF);
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
  assertRole(actor, ...STAFF);
  const { c } = await loadCase(db, caseId);
  enforce(canReviewCase(actor, c));
  const isClosed = c.status === "closed";
  const [[owner], collaborators, reporterEvidence, reviewerEvidence, reporterRecord, reviewerRecord, assignees, events] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, c.ownerId)),
    listCollaborators(db, caseId),
    isClosed ? [] : listCaseEvidence(db, caseId, "reporter"),
    isClosed ? [] : listCaseEvidence(db, caseId, "reviewer"),
    // After closure the content is no longer staff's to see: only the record of what was attached.
    isClosed ? listCaseRecord(db, caseId, "reporter") : null,
    isClosed ? listCaseRecord(db, caseId, "reviewer") : null,
    db
      .select({ id: user.id, name: user.name, email: user.email, assignedAt: caseAssignments.createdAt })
      .from(caseAssignments)
      .innerJoin(user, eq(user.id, caseAssignments.reviewerId))
      .where(eq(caseAssignments.caseId, caseId))
      .orderBy(asc(caseAssignments.createdAt)),
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
    reporterRecord,
    reviewerRecord,
    assignees,
    flaggedWords: (await flagsFor([caseId])).get(caseId) ?? [],
    events,
  };
}

/** The reviewer accounts an administrator can assign: every one that isn't deactivated. */
export async function listAssignableReviewers(actor: Actor) {
  assertRole(actor, "admin");
  return db
    .select({ id: user.id, name: user.name, email: user.email, office: user.office })
    .from(user)
    .where(and(eq(user.role, "reviewer"), sql`${user.deactivatedAt} is null`))
    .orderBy(sql`lower(${user.name})`);
}

/** An administrator asks a reviewer to take an open case. The reviewer is told. */
export async function assignReviewer(actor: Actor, caseId: string, reviewerId: string) {
  assertRole(actor, ...STAFF);
  return db.transaction(async (tx) => {
    const { c } = await loadCase(tx, caseId, { lock: true });
    enforce(canAssignReviewer(actor, c), "This case is closed, so its reviewers can't be changed.");
    const [target] = await tx
      .select({ id: user.id, name: user.name, role: user.role, deactivatedAt: user.deactivatedAt })
      .from(user)
      .where(eq(user.id, reviewerId))
      .limit(1);
    if (!target || target.role !== "reviewer") throw notFound("We couldn't find that reviewer.");
    if (target.deactivatedAt) throw badRequest("That reviewer's account is deactivated.");
    const inserted = await tx
      .insert(caseAssignments)
      .values({ caseId, reviewerId, assignedBy: actor.id })
      .onConflictDoNothing()
      .returning({ reviewerId: caseAssignments.reviewerId });
    if (!inserted.length) throw conflict(`${target.name} is already assigned to this case.`, "already_assigned");
    // The note holds the reviewer's name as it was, so the history reads the same later.
    await tx.insert(caseEvents).values({ caseId, actorId: actor.id, type: "assigned", note: target.name });
    await notify(tx, [
      { userId: reviewerId, type: "case_assigned", title: "You were assigned to a case", body: c.title, caseId },
    ]);
    return { caseId, reviewer: { id: target.id, name: target.name } };
  });
}

export async function unassignReviewer(actor: Actor, caseId: string, reviewerId: string) {
  assertRole(actor, ...STAFF);
  return db.transaction(async (tx) => {
    const { c } = await loadCase(tx, caseId, { lock: true });
    enforce(canAssignReviewer(actor, c), "This case is closed, so its reviewers can't be changed.");
    const removed = await tx
      .delete(caseAssignments)
      .where(and(eq(caseAssignments.caseId, caseId), eq(caseAssignments.reviewerId, reviewerId)))
      .returning({ reviewerId: caseAssignments.reviewerId });
    if (!removed.length) throw notFound("That reviewer isn't assigned to this case.");
    const [target] = await tx.select({ name: user.name }).from(user).where(eq(user.id, reviewerId)).limit(1);
    await tx.insert(caseEvents).values({ caseId, actorId: actor.id, type: "unassigned", note: target?.name ?? null });
    await notify(tx, [
      { userId: reviewerId, type: "case_unassigned", title: "You were taken off a case", body: c.title, caseId },
    ]);
    return { caseId, reviewerId };
  });
}

export async function setUnderReview(actor: Actor, caseId: string) {
  assertRole(actor, ...STAFF);
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
  assertRole(actor, ...STAFF);
  return db.transaction(async (tx) => {
    const { c, facts } = await loadCase(tx, caseId, { lock: true });
    enforce(canChangeStatus(actor, c.status, "closed"), "This case is already closed.");
    // Before the status changes, write what each item was. The archive is read from these columns.
    await tx.execute(sql`
      update ${caseEvidence} set
        "record_label" = e."label", "record_sha256" = e."sha256", "record_kind" = e."kind",
        "record_captured_at" = e."captured_at", "record_owner_name" = u."name", "record_owner_email" = u."email"
      from ${evidence} e, ${user} u
      where e."id" = ${caseEvidence.evidenceId} and u."id" = e."owner_id" and ${caseEvidence.caseId} = ${caseId}`);
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

/** Staff attachment: evidence owned by or shared with this person, side = reviewer. */
export async function attachReviewerEvidence(actor: Actor, caseId: string, evidenceId: string) {
  assertRole(actor, ...STAFF);
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
  assertRole(actor, ...STAFF);
  return db
    .select({ id: cases.id, title: cases.title, status: cases.status, side: caseEvidence.side })
    .from(caseEvidence)
    .innerJoin(cases, eq(cases.id, caseEvidence.caseId))
    .where(and(eq(caseEvidence.evidenceId, evidenceId), inArray(cases.status, ["escalated", "under_review", "closed"])))
    .orderBy(desc(caseEvidence.createdAt));
}

/**
 * Evidence shared with this reviewer, each with the case (never a draft) it is
 * attached to, if any. The newest share comes first.
 */
export async function listSharedForReview(actor: Actor) {
  assertRole(actor, ...STAFF);
  const rows = await db
    .select({
      id: evidence.id,
      label: evidence.label,
      kind: evidence.kind,
      capturedAt: evidence.capturedAt,
      ownerName: user.name,
      ownerEmail: user.email,
      via: evidenceShares.via,
      sharedAt: evidenceShares.createdAt,
    })
    .from(evidenceShares)
    .innerJoin(evidence, eq(evidence.id, evidenceShares.evidenceId))
    .innerJoin(user, eq(user.id, evidence.ownerId))
    .where(and(eq(evidenceShares.userId, actor.id), ne(evidence.ownerId, actor.id)))
    .orderBy(desc(evidenceShares.createdAt));
  if (rows.length === 0) return [];
  const attached = await db
    .select({ evidenceId: caseEvidence.evidenceId, caseId: cases.id, title: cases.title, status: cases.status })
    .from(caseEvidence)
    .innerJoin(cases, eq(cases.id, caseEvidence.caseId))
    .where(
      and(
        inArray(
          caseEvidence.evidenceId,
          rows.map((r) => r.id),
        ),
        inArray(cases.status, ["escalated", "under_review", "closed"]),
      ),
    )
    .orderBy(desc(caseEvidence.createdAt));
  return rows.map((r) => ({
    ...r,
    cases: attached.filter((a) => a.evidenceId === r.id).map(({ caseId, title, status }) => ({ id: caseId, title, status })),
  }));
}

export type ArchiveQuery = {
  q?: string;
  /** Only cases this reviewer closed. */
  mine?: boolean;
  /** Only cases a reviewer attached evidence to. */
  rev?: boolean;
  /** Closed within this many days. */
  days?: number;
};

/** Closed cases, newest first. The search covers the title, reporter, description and closing note. */
export async function listArchives(actor: Actor, query: ArchiveQuery = {}) {
  assertRole(actor, ...STAFF);
  const term = query.q?.trim();
  const like = term ? likeTerm(term) : null;
  const rows = await db
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
          ? or(
              ilike(cases.title, like),
              ilike(cases.description, like),
              ilike(cases.closingNote, like),
              ilike(user.name, like),
            )
          : undefined,
        query.mine
          ? sql`exists (select 1 from ${caseEvents} where ${caseEvents.caseId} = ${cases.id} and ${caseEvents.type} = 'closed' and ${caseEvents.actorId} = ${actor.id})`
          : undefined,
        query.rev
          ? sql`exists (select 1 from ${caseEvidence} where ${caseEvidence.caseId} = ${cases.id} and ${caseEvidence.side} = 'reviewer')`
          : undefined,
        query.days ? gte(cases.closedAt, new Date(Date.now() - query.days * 24 * 60 * 60 * 1000)) : undefined,
      ),
    )
    .orderBy(desc(cases.closedAt))
    .limit(200);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [c, closers] = await Promise.all([
    counts(ids),
    db
      .select({ caseId: caseEvents.caseId, name: user.name })
      .from(caseEvents)
      .innerJoin(user, eq(user.id, caseEvents.actorId))
      .where(and(inArray(caseEvents.caseId, ids), eq(caseEvents.type, "closed"))),
  ]);
  const closedBy = new Map(closers.map((r) => [r.caseId, r.name]));
  return rows.map((r) => ({
    ...r,
    closedBy: closedBy.get(r.id) ?? null,
    evidenceCount: c.evidence.get(r.id) ?? 0,
  }));
}
