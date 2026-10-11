import { StatusBadge, type CaseStatus } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

type Event = {
  id: string;
  type: "created" | "escalated" | "status_changed" | "closed";
  toStatus: CaseStatus | null;
  note: string | null;
  createdAt: Date | string;
  actorName?: string;
};

const TEXT: Record<Event["type"], string> = {
  created: "Case started as a private draft",
  escalated: "Escalated to reviewers",
  status_changed: "Reviewers started looking at this case",
  closed: "Reviewers closed this case",
};

/** Simple vertical timeline, ending with the closing note. */
export function Timeline({ events }: { events: Event[] }) {
  return (
    <ol className="flex flex-col">
      {events.map((e, i) => (
        <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < events.length - 1 && <span className="absolute top-4 left-[7px] h-full w-px bg-border" aria-hidden />}
          <span className="relative mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-brand-500 bg-card" aria-hidden />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {TEXT[e.type]}
              {e.toStatus && e.toStatus !== "draft" && <StatusBadge status={e.toStatus} />}
            </p>
            <p className="tnum text-sm leading-[22px] text-muted">
              {formatDateTime(e.createdAt)}
              {e.actorName ? ` · ${e.actorName}` : ""}
            </p>
            {e.note && (
              <div className="mt-2 rounded-md bg-subtle p-4">
                <p className="text-sm font-semibold">Closing note</p>
                <p className="max-w-prose whitespace-pre-wrap">{e.note}</p>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
