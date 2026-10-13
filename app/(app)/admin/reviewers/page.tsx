import { SearchX, Users } from "lucide-react";
import Link from "next/link";
import { bodyRow, headRow, TableBox, TableSearch, td, th } from "@/components/dashboard/data-table";
import { ReviewerForm } from "@/components/safetrail/reviewer-form";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { formatDate, formatDateTime, initials } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listReviewers } from "@/server/services/admin";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function ReviewerAccountsPage({ searchParams }: PageProps<"/admin/reviewers">) {
  const user = await pageUser(["admin"]);
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 120) ?? "";
  const reviewers = await listReviewers(user, q || undefined);

  return (
    <>
      <PageHeader
        title="Reviewer accounts"
        description="Create accounts for the university's designated case reviewers. Students sign up on their own with a BulSU email."
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-label="Reviewers" className="flex min-w-0 flex-col gap-4 [&>*]:min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="tnum text-sm leading-5 text-muted">
              {reviewers.length} {reviewers.length === 1 ? "reviewer" : "reviewers"}
              {q && <> matching “{q}”</>}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {q && (
                <Link href="/admin/reviewers" className={buttonClass("ghost", "h-10 px-3")}>
                  Clear search
                </Link>
              )}
              <TableSearch
                action="/admin/reviewers"
                label="Search by name or email"
                value={q}
                className="w-full sm:w-[280px]"
              />
            </div>
          </div>
          {reviewers.length === 0 ? (
            q ? (
              <EmptyState
                icon={<SearchX size={24} strokeWidth={1.75} />}
                title="No reviewers match"
                action={
                  <Link href="/admin/reviewers" className={buttonClass("secondary")}>
                    Clear search
                  </Link>
                }
              >
                No reviewer account has “{q}” in its name or email.
              </EmptyState>
            ) : (
              <EmptyState icon={<Users size={24} strokeWidth={1.75} />} title="No reviewer accounts yet">
                Create the first one with the form on this page. Reviewers sign in with the email and temporary password
                you give them.
              </EmptyState>
            )
          ) : (
            <TableBox caption="Reviewer accounts" minWidth={600}>
              <thead>
                <tr className={headRow}>
                  <th scope="col" className={th}>
                    Reviewer
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
                </tr>
              </thead>
              <tbody>
                {reviewers.map((r) => (
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
                    <td className={td}>
                      <Badge tone="tamper" icon={<span aria-hidden className="size-2 rounded-full bg-tamper-solid" />}>
                        Active
                      </Badge>
                    </td>
                    <td className={`${td} tnum whitespace-nowrap text-muted`}>{formatDate(r.createdAt)}</td>
                    <td className={`${td} tnum whitespace-nowrap text-muted`}>
                      {r.lastSignInAt ? formatDateTime(r.lastSignInAt) : "Not yet"}
                    </td>
                  </tr>
                ))}
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
