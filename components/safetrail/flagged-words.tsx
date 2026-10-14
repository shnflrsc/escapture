import { Badge } from "@/components/ui/badge";

/**
 * A case's flagged words as plain grey chips. Neutral on purpose: a flag says
 * the text contains a listed word, not that the case is urgent or more serious.
 */
export function FlaggedWords({ words, max = 3 }: { words: string[]; max?: number }) {
  if (words.length === 0) return <span className="text-muted">None</span>;
  const shown = words.slice(0, max);
  const more = words.length - shown.length;
  return (
    <span className="flex flex-wrap items-center gap-1" title={words.join(", ")}>
      {shown.map((w) => (
        <Badge key={w} tone="closed" className="font-normal">
          {w}
        </Badge>
      ))}
      {more > 0 && <span className="text-[13px] leading-5 text-muted">+{more}</span>}
    </span>
  );
}
