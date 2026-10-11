import { Columns3 } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { age, formatDateTime } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listBoard } from "@/server/services/review";

type Item = Awaited<ReturnType<typeof listBoard>>[number];

function Column({ title, hint, items, now }: { title: string; hint: string; items: Item[]; now: Date }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl bg-subtle p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[20px] leading-7">{title}</h2>
        <span className="tnum text-sm text-muted">
          {items.length} {items.length === 1 ? "case" : "cases"}
        </span>
      </div>
      {items.length === 0 && <p className="text-sm leading-[22px] text-muted">{hint}</p>}
      {items.map((c) => (
        <Link
          key={c.id}
          href={`/review/${c.id}`}
          className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-soft hover:bg-brand-50"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 text-[17px] leading-6 break-words group-hover:underline">{c.title}</h3>
            <StatusBadge status={c.status} />
          </div>
          <p className="text-sm leading-[22px] text-muted">
            Reported by {c.reporterName} · <span className="tnum">{c.evidenceCount}</span> evidence{" "}
            {c.evidenceCount === 1 ? "item" : "items"} · <span className="tnum">{c.collaboratorCount}</span>{" "}
            {c.collaboratorCount === 1 ? "collaborator" : "collaborators"}
          </p>
          {c.escalatedAt && (
            <p className="tnum text-[13px] leading-[18px] text-muted">
              Escalated {age(c.escalatedAt, now)} ago · {formatDateTime(c.escalatedAt)}
            </p>
          )}
        </Link>
      ))}
    </section>
  );
}

export default async function ReviewBoardPage() {
  const user = await pageUser(["reviewer"]);
  const items = await listBoard(user);
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Review Board"
        description="Cases that students have escalated. Drafts never appear here."
      />
      {items.length === 0 ? (
        <EmptyState icon={<Columns3 size={24} strokeWidth={1.75} />} title="No open cases">
          When a student escalates a case it will appear here. Closed cases are in the Case Archives.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 items-start gap-6">
          <Column
            title="Escalated"
            hint="Nothing is waiting to be picked up."
            items={items.filter((c) => c.status === "escalated")}
            now={now}
          />
          <Column
            title="Under review"
            hint="No cases are under review."
            items={items.filter((c) => c.status === "under_review")}
            now={now}
          />
        </div>
      )}
    </>
  );
}
