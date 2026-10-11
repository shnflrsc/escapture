import { ChevronRight, FolderOpen } from "lucide-react";
import Link from "next/link";
import { NewCaseButton } from "@/components/safetrail/case-actions";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { formatDate } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listCases } from "@/server/services/cases";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function CasesPage() {
  const user = await pageUser(["student"]);
  const items = await listCases(user);

  return (
    <>
      <PageHeader
        title="Cases"
        description="A case gathers your evidence in one place. Nothing reaches reviewers until you escalate."
        action={<NewCaseButton />}
      />
      {items.length === 0 ? (
        <EmptyState icon={<FolderOpen size={24} strokeWidth={1.75} />} title="You have no cases yet">
          Start a case when you are ready. It stays a private draft, and you can add evidence and people you trust
          at your own pace.
        </EmptyState>
      ) : (
        <ul className="rounded-xl border border-border bg-card shadow-soft">
          {items.map((c) => (
            <li key={c.id} className="border-b border-border last:border-b-0">
              <Link href={`/cases/${c.id}`} className="group flex items-center gap-4 rounded-xl px-6 py-4">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate group-hover:underline">{c.title}</h4>
                  <p className="text-sm leading-[22px] text-muted">
                    {c.role === "owner" ? "Your case" : "You were added to this case"} ·{" "}
                    <span className="tnum">{c.evidenceCount}</span> evidence{" "}
                    {c.evidenceCount === 1 ? "item" : "items"} · Updated{" "}
                    <span className="tnum">{formatDate(c.updatedAt)}</span>
                  </p>
                </div>
                <StatusBadge status={c.status} />
                <ChevronRight size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
