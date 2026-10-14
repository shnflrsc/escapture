import diff from "fast-diff";

/** One change to a base text: replace base[start, end) with `text`. Pure insertions have start === end. */
type Edit = { start: number; end: number; text: string };

/** The changes that turn `base` into `next`, in base positions, left to right. */
function editsBetween(base: string, next: string): Edit[] {
  const edits: Edit[] = [];
  let at = 0;
  let open: Edit | null = null;
  for (const [op, chunk] of diff(base, next)) {
    if (op === diff.EQUAL) {
      if (open) edits.push(open);
      open = null;
      at += chunk.length;
    } else if (op === diff.DELETE) {
      open = open ?? { start: at, end: at, text: "" };
      open.end += chunk.length;
      at += chunk.length;
    } else {
      open = open ?? { start: at, end: at, text: "" };
      open.text += chunk;
    }
  }
  if (open) edits.push(open);
  return edits;
}

const overlaps = (a: Edit, b: Edit) => a.start < b.end && b.start < a.end;
const inside = (point: number, e: Edit) => e.start < point && point < e.end;
// Two changes collide when they touch the same characters, or one inserts inside text the other removes.
const collide = (a: Edit, b: Edit) =>
  overlaps(a, b) || (a.start === a.end && inside(a.start, b)) || (b.start === b.end && inside(b.start, a));

/**
 * Merges two people's edits to the same text. `base` is what both started from,
 * `theirs` is what is already saved, `mine` is the newer edit being saved now.
 *
 * Every change is kept. Where two changes touch the same characters, the newer
 * one (`mine`) wins and the older overlapping change is dropped. Two insertions
 * at the same spot are both kept, the earlier one first. Nobody is asked to choose.
 */
export function mergeText(base: string, theirs: string, mine: string): string {
  if (theirs === base) return mine;
  if (mine === base || mine === theirs) return theirs;
  const kept = editsBetween(base, mine);
  const older = editsBetween(base, theirs).filter((t) => !kept.some((m) => collide(t, m)));
  // Apply every surviving edit to the base, left to right. At the same position, the older insertion goes first.
  const all = [...older.map((e) => ({ e, order: 0 })), ...kept.map((e) => ({ e, order: 1 }))].sort(
    (a, b) => a.e.start - b.e.start || a.order - b.order,
  );
  let out = "";
  let at = 0;
  for (const { e } of all) {
    out += base.slice(at, e.start) + e.text;
    at = Math.max(at, e.end);
  }
  return out + base.slice(at);
}

/**
 * Where position `index` in `before` ends up in `after`, so a caret or a
 * selection stays on the same character when someone else's edit arrives.
 */
export function mapIndex(before: string, after: string, index: number): number {
  if (before === after) return index;
  let oldAt = 0;
  let newAt = 0;
  for (const [op, chunk] of diff(before, after)) {
    if (op === diff.EQUAL) {
      if (index <= oldAt + chunk.length) return newAt + (index - oldAt);
      oldAt += chunk.length;
      newAt += chunk.length;
    } else if (op === diff.DELETE) {
      // A caret inside removed text moves to where the removal happened.
      if (index <= oldAt + chunk.length) return newAt;
      oldAt += chunk.length;
    } else {
      newAt += chunk.length;
    }
  }
  return Math.min(newAt + (index - oldAt), after.length);
}
