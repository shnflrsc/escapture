import { TamperBadge } from "@/components/ui/badge";

/** What the label does and does not mean, in the words used wherever it is explained. */
export const TAMPER_CHECK_MEANING =
  "The capture passed our checks and the saved file hasn't changed since. It doesn't prove the capture is complete.";

/** The tamper-check label with, optionally, the capture time beside it. */
export function TamperCheck({ reviewer = false, time }: { reviewer?: boolean; time?: string }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1" title={TAMPER_CHECK_MEANING}>
      <TamperBadge reviewer={reviewer} />
      {time && <span className="mono tnum text-muted">{time}</span>}
    </span>
  );
}
