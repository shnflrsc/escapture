import { ChevronRight, FolderOpen, Lock } from "lucide-react";
import Link from "next/link";
import { NewCaseButton } from "@/components/safetrail/case-actions";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { LinkTabs } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listCases } from "@/server/services/cases";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

const TABS = [
  { key: "all", label: "All", match: () => true },
  { key: "drafts", label: "Drafts", match: (s: string) => s === "draft" },
  { key: "reviewers", label: "With reviewers", match: (s: string) => s === "escalated" || s === "under_review" },
  { key: "closed", label: "Closed", match: (s: string) => s === "closed" },
] as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async function CasesPage({ searchParams }: PageProps<"/cases">) {
  const user = await pageUser(["student"]);
  const all = await listCases(user);
  const key = (await searchParams).tab;
  const tab = TABS.find((t) => t.key === key) ?? TABS[0];
  const items = all.filter((c) => tab.match(c.status));

  return (
    <>
      <PageHeader
        title="Cases"
        action={<NewCaseButton />}
      />
      {all.length === 0 ? (
        <EmptyState icon={<FolderOpen size={24} strokeWidth={1.75} />} title="You have no cases yet">
          Start a case when you are ready. It stays a private draft, and you can add evidence and people you trust
          at your own pace.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <LinkTabs
            label="Show"
            unit="cases"
            tabs={TABS.map((t) => ({
              label: t.label,
              href: t.key === "all" ? "/cases" : `/cases?tab=${t.key}`,
              count: all.filter((c) => t.match(c.status)).length,
              active: t.key === tab.key,
            }))}
          />
          {items.length === 0 ? (
            <EmptyState icon={<FolderOpen size={24} strokeWidth={1.75} />} title="No cases here">
              None of your cases are under “{tab.label}” right now.
            </EmptyState>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              {items.map((c) => {
                const locked = c.status !== "draft";
                return (
                  <li key={c.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/cases/${c.id}`}
                      className="group flex items-center gap-4 px-[var(--card-pad)] py-4 hover:bg-brand-50"
                    >
                      <span
                        aria-hidden
                        className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-100 text-brand-800"
                      >
                        <FolderOpen size={20} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[17px] leading-6 group-hover:underline">{c.title}</h2>
                        <p className="text-sm leading-[22px] text-muted">
                          {c.role === "owner" ? "Your case" : `${c.ownerName} added you`} ·{" "}
                          <span className="tnum">{plural(c.evidenceCount, "evidence item", "evidence items")}</span> ·{" "}
                          <span className="tnum">{plural(c.collaboratorCount, "collaborator", "collaborators")}</span> ·
                          Updated <span className="tnum">{formatDate(c.updatedAt)}</span>
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={c.status} />
                        {locked && (
                          <>
                            <Lock size={16} strokeWidth={1.75} aria-hidden className="text-muted" />
                            <span className="sr-only">Locked</span>
                          </>
                        )}
                      </span>
                      <ChevronRight size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[13px] leading-[18px] text-muted">
            Escalated cases are locked. You can always see their status and the closing note here.
          </p>
        </div>
      )}
    </>
  );
}
