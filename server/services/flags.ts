import { asc, eq, inArray, ne, sql } from "drizzle-orm";
import { findFlaggedWords, normalizeWord } from "@/lib/flags";
import type { Actor } from "../auth";
import { canManageWordBank, enforce } from "../authz";
import { db, type Db, type Tx } from "../db";
import { caseFlags, cases, flaggedWords, user } from "../db/schema";
import { badRequest, conflict, notFound } from "../errors";

async function bank(dbx: Db | Tx) {
  return (await dbx.select({ word: flaggedWords.word }).from(flaggedWords).orderBy(asc(flaggedWords.word))).map(
    (r) => r.word,
  );
}

/** Works out a case's flagged words and stores them, replacing any it had. */
export async function flagCase(dbx: Db | Tx, caseId: string, words?: string[]) {
  const [c] = await dbx.select({ title: cases.title, description: cases.description }).from(cases).where(eq(cases.id, caseId));
  if (!c) return [];
  const found = findFlaggedWords(`${c.title}\n${c.description}`, words ?? (await bank(dbx)));
  await dbx.delete(caseFlags).where(eq(caseFlags.caseId, caseId));
  if (found.length) await dbx.insert(caseFlags).values(found.map((word) => ({ caseId, word })));
  return found;
}

/** Checks every case that is no longer a draft against the current bank. Run whenever the bank changes. */
export async function recheckAllCases(dbx: Db | Tx) {
  const words = await bank(dbx);
  const rows = await dbx.select({ id: cases.id }).from(cases).where(ne(cases.status, "draft"));
  for (const r of rows) await flagCase(dbx, r.id, words);
  return rows.length;
}

/** The flagged words of each of these cases, for the review side only. */
export async function flagsFor(caseIds: string[]) {
  const byCase = new Map<string, string[]>();
  if (!caseIds.length) return byCase;
  const rows = await db
    .select({ caseId: caseFlags.caseId, word: caseFlags.word })
    .from(caseFlags)
    .where(inArray(caseFlags.caseId, caseIds))
    .orderBy(asc(caseFlags.word));
  for (const r of rows) byCase.set(r.caseId, [...(byCase.get(r.caseId) ?? []), r.word]);
  return byCase;
}

// ---- the bank, for administrators ----

export async function listWords(actor: Actor) {
  enforce(canManageWordBank(actor));
  const [rows, counts] = await Promise.all([
    db
      .select({ id: flaggedWords.id, word: flaggedWords.word, createdAt: flaggedWords.createdAt, addedBy: user.name })
      .from(flaggedWords)
      .leftJoin(user, eq(user.id, flaggedWords.createdBy))
      .orderBy(asc(flaggedWords.word)),
    db
      .select({ word: caseFlags.word, n: sql<number>`count(*)::int` })
      .from(caseFlags)
      .groupBy(caseFlags.word),
  ]);
  const n = new Map(counts.map((c) => [c.word, c.n]));
  return rows.map((r) => ({ ...r, cases: n.get(r.word) ?? 0 }));
}

export async function addWord(actor: Actor, raw: string) {
  enforce(canManageWordBank(actor));
  const word = normalizeWord(raw);
  if (word.length < 2) throw badRequest("Enter a word or phrase of at least 2 characters.");
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(flaggedWords)
      .values({ word, createdBy: actor.id })
      .onConflictDoNothing()
      .returning({ id: flaggedWords.id, word: flaggedWords.word });
    if (!inserted.length) throw conflict(`"${word}" is already in the word bank.`, "duplicate_word");
    await recheckAllCases(tx);
    return inserted[0];
  });
}

export async function removeWord(actor: Actor, id: string) {
  enforce(canManageWordBank(actor));
  return db.transaction(async (tx) => {
    const removed = await tx.delete(flaggedWords).where(eq(flaggedWords.id, id)).returning({ word: flaggedWords.word });
    if (!removed.length) throw notFound("That word isn't in the word bank.");
    await tx.delete(caseFlags).where(eq(caseFlags.word, removed[0].word));
    return { id, word: removed[0].word };
  });
}
