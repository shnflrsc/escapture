import { and, eq, isNull, sql } from "drizzle-orm";
import { randomToken, scryptHash, scryptVerify, sha256Hex } from "@/lib/hash";
import type { Actor } from "../auth";
import { canAddCollaborator, enforce } from "../authz";
import { db } from "../db";
import { caseCollaborators, cases, evidence, evidenceShares, shareLinks } from "../db/schema";
import { AppError, conflict, forbidden, notFound } from "../errors";
import { rateLimit } from "../rate-limit";
import { loadCase } from "./cases";
import { loadManageable } from "./evidence";
import { notify } from "./notifications";

export const MAX_LINK_ATTEMPTS = 10;

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const locked = () =>
  new AppError(
    "link_locked",
    429,
    "This link is locked after too many wrong passwords. Ask the person who shared it for a new link.",
  );

async function insertLink(
  actor: Actor,
  target: { resourceType: "evidence"; evidenceId: string } | { resourceType: "case"; caseId: string },
  password: string,
) {
  // The token is shown once, here. Only its hash is stored.
  const token = randomToken();
  await db.insert(shareLinks).values({
    ...target,
    tokenHash: sha256Hex(token),
    passwordHash: await scryptHash(password),
    createdBy: actor.id,
    acknowledgedAt: new Date(),
  });
  return { url: `${appUrl()}/s/${token}` };
}

export async function createEvidenceLink(actor: Actor, evidenceId: string, password: string) {
  const row = await loadManageable(actor, evidenceId);
  return insertLink(actor, { resourceType: "evidence", evidenceId: row.id }, password);
}

export async function createCaseLink(actor: Actor, caseId: string, password: string) {
  const { facts } = await loadCase(db, caseId);
  enforce(canAddCollaborator(actor, facts), "This case is locked, so new people can't be added.");
  return insertLink(actor, { resourceType: "case", caseId }, password);
}

async function findLink(token: string) {
  const [link] = await db
    .select()
    .from(shareLinks)
    .where(and(eq(shareLinks.tokenHash, sha256Hex(token)), isNull(shareLinks.revokedAt)))
    .limit(1);
  return link ?? null;
}

/** Public: no titles or counts before the password. */
export async function linkMeta(token: string) {
  const link = await findLink(token);
  if (!link) return { valid: false as const };
  return { valid: true as const, resourceType: link.resourceType };
}

export async function redeemLink(actor: Actor, token: string, password: string) {
  rateLimit(`redeem:${actor.id}`, 30, 10 * 60 * 1000);
  const link = await findLink(token);
  if (!link) throw notFound("This link isn't valid.");
  if (link.failedAttempts >= MAX_LINK_ATTEMPTS) throw locked();

  // scryptVerify compares in constant time.
  if (!(await scryptVerify(password, link.passwordHash))) {
    const [updated] = await db
      .update(shareLinks)
      .set({ failedAttempts: sql`${shareLinks.failedAttempts} + 1` })
      .where(eq(shareLinks.id, link.id))
      .returning({ failedAttempts: shareLinks.failedAttempts });
    if ((updated?.failedAttempts ?? 0) >= MAX_LINK_ATTEMPTS) throw locked();
    throw new AppError("wrong_password", 403, "That password isn't right. Check it and try again.");
  }

  if (link.resourceType === "evidence" && link.evidenceId) {
    const [row] = await db.select().from(evidence).where(eq(evidence.id, link.evidenceId)).limit(1);
    if (!row) throw notFound("This link isn't valid.");
    if (row.ownerId !== actor.id) {
      await db
        .insert(evidenceShares)
        .values({
          evidenceId: row.id,
          userId: actor.id,
          sharedBy: link.createdBy,
          acknowledgedAt: link.acknowledgedAt,
          via: "link",
        })
        .onConflictDoNothing();
    }
    return { resourceType: "evidence" as const, id: row.id, path: `/vault/${row.id}` };
  }

  if (link.resourceType === "case" && link.caseId) {
    const caseId = link.caseId;
    if (actor.role !== "student") throw forbidden("Only student accounts can join a case.");
    await db.transaction(async (tx) => {
      const [c] = await tx.select().from(cases).where(eq(cases.id, caseId)).for("update").limit(1);
      if (!c) throw notFound("This link isn't valid.");
      if (c.ownerId === actor.id) return;
      const [existing] = await tx
        .select({ userId: caseCollaborators.userId })
        .from(caseCollaborators)
        .where(and(eq(caseCollaborators.caseId, caseId), eq(caseCollaborators.userId, actor.id)))
        .limit(1);
      if (existing) return;
      // After escalation the list of collaborators is frozen (I3, I4).
      if (c.status !== "draft") {
        throw conflict("This case has been escalated, so new people can't join it.", "locked");
      }
      await tx.insert(caseCollaborators).values({
        caseId,
        userId: actor.id,
        addedBy: link.createdBy,
        via: "link",
        acknowledgedAt: link.acknowledgedAt,
      });
      await tx.update(cases).set({ updatedAt: new Date() }).where(eq(cases.id, caseId));
      await notify(tx, [
        {
          userId: c.ownerId,
          type: "collaborator_joined",
          title: `${actor.name} joined your case`,
          body: c.title,
          caseId,
        },
      ]);
    });
    return { resourceType: "case" as const, id: caseId, path: `/cases/${caseId}` };
  }

  throw notFound("This link isn't valid.");
}
