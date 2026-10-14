import { SearchX, Users } from "lucide-react";
import Link from "next/link";
import { bodyRow, headRow, TableBox, TableSearch, td, th } from "@/components/dashboard/data-table";
import { ReviewerForm, ReviewerRowActions } from "@/components/safetrail/reviewer-form";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { LinkTabs } from "@/components/ui/tabs";
import { formatDate, formatDateTime, initials } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listReviewers, type ReviewerStatus } from "@/server/services/admin";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Colour, a dot and words together; never colour alone.
const STATUS: Record<ReviewerStatus, { label: string; tone: "tamper" | "escalated" | "neutral"; dot: string }> = {
  active: { label: "Active", tone: "tamper", dot: "bg-tamper-solid" },
  pending: { label: "Pending setup", tone: "escalated", dot: "bg-escalated-solid" },
  expired: { label: "Setup link expired", tone: "escalated", dot: "bg-escalated-solid" },
  deactivated: { label: "Deactivated", tone: "neutral", dot: "bg-closed-solid" },
};

const TABS = [
  { key: "", label: "All", match: () => true },
  { key: "active", label: "Active", match: (s: ReviewerStatus) => s === "active" },
  { key: "pending", label: "Pending setup", match: (s: ReviewerStatus) => s === "pending" || s === "expired" },
  { key: "deactivated", label: "Deactivated", match: (s: ReviewerStatus) => s === "deactivated" },
];

export default async function ReviewerAccountsPage({ searchParams }: PageProps<"/admin/reviewers">) {
  const user = await pageUser(["admin"]);
  const params = await searchParams;
  const q = first(params.q).trim().slice(0, 120);
  const tab = TABS.find((t) => t.key === first(params.status)) ?? TABS[0];
  const all = await listReviewers(user, { q: q || undefined });
  const reviewers = all.filter((r) => tab.match(r.status));
  const href = (status: string, query = q) => {
    const s = new URLSearchParams();
    if (status) s.set("status", status);
    if (query) s.set("q", query);
    const qs = s.toString();
    return qs ? `/admin/reviewers?${qs}` : "/admin/reviewers";
  };

  return (
    <>
      <PageHeader title="Reviewer accounts" />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-label="Reviewers" className="flex min-w-0 flex-col gap-4 [&>*]:min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LinkTabs
              label="Filter accounts"
              unit="accounts"
              tabs={TABS.map((t) => ({
                label: t.label,
                href: href(t.key),
                count: all.filter((r) => t.match(r.status)).length,
                active: t.key === tab.key,
              }))}
            />
            <div className="flex flex-wrap items-center gap-3">
              {q && (
                <Link href={href(tab.key, "")} className={buttonClass("ghost", "h-10 px-3")}>
                  Clear search
                </Link>
              )}
              <TableSearch
                action="/admin/reviewers"
                label="Search by name, email or office"
                value={q}
                keep={{ status: tab.key || undefined }}
                className="w-full sm:w-[280px]"
              />
            </div>
          </div>
          {reviewers.length === 0 ? (
            q || tab.key ? (
              <EmptyState
                icon={<SearchX size={24} strokeWidth={1.75} />}
                title="No reviewers match"
                action={
                  <Link href="/admin/reviewers" className={buttonClass("secondary")}>
                    Clear filters
                  </Link>
                }
              >
                {q ? `No reviewer account here has “${q}” in its name, email or office.` : `No account is under “${tab.label}”.`}
              </EmptyState>
            ) : (
              <EmptyState icon={<Users size={24} strokeWidth={1.75} />} title="No reviewer accounts yet">
                Create the first one with the form on this page. You get a setup link to pass on to the reviewer.
              </EmptyState>
            )
          ) : (
            <TableBox caption="Reviewer accounts" minWidth={860}>
              <thead>
                <tr className={headRow}>
                  <th scope="col" className={th}>
                    Reviewer
                  </th>
                  <th scope="col" className={th}>
                    Office
                  </th>
                  <th scope="col" className={th}>
                    Status
                  </th>
                  <th scope="col" className={th}>
                    Created
                  </th>
                  <th scope="col" className={th}>
                    Last sign-in
                  </th>
                  <th scope="col" className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviewers.map((r) => {
                  const status = STATUS[r.status];
                  return (
                    <tr key={r.id} className={bodyRow}>
                      <td className={td}>
                        <span className="flex min-w-[220px] items-center gap-3">
                          <span
                            aria-hidden
                            className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[13px] leading-none font-bold text-brand-800"
                          >
                            {initials(r.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{r.name}</span>
                            <span className="block truncate text-[13px] leading-[18px] text-muted">{r.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className={`${td} text-[13px] leading-[18px]`}>
                        {r.office ?? <span className="text-muted">Not specified</span>}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <Badge tone={status.tone} icon={<span aria-hidden className={`size-2 rounded-full ${status.dot}`} />}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className={`${td} tnum whitespace-nowrap text-muted`}>{formatDate(r.createdAt)}</td>
                      <td className={`${td} tnum whitespace-nowrap text-muted`}>
                        {r.lastSignInAt ? formatDateTime(r.lastSignInAt) : "Not yet"}
                      </td>
                      <td className={`${td} text-right whitespace-nowrap`}>
                        <ReviewerRowActions id={r.id} name={r.name} status={r.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableBox>
          )}
        </section>

        <Card className="flex flex-col gap-4">
          <h2 className="text-[20px] leading-7">Create a reviewer account</h2>
          <ReviewerForm />
        </Card>
      </div>
    </>
  );
}
