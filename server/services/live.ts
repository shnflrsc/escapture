import { and, eq, gt, ne, sql } from "drizzle-orm";
import { mergeText } from "@/lib/merge";
import type { Actor } from "../auth";
import { canEditCase, canViewCase, enforce } from "../authz";
import { db } from "../db";
import { casePresence, cases, user } from "../db/schema";
import { loadCase } from "./cases";

/** A page that hasn't checked in for this long has been closed. */
export const PRESENCE_TTL_MS = 8000;

export type LiveField = "title" | "description";
const LIMITS: Record<LiveField, number> = { title: 160, description: 10000 };

export type LiveInput = {
  /** For each field the person changed: the saved text they started from, and their text now. */
  edits?: Partial<Record<LiveField, { base: string; text: string }>>;
  /** Where their caret is, or null when no field has focus. */
  focus?: { field: LiveField; start: number; end: number } | null;
  /** They are closing the page. */
  leave?: boolean;
};

/**
 * One check-in from an open case page, a couple of times a second. It saves the
 * person's edits, merged with everyone else's (the newest edit wins only where
 * two edits touch the same characters), records where their caret is, and
 * answers with the saved text and who else has the case open.
 */
export async function liveCase(actor: Actor, caseId: string, input: LiveInput) {
  return db.transaction(async (tx) => {
    const { c, facts } = await loadCase(tx, caseId, { lock: true });
    enforce(canViewCase(actor, facts));

    const saved: Record<LiveField, string> = { title: c.title, description: c.description };
    // Edits are only taken while the case is a draft. After escalation they are ignored and the
    // page learns the new status from the answer.
    if (input.edits && canEditCase(actor, facts) === "ok") {
      let changed = false;
      for (const field of ["title", "description"] as const) {
        const edit = input.edits[field];
        if (!edit) continue;
        const merged = mergeText(edit.base, saved[field], edit.text).slice(0, LIMITS[field]);
        // A case always keeps a title: an emptied title is not saved until something is typed.
        if (merged === saved[field] || (field === "title" && !merged.trim())) continue;
        saved[field] = merged;
        changed = true;
      }
      if (changed) {
        await tx
          .update(cases)
          .set({ title: saved.title, description: saved.description, updatedAt: new Date() })
          .where(eq(cases.id, caseId));
      }
    }

    if (input.leave) {
      await tx.delete(casePresence).where(and(eq(casePresence.caseId, caseId), eq(casePresence.userId, actor.id)));
    } else {
      const focus = input.focus ?? null;
      const row = {
        field: focus?.field ?? null,
        selectionStart: focus ? Math.max(0, Math.min(focus.start, saved[focus.field].length)) : null,
        selectionEnd: focus ? Math.max(0, Math.min(focus.end, saved[focus.field].length)) : null,
        seenAt: new Date(),
      };
      await tx
        .insert(casePresence)
        .values({ caseId, userId: actor.id, ...row })
        .onConflictDoUpdate({ target: [casePresence.caseId, casePresence.userId], set: row });
    }

    const since = new Date(Date.now() - PRESENCE_TTL_MS);
    const others = await tx
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        field: casePresence.field,
        start: casePresence.selectionStart,
        end: casePresence.selectionEnd,
      })
      .from(casePresence)
      .innerJoin(user, eq(user.id, casePresence.userId))
      .where(and(eq(casePresence.caseId, caseId), ne(casePresence.userId, actor.id), gt(casePresence.seenAt, since)))
      .orderBy(sql`lower(${user.name})`);

    return {
      status: c.status,
      editable: canEditCase(actor, facts) === "ok",
      title: saved.title,
      description: saved.description,
      others: others.map((o) => ({
        ...o,
        field: o.field === "title" || o.field === "description" ? (o.field as LiveField) : null,
      })),
    };
  });
}
