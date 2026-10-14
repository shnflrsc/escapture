// Finding the word bank's words in a case's title and description.
//
// Matching ignores case and accents, needs whole words (so "kill" never flags
// "skill"), lets a phrase's words be separated by any spacing, and accepts the
// common English endings on a single word ("kill", "kills", "killed",
// "killing"). Anything else, such as Filipino affixes ("pinatay"), is added to
// the bank as its own entry.

/** Lowercase, without accents, with runs of whitespace as one space. */
export function normalizeWord(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ENDINGS = "(?:s|es|ed|d|ing)?";

function pattern(word: string): RegExp {
  const parts = normalizeWord(word).split(" ").map(escape);
  const body = parts.join("[\\s\\p{P}]+") + (parts.length === 1 ? ENDINGS : "");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "u");
}

/** The bank's words that appear in `text`, in the bank's order. */
export function findFlaggedWords(text: string, words: string[]): string[] {
  const hay = normalizeWord(text);
  if (!hay) return [];
  return words.filter((w) => normalizeWord(w) && pattern(w).test(hay));
}
