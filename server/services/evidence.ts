import { and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { formatDateTime, kindLabel } from "@/lib/format";
import { safeEqual, sha256Hex } from "@/lib/hash";
import { MAX_EVIDENCE_BYTES } from "@/lib/validators";
import type { Actor } from "../auth";
import {
  canCaptureEvidence,
  canDeleteEvidence,
  canManageEvidence,
  canRenameEvidence,
  canViewEvidence,
  enforce,
  type EvidenceFacts,
} from "../authz";
import { db, type Db, type Tx } from "../db";
import {
  caseCollaborators,
  caseEvidence,
  cases,
  evidence,
  evidenceShares,
  shareLinks,
  user,
  type TamperReport,
} from "../db/schema";
import { AppError, badRequest, notFound } from "../errors";
import { getObject, putObject, removeObject } from "../storage";

type Row = typeof evidence.$inferSelect;

const LOCKED = "This evidence is part of an escalated case, so it can't be changed or deleted.";

function toDto(row: Row, actor: Actor, facts: EvidenceFacts) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    kind: row.kind,
    label: row.label,
    sourceUrl: row.sourceUrl,
    sha256: row.sha256,
    byteSize: row.byteSize,
    capturedAt: row.capturedAt,
    clientCapturedAt: row.clientCapturedAt,
    tamperReport: row.tamperReport,
    isOwner: row.ownerId === actor.id,
    /** Shared directly with the viewer, by email or a redeemed link. */
    sharedWithMe: facts.sharedWithUser,
    locked: facts.attachedToNonDraftCase,
  };
}
export type EvidenceDto = ReturnType<typeof toDto>;

/** Loads the facts authz needs. `lock` takes FOR UPDATE on the related case rows. */
export async function evidenceFacts(
  dbx: Db | Tx,
  actor: Actor,
  row: Row,
  opts: { lock?: boolean } = {},
): Promise<EvidenceFacts> {
  const attachmentsQuery = dbx
    .select({
      side: caseEvidence.side,
      status: cases.status,
      caseOwnerId: cases.ownerId,
      caseId: cases.id,
    })
    .from(caseEvidence)
    .innerJoin(cases, eq(cases.id, caseEvidence.caseId))
    .where(eq(caseEvidence.evidenceId, row.id));
  const attachments = await (opts.lock ? attachmentsQuery.for("update", { of: cases }) : attachmentsQuery);

  const [share] = await dbx
    .select({ userId: evidenceShares.userId })
    .from(evidenceShares)
    .where(and(eq(evidenceShares.evidenceId, row.id), eq(evidenceShares.userId, actor.id)))
    .limit(1);

  const myCollabs = await dbx
    .select({ caseId: caseCollaborators.caseId })
    .from(caseCollaborators)
    .where(eq(caseCollaborators.userId, actor.id));
  const collabIds = new Set(myCollabs.map((c) => c.caseId));

  return {
    ownerId: row.ownerId,
    sharedWithUser: Boolean(share),
    inOwnCaseReporterSide: attachments.some(
      (a) => a.side === "reporter" && (a.caseOwnerId === actor.id || collabIds.has(a.caseId)),
    ),
    attachedToNonDraftCase: attachments.some((a) => a.status !== "draft"),
  };
}

async function loadViewable(actor: Actor, id: string) {
  const [row] = await db.select().from(evidence).where(eq(evidence.id, id)).limit(1);
  if (!row) throw notFound();
  const facts = await evidenceFacts(db, actor, row);
  enforce(canViewEvidence(actor, facts));
  return { row, facts };
}

/** For owner-only actions in other services (shares, links). */
export async function loadManageable(actor: Actor, id: string) {
  const [row] = await db.select().from(evidence).where(eq(evidence.id, id)).limit(1);
  if (!row) throw notFound();
  const facts = await evidenceFacts(db, actor, row);
  const decision = canManageEvidence(actor, facts);
  if (decision === "forbidden") {
    throw new AppError("forbidden", 403, "Only the person who captured this evidence can share it.");
  }
  enforce(decision);
  return row;
}

export async function createEvidence(
  actor: Actor,
  input: {
    bytes: Uint8Array;
    sha256: string;
    kind: Row["kind"];
    sourceUrl: string;
    clientCapturedAt?: string;
    tamperReport: TamperReport;
    extensionVersion?: string;
  },
): Promise<EvidenceDto> {
  enforce(canCaptureEvidence(actor));
  if (input.bytes.byteLength === 0) throw badRequest("The capture file is empty.");
  if (input.bytes.byteLength > MAX_EVIDENCE_BYTES) {
    throw new AppError("too_large", 413, "This capture is too large. Select a smaller area.");
  }
  // I7: hash the exact bytes we are about to store.
  const recomputed = sha256Hex(input.bytes);
  if (!safeEqual(recomputed, input.sha256)) {
    throw new AppError(
      "hash_mismatch",
      422,
      "The file we received doesn't match its hash. Please capture it again.",
    );
  }
  if (!input.tamperReport.allPassed || input.tamperReport.checks.some((c) => !c.passed)) {
    throw badRequest("This capture didn't pass its tamper checks, so it wasn't saved.");
  }

  const id = randomUUID();
  // Built from server ids only; never from a client-provided filename.
  const storagePath = `${actor.id}/${id}.html`;
  await putObject(storagePath, input.bytes);
  try {
    const now = new Date();
    const [row] = await db
      .insert(evidence)
      .values({
        id,
        ownerId: actor.id,
        kind: input.kind,
        label: `${kindLabel(input.kind)}, ${formatDateTime(now)}`,
        sourceUrl: input.sourceUrl,
        storagePath,
        sha256: recomputed,
        byteSize: input.bytes.byteLength,
        clientCapturedAt: input.clientCapturedAt ? new Date(input.clientCapturedAt) : null,
        tamperReport: {
          ...input.tamperReport,
          extensionVersion: input.extensionVersion ?? input.tamperReport.extensionVersion,
        },
        // captured_at comes from the database default: server time.
      })
      .returning();
    return toDto(row, actor, {
      ownerId: actor.id,
      sharedWithUser: false,
      inOwnCaseReporterSide: false,
      attachedToNonDraftCase: false,
    });
  } catch (err) {
    await removeObject(storagePath).catch(() => {});
    throw err;
  }
}

const listColumns = {
  id: evidence.id,
  ownerId: evidence.ownerId,
  kind: evidence.kind,
  label: evidence.label,
  sha256: evidence.sha256,
  capturedAt: evidence.capturedAt,
  ownerName: user.name,
  ownerEmail: user.email,
};

export type EvidenceListFilters = {
  /** Matches the name; in the shared list, also the name of the person who shared it. */
  q?: string;
  kind?: Row["kind"];
  /** Left out: newest capture first for "mine", most recently shared first for "shared". */
  sort?: "newest" | "oldest" | "name";
};

/** LIKE treats %, _ and \ specially; a search for "50%" should mean those characters. */
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

const sortOrder = (sort: NonNullable<EvidenceListFilters["sort"]>) =>
  sort === "name"
    ? [asc(sql`lower(${evidence.label})`), desc(evidence.capturedAt)]
    : [sort === "oldest" ? asc(evidence.capturedAt) : desc(evidence.capturedAt)];

export async function listEvidence(actor: Actor, scope: "mine" | "shared", filters: EvidenceListFilters = {}) {
  const q = filters.q?.trim();
  const kind = filters.kind ? eq(evidence.kind, filters.kind) : undefined;
  if (scope === "mine") {
    return db
      .select({
        ...listColumns,
        // Only the owner's own list says anything about cases. Attachments made by
        // reviewers are not counted: reporters never see those.
        caseCount: sql<number>`(select count(*)::int from ${caseEvidence} where ${caseEvidence.evidenceId} = ${evidence.id} and ${caseEvidence.side} = 'reporter')`,
        // The first case it went into, by name, for the list's "In cases" column.
        caseTitle: sql<string | null>`(select ${cases.title} from ${caseEvidence} inner join ${cases} on ${cases.id} = ${caseEvidence.caseId} where ${caseEvidence.evidenceId} = ${evidence.id} and ${caseEvidence.side} = 'reporter' order by ${caseEvidence.createdAt} limit 1)`,
        // How many people it is shared with, and how many password links point at it.
        shareCount: sql<number>`(select count(*)::int from ${evidenceShares} where ${evidenceShares.evidenceId} = ${evidence.id})`,
        linkCount: sql<number>`(select count(*)::int from ${shareLinks} where ${shareLinks.evidenceId} = ${evidence.id})`,
        // Same rule as the lock on rename and delete: attached to any case that is no longer a draft.
        locked: sql<boolean>`exists (select 1 from ${caseEvidence} inner join ${cases} on ${cases.id} = ${caseEvidence.caseId} where ${caseEvidence.evidenceId} = ${evidence.id} and ${cases.status} <> 'draft')`,
      })
      .from(evidence)
      .innerJoin(user, eq(user.id, evidence.ownerId))
      .where(and(eq(evidence.ownerId, actor.id), kind, q ? ilike(evidence.label, likePattern(q)) : undefined))
      .orderBy(...sortOrder(filters.sort ?? "newest"));
  }
  return db
    .select(listColumns)
    .from(evidenceShares)
    .innerJoin(evidence, eq(evidence.id, evidenceShares.evidenceId))
    .innerJoin(user, eq(user.id, evidence.ownerId))
    .where(
      and(
        eq(evidenceShares.userId, actor.id),
        ne(evidence.ownerId, actor.id),
        kind,
        q ? or(ilike(evidence.label, likePattern(q)), ilike(user.name, likePattern(q))) : undefined,
      ),
    )
    .orderBy(...(filters.sort ? sortOrder(filters.sort) : [desc(evidenceShares.createdAt)]));
}

/** How many items each vault tab holds, before any search or filter. */
export async function countEvidence(actor: Actor) {
  const [[mine], [shared]] = await Promise.all([
    db.select({ n: count() }).from(evidence).where(eq(evidence.ownerId, actor.id)),
    db
      .select({ n: count() })
      .from(evidenceShares)
      .innerJoin(evidence, eq(evidence.id, evidenceShares.evidenceId))
      .where(and(eq(evidenceShares.userId, actor.id), ne(evidence.ownerId, actor.id))),
  ]);
  return { mine: mine.n, shared: shared.n };
}

export async function getEvidence(actor: Actor, id: string) {
  const { row, facts } = await loadViewable(actor, id);
  const [owner] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, row.ownerId))
    .limit(1);
  return { ...toDto(row, actor, facts), owner };
}

export async function getEvidenceFile(actor: Actor, id: string): Promise<Uint8Array> {
  const { row } = await loadViewable(actor, id);
  return getObject(row.storagePath);
}

/** Re-reads the stored bytes and recomputes the hash (I7). */
export async function verifyEvidence(actor: Actor, id: string) {
  const { row } = await loadViewable(actor, id);
  const recomputed = sha256Hex(await getObject(row.storagePath));
  return {
    stored: row.sha256,
    recomputed,
    match: safeEqual(recomputed, row.sha256),
    checkedAt: new Date().toISOString(),
  };
}

export async function renameEvidence(actor: Actor, id: string, label: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(evidence).where(eq(evidence.id, id)).for("update").limit(1);
    if (!row) throw notFound();
    const facts = await evidenceFacts(tx, actor, row, { lock: true });
    enforce(canRenameEvidence(actor, facts), LOCKED);
    const [updated] = await tx.update(evidence).set({ label }).where(eq(evidence.id, id)).returning();
    return toDto(updated, actor, facts);
  });
}

export async function deleteEvidence(actor: Actor, id: string) {
  const storagePath = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(evidence).where(eq(evidence.id, id)).for("update").limit(1);
    if (!row) throw notFound();
    // Locks every case this evidence is attached to, so an escalation can't
    // complete while we are deleting (I3).
    const facts = await evidenceFacts(tx, actor, row, { lock: true });
    enforce(canDeleteEvidence(actor, facts), LOCKED);
    // Only draft cases reach this point: remove it from them first.
    await tx.delete(caseEvidence).where(eq(caseEvidence.evidenceId, id));
    await tx.delete(evidence).where(eq(evidence.id, id));
    return row.storagePath;
  });
  await removeObject(storagePath).catch(() => {});
}
