import { Columns3, SearchX } from "lucide-react";
import Link from "next/link";
import { lastUpdateText } from "@/components/dashboard/charts";
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
import { FilterChip, ParamSelect } from "@/components/dashboard/filters";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { LinkTabs } from "@/components/ui/tabs";
import { formatDate, timeAgo } from "@/lib/format";
import { boardQuery } from "@/lib/validators";
import { pageUser } from "@/server/page-auth";
import { boardPage, RANGE_DAYS, type BoardRange, type BoardSort } from "@/server/services/review";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Here the period narrows the table by when a case was escalated. Everything is shown unless one is chosen.
const PERIODS: { value: BoardRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

type View = {
  status?: string;
  q?: string;
  sort?: string;
  page?: number;
  collab?: boolean;
  rev?: boolean;
  mine?: boolean;
  unassigned?: boolean;
  range?: BoardRange;
};

export default async function ReviewBoardPage({ searchParams }: PageProps<"/review/board">) {
  const user = await pageUser(["reviewer", "admin"]);
  const params = await searchParams;
  // The address is typed by people too: anything unrecognised falls back to the default view.
  const parsed = boardQuery.safeParse({
    status: first(params.status) || undefined,
    q: first(params.q) || undefined,
    sort: first(params.sort) || undefined,
    page: first(params.page) || undefined,
    collab: first(params.collab) || undefined,
    rev: first(params.rev) || undefined,
    mine: first(params.mine) || undefined,
    unassigned: first(params.unassigned) || undefined,
    range: first(params.range) || undefined,
  });
  const raw = parsed.success ? parsed.data : {};
  const range: BoardRange = raw.range ?? "all";
  const query = {
    status: raw.status,
    q: raw.q,
    sort: raw.sort,
    page: raw.page,
    collab: Boolean(raw.collab),
    rev: Boolean(raw.rev),
    // Only reviewers are assigned, so "assigned to me" means nothing for an administrator.
    mine: Boolean(raw.mine) && user.role === "reviewer",
    unassigned: Boolean(raw.unassigned),
    days: RANGE_DAYS[range] ?? undefined,
  };
  const board = await boardPage(user, query);

  const href = (over: View) => {
    const next: View = { ...query, range, ...over };
    const s = new URLSearchParams();
    if (next.status) s.set("status", next.status);
    if (next.q) s.set("q", next.q);
    if (next.collab) s.set("collab", "1");
    if (next.rev) s.set("rev", "1");
    if (next.mine) s.set("mine", "1");
    if (next.unassigned) s.set("unassigned", "1");
    if (next.sort && next.sort !== "escalated") s.set("sort", next.sort);
    if (next.range && next.range !== "all") s.set("range", next.range);
    if (next.page && next.page > 1) s.set("page", String(next.page));
    const qs = s.toString();
    return qs ? `/review/board?${qs}` : "/review/board";
  };
  const sort = query.sort ?? "escalated";
  const sortable = (column: "status" | "reporter" | "escalated") => {
    const direction = sort === column ? ("ascending" as const) : sort === `-${column}` ? ("descending" as const) : null;
    const to = (direction === "ascending" ? `-${column}` : column) as BoardSort;
    return { direction, href: href({ sort: to, page: 1 }) };
  };
  const filtered = Boolean(
    query.status || query.q || query.collab || query.rev || query.mine || query.unassigned || range !== "all",
  );
  const clear = href({
    status: undefined,
    q: undefined,
    collab: false,
    rev: false,
    mine: false,
    unassigned: false,
    range: "all",
    page: 1,
  });
  const nothingOpen = !filtered && board.counts.all === 0;

  return (
    <>
      <PageHeader title="Review Board" />

      {nothingOpen ? (
        <EmptyState icon={<Columns3 size={24} strokeWidth={1.75} />} title="No open cases" />
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
            <TableSearch
              action="/review/board"
              label="Search cases and reporters"
              value={query.q ?? ""}
              keep={{
                status: query.status,
                sort: query.sort,
                collab: query.collab ? "1" : undefined,
                rev: query.rev ? "1" : undefined,
                mine: query.mine ? "1" : undefined,
                unassigned: query.unassigned ? "1" : undefined,
                range: range !== "all" ? range : undefined,
              }}
              className="w-full sm:w-[280px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user.role === "reviewer" && (
              <FilterChip
                label="Assigned to me"
                href={href({ mine: !query.mine, unassigned: false, page: 1 })}
                on={query.mine}
              />
            )}
            <FilterChip
              label="Unassigned"
              href={href({ unassigned: !query.unassigned, mine: false, page: 1 })}
              on={query.unassigned}
            />
            <FilterChip label="Has collaborators" href={href({ collab: !query.collab, page: 1 })} on={query.collab} />
            <FilterChip label="Has reviewer attachments" href={href({ rev: !query.rev, page: 1 })} on={query.rev} />
            <ParamSelect
              label="Period"
              value={range}
              options={PERIODS}
              hrefs={Object.fromEntries(PERIODS.map((p) => [p.value, href({ range: p.value, page: 1 })]))}
            />
            {filtered && (
              <Link href={clear} className={buttonClass("ghost", "h-10 px-3 text-sm")}>
                Clear filters
              </Link>
            )}
            <p aria-live="polite" className="tnum ml-auto text-sm leading-5 text-muted">
              {plural(board.total, "case", "cases")}
            </p>
          </div>

          {board.items.length === 0 ? (
            <EmptyState
              icon={<SearchX size={24} strokeWidth={1.75} />}
              title="No cases match"
              action={
                <Link href={clear} className={buttonClass("secondary")}>
                  Clear filters
                </Link>
              }
            />
          ) : (
            <>
              <TableBox caption="Open cases" minWidth={960}>
                <thead>
                  <tr className={headRow}>
                    <th scope="col" className={th}>
                      Case
                    </th>
                    <SortHeader label="Status" {...sortable("status")} />
                    <SortHeader label="Reporter" {...sortable("reporter")} />
                    <th scope="col" className={th}>
                      Assigned
                    </th>
                    <th scope="col" className={`${th} text-right`}>
                      Collaborators
                    </th>
                    <th scope="col" className={`${th} text-right`}>
                      Evidence
                    </th>
                    <SortHeader label="Escalated" {...sortable("escalated")} />
                    <th scope="col" className={th}>
                      Last update
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {board.items.map((c) => (
                    <tr key={c.id} className={bodyRow}>
                      <td className={`${td} max-w-[220px]`}>
                        <Link href={`/review/${c.id}`} className={`${rowLink} block truncate`} title={c.title}>
                          {c.title}
                        </Link>
                      </td>
                      <td className={td}>
                        <StatusBadge status={c.status} />
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{c.reporterName}</td>
                      <td className={`${td} max-w-[200px]`}>
                        {c.assignees.length === 0 ? (
                          <span className="text-muted">Unassigned</span>
                        ) : (
                          <span className="block truncate" title={c.assignees.map((a) => a.name).join(", ")}>
                            {c.assignees[0].name}
                            {c.assignees.length > 1 && (
                              <span className="text-muted"> and {c.assignees.length - 1} more</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className={`${td} tnum text-right`}>{c.collaboratorCount}</td>
                      <td className={`${td} tnum text-right`}>{c.evidenceCount}</td>
                      <td className={`${td} tnum whitespace-nowrap text-muted`}>
                        {c.escalatedAt ? formatDate(c.escalatedAt) : ""}
                      </td>
                      <td className={`${td} whitespace-nowrap text-muted`}>
                        {c.lastEvent && (
                          <>
                            {lastUpdateText(c.lastEvent.type)} · <span className="tnum">{timeAgo(c.lastEvent.at)}</span>
                          </>
                        )}
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
