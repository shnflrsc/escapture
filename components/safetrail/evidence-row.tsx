import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { TamperBadge } from "@/components/ui/badge";
import { formatDateTime, kindLabel, shortHash } from "@/lib/format";

export type EvidenceSummary = {
  id: string;
  label: string;
  kind: "facebook_post" | "facebook_message";
  capturedAt: Date | string;
  sha256: string;
};

/** One evidence item as a row: label, kind, capture time, short hash, badge. */
export function EvidenceRow({
  item,
  note,
  reviewer = false,
  action,
}: {
  item: EvidenceSummary;
  note?: string;
  reviewer?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-4 border-b border-border px-[var(--card-pad)] py-4 last:border-b-0">
      <Link href={`/vault/${item.id}`} className="group flex min-w-0 flex-1 items-center gap-4 rounded-md">
        <div className="min-w-0 flex-1">
          <h4 className="truncate group-hover:underline">{item.label}</h4>
          <p className="text-sm leading-[22px] text-muted">
            {kindLabel(item.kind)} · Captured <span className="tnum">{formatDateTime(item.capturedAt)}</span>
            {note ? ` · ${note}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TamperBadge reviewer={reviewer} />
            <span className="mono rounded-md bg-subtle px-2 py-0.5 text-muted" title="SHA-256 of the saved file">
              {shortHash(item.sha256)}
            </span>
          </div>
        </div>
        {!action && <ChevronRight size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />}
      </Link>
      {action}
    </li>
  );
}

export function EvidenceList({ children }: { children: React.ReactNode }) {
  return <ul className="rounded-xl border border-border bg-card shadow-soft">{children}</ul>;
}
