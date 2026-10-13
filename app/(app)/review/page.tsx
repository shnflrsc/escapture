import { CircleCheck, CircleDot, Columns3, Eye, Inbox, SearchX } from "lucide-react";
import Link from "next/link";
import {
  bodyRow,
  headRow,
  Pagination,
  rowLink,
  SortHeader,
  TableBox,
  TableSearch,
  td,
  th,
} from "@/components/dashboard/data-table";
import { StatTile } from "@/components/dashboard/stat-tile";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { LinkTabs } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { boardQuery } from "@/lib/validators";
import { pageUser } from "@/server/page-auth";
import { boardPage, boardSummary, type BoardSort } from "@/server/services/review";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async function ReviewBoardPage({ searchParams }: PageProps<"/review">) {
  const user = await pageUser(["reviewer"]);
  const params = await searchParams;
  // The address is typed by people too: anything unrecognised falls back to the default view.
  const parsed = boardQuery.safeParse({
    status: first(params.status) || undefined,
    q: first(params.q) || undefined,
    sort: first(params.sort) || undefined,
    page: first(params.page) || undefined,
  });
  const query = parsed.success ? parsed.data : {};
  const [board, summary] = await Promise.all([boardPage(user, query), boardSummary(user)]);

  const href = (over: { status?: string; q?: string; sort?: string; page?: number }) => {
    const next = { status: query.status, q: query.q, sort: query.sort, ...over };
    const s = new URLSearchParams();
    if (next.status) s.set("status", next.status);
    if (next.q) s.set("q", next.q);
    if (next.sort && next.sort !== "escalated") s.set("sort", next.sort);
    if (next.page && next.page > 1) s.set("page", String(next.page));
    const qs = s.toString();
    return qs ? `/review?${qs}` : "/review";
  };
  const sort = query.sort ?? "escalated";
  const sortable = (column: "status" | "reporter" | "escalated") => {
    const direction = sort === column ? ("ascending" as const) : sort === `-${column}` ? ("descending" as const) : null;
    const to = (direction === "ascending" ? `-${column}` : column) as BoardSort;
    return { direction, href: href({ sort: to, page: 1 }) };
  };
  const filtered = Boolean(query.status || query.q);
  const nothingOpen = !filtered && board.counts.all === 0;

  return (
    <>
      <PageHeader
        title="Review Board"
        description="Cases students have escalated. Open a case to review it. Closed cases move to Case Archives."
      />

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Escalated"
          Icon={CircleDot}
          value={summary.escalated}
          note={`${summary.newThisWeek} new this week`}
        />
        <StatTile
          label="Under Review"
          Icon={Eye}
          value={summary.underReview}
          note={
            summary.oldestUnderReviewDays === null
              ? "None open"
              : `Oldest has been open ${plural(summary.oldestUnderReviewDays, "day", "days")}`
          }
        />
        <StatTile label="Shared with you" Icon={Inbox} value={summary.sharedUnattached} note="Not yet attached to a case" />
        <StatTile label="Closed this month" Icon={CircleCheck} value={summary.closedThisMonth} note="Now in Case Archives" />
      </dl>

      {nothingOpen ? (
        <EmptyState icon={<Columns3 size={24} strokeWidth={1.75} />} title="No open cases">
          When a student escalates a case it will appear here. Closed cases are in the Case Archives.
        </EmptyState>
      ) : (
        <section aria-label="Open cases" className="flex min-w-0 flex-col gap-4 [&>*]:min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <LinkTabs
              label="Status"
              unit="cases"
              tabs={[
                { label: "All open", href: href({ status: undefined, page: 1 }), count: board.counts.all, active: !query.status },
                {
                  label: "Escalated",
                  href: href({ status: "escalated", page: 1 }),
                  count: board.counts.escalated,
                  active: query.status === "escalated",
                },
                {
                  label: "Under Review",
                  href: href({ status: "under_review", page: 1 }),
                  count: board.counts.under_review,
                  active: query.status === "under_review",
                },
              ]}
            />
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">
              {filtered && (
                <Link href="/review" className={buttonClass("ghost", "h-10 px-3")}>
                  Clear filters
                </Link>
              )}
              <TableSearch
                action="/review"
                label="Search cases and reporters"
                value={query.q ?? ""}
                keep={{ status: query.status, sort: query.sort }}
                className="w-full sm:w-[280px]"
              />
            </div>
          </div>

          {board.items.length === 0 ? (
            <EmptyState
              icon={<SearchX size={24} strokeWidth={1.75} />}
              title="No cases match"
              action={
                <Link href="/review" className={buttonClass("secondary")}>
                  Clear filters
                </Link>
              }
            >
              {query.q ? `Nothing open matches “${query.q}”.` : "No open case has that status."} Closed cases are in the
              Case Archives.
            </EmptyState>
          ) : (
            <>
              <TableBox caption="Open cases">
                <thead>
                  <tr className={headRow}>
                    <th scope="col" className={th}>
                      Case
                    </th>
                    <SortHeader label="Status" {...sortable("status")} />
                    <SortHeader label="Reporter" {...sortable("reporter")} />
                    <th scope="col" className={`${th} text-right`}>
                      Collaborators
                    </th>
                    <th scope="col" className={`${th} text-right`}>
                      Evidence
                    </th>
                    <SortHeader label="Escalated" {...sortable("escalated")} />
                  </tr>
                </thead>
                <tbody>
                  {board.items.map((c) => (
                    <tr key={c.id} className={bodyRow}>
                      <td className={`${td} max-w-[360px]`}>
                        <Link href={`/review/${c.id}`} className={`${rowLink} block truncate`} title={c.title}>
                          {c.title}
                        </Link>
                      </td>
                      <td className={td}>
                        <StatusBadge status={c.status} />
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{c.reporterName}</td>
                      <td className={`${td} tnum text-right`}>{c.collaboratorCount}</td>
                      <td className={`${td} tnum text-right`}>{c.evidenceCount}</td>
                      <td className={`${td} tnum whitespace-nowrap text-muted`}>
                        {c.escalatedAt ? formatDate(c.escalatedAt) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableBox>
              <Pagination
                page={board.page}
                pages={board.pages}
                total={board.total}
                unit={board.total === 1 ? "case" : "cases"}
                hrefFor={(page) => href({ page })}
              />
            </>
          )}
        </section>
      )}
    </>
  );
}
