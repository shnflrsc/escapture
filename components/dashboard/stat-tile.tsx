import type { LucideIcon } from "lucide-react";

/**
 * One summary number for a reviewer's dashboard: a label, the count, and one
 * plain line of context. No arrows, percentages or sparklines.
 */
export function StatTile({ label, Icon, value, note }: { label: string; Icon: LucideIcon; value: number; note: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-[var(--card-pad)] shadow-soft">
      <dt className="flex items-center gap-2 text-sm leading-5 font-semibold text-muted">
        <Icon size={16} strokeWidth={1.75} aria-hidden />
        {label}
      </dt>
      <dd className="flex flex-col gap-1">
        <span className="tnum font-heading text-[32px] leading-10 font-semibold text-ink">{value}</span>
        <span className="text-[13px] leading-[18px] text-muted">{note}</span>
      </dd>
    </div>
  );
}
