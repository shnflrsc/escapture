import { desc, eq } from "drizzle-orm";
import type { Actor } from "../auth";
import { db } from "../db";
import { evidenceShares, user } from "../db/schema";
import { AppError, badRequest } from "../errors";
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
    .select({ name: user.name, email: user.email, role: user.role, sharedAt: evidenceShares.createdAt })
    .from(evidenceShares)
    .innerJoin(user, eq(user.id, evidenceShares.userId))
    .where(eq(evidenceShares.evidenceId, evidenceId))
    .orderBy(desc(evidenceShares.createdAt));
}
