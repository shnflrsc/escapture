import { Archive, SearchX } from "lucide-react";
import Link from "next/link";
import { bodyRow, headRow, rowLink, TableBox, TableSearch, td, th } from "@/components/dashboard/data-table";
import { FilterChip, ParamSelect } from "@/components/dashboard/filters";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { formatDate } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listArchives } from "@/server/services/review";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function ArchivesPage({ searchParams }: PageProps<"/review/archives">) {
  const user = await pageUser(["reviewer", "admin"]);
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = first(params.q).trim().slice(0, 120);
  const mine = first(params.mine) === "1";
  const rev = first(params.rev) === "1";
  const days = first(params.days) === "30" ? 30 : first(params.days) === "90" ? 90 : undefined;
  const items = await listArchives(user, { q: q || undefined, mine, rev, days });
  const href = (over: { q?: string; mine?: boolean; rev?: boolean; days?: number | null }) => {
    const next = { q, mine, rev, days: days ?? null, ...over };
    const s = new URLSearchParams();
    if (next.q) s.set("q", next.q);
    if (next.mine) s.set("mine", "1");
    if (next.rev) s.set("rev", "1");
    if (next.days) s.set("days", String(next.days));
    const qs = s.toString();
    return qs ? `/review/archives?${qs}` : "/review/archives";
  };
  const filtered = Boolean(q || mine || rev || days);

  return (
    <>
      <PageHeader title="Case Archives" />
      <section aria-label="Closed cases" className="flex min-w-0 flex-col gap-4 [&>*]:min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip label="Closed by me" href={href({ mine: !mine })} on={mine} />
            <FilterChip label="Has reviewer attachments" href={href({ rev: !rev })} on={rev} />
            <ParamSelect
              label="Closed"
              value={days ? String(days) : "all"}
              options={[
                { value: "all", label: "Any time" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
              ]}
              hrefs={{ all: href({ days: null }), "30": href({ days: 30 }), "90": href({ days: 90 }) }}
            />
            {filtered && (
              <Link href="/review/archives" className={buttonClass("ghost", "h-10 px-3 text-sm")}>
                Clear filters
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <p aria-live="polite" className="tnum text-sm leading-5 text-muted">
              {items.length} {items.length === 1 ? "case" : "cases"}
            </p>
            <TableSearch
              action="/review/archives"
              label="Search cases, reporters or closing notes"
              value={q}
              keep={{ mine: mine ? "1" : undefined, rev: rev ? "1" : undefined, days: days ? String(days) : undefined }}
              className="w-full sm:w-[340px]"
            />
          </div>
        </div>

        {items.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<SearchX size={24} strokeWidth={1.75} />}
              title="No closed cases match"
              action={
                <Link href="/review/archives" className={buttonClass("secondary")}>
                  Clear filters
                </Link>
              }
            >
              {q
                ? `Nothing in the archives has “${q}” in its title, reporter, description or closing note.`
                : "No closed case matches these filters."}
            </EmptyState>
          ) : (
            <EmptyState icon={<Archive size={24} strokeWidth={1.75} />} title="No closed cases yet">
              Cases appear here after a reviewer closes them with a note.
            </EmptyState>
          )
        ) : (
          <TableBox caption="Closed cases" minWidth={980}>
            <thead>
              <tr className={headRow}>
                <th scope="col" className={th}>
                  Case
                </th>
                <th scope="col" className={th}>
                  Reporter
                </th>
                <th scope="col" className={th}>
                  Escalated
                </th>
                <th scope="col" aria-sort="descending" className={th}>
                  Closed
                </th>
                <th scope="col" className={th}>
                  Closed by
                </th>
                <th scope="col" className={th}>
                  Closing note
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Evidence
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className={bodyRow}>
                  <td className={`${td} max-w-[260px]`}>
                    <Link href={`/review/${c.id}`} className={`${rowLink} block truncate`} title={c.title}>
                      {c.title}
                    </Link>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{c.reporterName}</td>
                  <td className={`${td} tnum whitespace-nowrap text-muted`}>
                    {c.escalatedAt ? formatDate(c.escalatedAt) : ""}
                  </td>
                  <td className={`${td} tnum whitespace-nowrap`}>{c.closedAt ? formatDate(c.closedAt) : ""}</td>
                  <td className={`${td} whitespace-nowrap`}>{c.closedBy ?? ""}</td>
                  <td className={`${td} max-w-[320px]`}>
                    <span className="block truncate text-muted" title={c.closingNote ?? undefined}>
                      {c.closingNote}
                    </span>
                  </td>
                  <td className={`${td} tnum text-right`}>{c.evidenceCount}</td>
                </tr>
              ))}
            </tbody>
          </TableBox>
        )}
      </section>
    </>
  );
}
