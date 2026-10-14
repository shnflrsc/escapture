import { count, eq, inArray, or } from "drizzle-orm";
import type { Actor } from "../auth";
import { db } from "../db";
import { caseCollaborators, cases } from "../db/schema";
import { countEvidence } from "./evidence";
import { boardSummary } from "./review";

/**
 * The small counts beside the sidebar's links, keyed by the link's address:
 * how much is in each of the person's own lists.
 */
export async function navCounts(actor: Actor): Promise<Record<string, number>> {
  if (actor.role === "student") {
    const mine = db.select({ id: caseCollaborators.caseId }).from(caseCollaborators).where(eq(caseCollaborators.userId, actor.id));
    const [evidence, [caseCount]] = await Promise.all([
      countEvidence(actor),
      db
        .select({ n: count() })
        .from(cases)
        .where(or(eq(cases.ownerId, actor.id), inArray(cases.id, mine))),
    ]);
    return { "/vault": evidence.mine, "/cases": caseCount?.n ?? 0 };
  }
  const s = await boardSummary(actor);
  return { "/review/board": s.escalated + s.underReview, "/review/shared": s.sharedUnattached };
}
