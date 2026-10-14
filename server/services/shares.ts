import { and, desc, eq } from "drizzle-orm";
import type { Actor } from "../auth";
import { db } from "../db";
import { evidenceShares, user } from "../db/schema";
import { AppError, badRequest, notFound } from "../errors";
import { loadManageable } from "./evidence";
import { notify } from "./notifications";

export const noAccount = () =>
  new AppError("recipient_not_found", 404, "There's no SafeTrail account with that email.");

/** Owner only, with the risk acknowledged (I10). Recipients cannot re-share. */
export async function shareEvidenceByEmail(actor: Actor, evidenceId: string, email: string) {
  const row = await loadManageable(actor, evidenceId);
  const [recipient] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (!recipient) throw noAccount();
  if (recipient.id === actor.id) throw badRequest("This evidence is already in your vault.");

  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(evidenceShares)
      .values({
        evidenceId: row.id,
        userId: recipient.id,
        sharedBy: actor.id,
        acknowledgedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ userId: evidenceShares.userId });
    if (inserted.length) {
      await notify(tx, [
        {
          userId: recipient.id,
          type: "evidence_shared",
          title: `${actor.name} shared evidence with you`,
          body: row.label,
          evidenceId: row.id,
        },
      ]);
    }
  });
  return { sharedWith: { name: recipient.name, email: recipient.email } };
}

export async function listEvidenceShares(actor: Actor, evidenceId: string) {
  await loadManageable(actor, evidenceId);
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      via: evidenceShares.via,
      sharedAt: evidenceShares.createdAt,
    })
    .from(evidenceShares)
    .innerJoin(user, eq(user.id, evidenceShares.userId))
    .where(eq(evidenceShares.evidenceId, evidenceId))
    .orderBy(desc(evidenceShares.createdAt));
}

/**
 * The owner stops sharing with one person. Their own access ends at once. If a
 * reviewer attached the item to a case that is still open, the review team keeps
 * seeing it there until that case closes.
 */
export async function revokeEvidenceShare(actor: Actor, evidenceId: string, userId: string) {
  await loadManageable(actor, evidenceId);
  const removed = await db
    .delete(evidenceShares)
    .where(and(eq(evidenceShares.evidenceId, evidenceId), eq(evidenceShares.userId, userId)))
    .returning({ userId: evidenceShares.userId });
  if (!removed.length) throw notFound("This evidence isn't shared with that person.");
  return { evidenceId, userId };
}
