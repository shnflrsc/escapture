import { ArrowUpRight, CircleCheck, Eye, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/format";

// The Review Board's panels. Colours come from the chart tokens, never from the
// status badges, and never red. Every number in a chart is also there as text.

export function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-[var(--card-pad)] shadow-soft">
      <div>
        <h2 className="text-[17px] leading-6">{title}</h2>
        {note && <p className="text-[13px] leading-[18px] text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

const shortDay = (d: Date) => formatDate(d).replace(/ \d{4}$/, "");

/** One series of bars. Hover or focus a bar for its number; "View as table" gives them all. */
export function BarChart({ data, unit }: { data: { start: Date; count: number }[]; unit: [string, string] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 560;
  const H = 160;
  const slot = W / data.length;
  const bar = Math.min(48, slot * 0.6);
  const label = (d: { start: Date; count: number }) =>
    `Week of ${formatDate(d.start)}: ${d.count} ${d.count === 1 ? unit[0] : unit[1]}`;
  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${H + 28}`}
        role="img"
        aria-label={`Bar chart. ${data.map(label).join(". ")}.`}
        className="h-auto w-full"
      >
        {[0.5, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={H - H * f} y2={H - H * f} stroke="var(--chart-grid)" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const h = d.count === 0 ? 0 : Math.max(4, (d.count / max) * (H - 24));
          const x = i * slot + (slot - bar) / 2;
          return (
            <g key={d.start.toISOString()}>
              {/* The hover band behind the bar. */}
              <rect x={i * slot} y="0" width={slot} height={H} fill="var(--chart-fill)" className="opacity-0 hover:opacity-100" />
              <rect x={x} y={H - h} width={bar} height={h} rx="4" fill="var(--chart-primary)" className="pointer-events-none" />
              <text
                x={i * slot + slot / 2}
                y={H - h - 6}
                textAnchor="middle"
                className="pointer-events-none fill-[var(--ink)] text-[13px] font-semibold"
              >
                {d.count}
              </text>
              <text
                x={i * slot + slot / 2}
                y={H + 18}
                textAnchor="middle"
                className="pointer-events-none fill-[var(--muted)] text-[13px]"
              >
                {shortDay(d.start)}
              </text>
              <title>{label(d)}</title>
            </g>
          );
        })}
        <line x1="0" x2={W} y1={H} y2={H} stroke="var(--chart-axis)" strokeWidth="1" />
      </svg>
      <details className="text-sm leading-5">
        <summary className="link cursor-pointer rounded-sm">View as table</summary>
        <table className="mt-2 w-full max-w-sm border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-[13px] text-muted">
              <th scope="col" className="py-1 pr-4 font-semibold">
                Week of
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Cases escalated
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.start.toISOString()} className="border-b border-border last:border-b-0">
                <td className="tnum py-1 pr-4">{formatDate(d.start)}</td>
                <td className="tnum py-1 text-right">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

const SEGMENTS = [
  { key: "escalated", label: "Escalated", color: "var(--chart-escalated)" },
  { key: "under_review", label: "Under Review", color: "var(--chart-review)" },
  { key: "closed", label: "Closed", color: "var(--chart-closed)" },
] as const;

/** One stacked bar and a legend that states every count, so colour is never the only signal. */
export function StatusBreakdown({ counts }: { counts: { escalated: number; under_review: number; closed: number } }) {
  const total = counts.escalated + counts.under_review + counts.closed;
  return (
    <div className="flex flex-col gap-4">
      <div
        role="img"
        aria-label={`${total} ${total === 1 ? "case" : "cases"}: ${SEGMENTS.map((s) => `${counts[s.key]} ${s.label.toLowerCase()}`).join(", ")}.`}
        className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-subtle"
      >
        {total > 0 &&
          SEGMENTS.filter((s) => counts[s.key] > 0).map((s) => (
            <span key={s.key} style={{ width: `${(counts[s.key] / total) * 100}%`, background: s.color }} />
          ))}
      </div>
      <ul className="flex flex-col gap-2 text-sm leading-5">
        {SEGMENTS.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span aria-hidden className="size-3 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1">{s.label}</span>
            <span className="tnum font-semibold">{counts[s.key]}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 border-t border-border pt-2 text-muted">
          <span className="flex-1">All cases in this period</span>
          <span className="tnum font-semibold text-ink">{total}</span>
        </li>
      </ul>
    </div>
  );
}

type Activity = { id: string; type: string; createdAt: Date | string; caseId: string; caseTitle: string; actorName: string };

const EVENTS: Record<string, { Icon: LucideIcon; text: (who: string) => string }> = {
  escalated: { Icon: ArrowUpRight, text: (who) => `${who} escalated` },
  status_changed: { Icon: Eye, text: (who) => `${who} started reviewing` },
  closed: { Icon: CircleCheck, text: (who) => `${who} closed` },
};

/** The latest things that happened on open cases: one sentence and a time each. */
export function ActivityFeed({ items }: { items: Activity[] }) {
  if (items.length === 0) return <p className="text-sm leading-[22px] text-muted">Nothing has happened on an open case yet.</p>;
  return (
    <ul className="flex flex-col">
      {items.map((e) => {
        const { Icon, text } = EVENTS[e.type] ?? { Icon: Eye, text: (who: string) => `${who} updated` };
        return (
          <li key={e.id} className="flex items-start gap-3 border-b border-border py-2.5 last:border-b-0">
            <span aria-hidden className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-800">
              <Icon size={14} strokeWidth={1.75} />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-[22px]">
              {text(e.actorName)}{" "}
              <Link href={`/review/${e.caseId}`} className="link">
                {e.caseTitle}
              </Link>
            </p>
            <time dateTime={new Date(e.createdAt).toISOString()} className="mono tnum shrink-0 text-muted">
              {formatDateTime(e.createdAt)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}

/** How to say a case's latest event in the table's "Last update" column. */
export const lastUpdateText = (type: string | null | undefined) =>
  type === "closed" ? "Closed" : type === "status_changed" ? "Review started" : type === "escalated" ? "Escalated" : "";
