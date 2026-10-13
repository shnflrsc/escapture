import { Archive, SearchX } from "lucide-react";
import Link from "next/link";
import { bodyRow, headRow, rowLink, TableBox, TableSearch, td, th } from "@/components/dashboard/data-table";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { formatDate } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listArchives } from "@/server/services/review";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function ArchivesPage({ searchParams }: PageProps<"/review/archives">) {
  const user = await pageUser(["reviewer"]);
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 120) ?? "";
  const items = await listArchives(user, q || undefined);

  return (
    <>
      <PageHeader
        title="Case Archives"
        description="Closed cases, so you can look up how earlier cases were handled. Archived cases can't be changed."
      />
      <section aria-label="Closed cases" className="flex min-w-0 flex-col gap-4 [&>*]:min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="tnum text-sm leading-5 text-muted">
            {items.length} closed {items.length === 1 ? "case" : "cases"}
            {q && <> matching “{q}”</>}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {q && (
              <Link href="/review/archives" className={buttonClass("ghost", "h-10 px-3")}>
                Clear search
              </Link>
            )}
            <TableSearch
              action="/review/archives"
              label="Search cases, reporters or closing notes"
              value={q}
              className="w-full sm:w-[340px]"
            />
          </div>
        </div>

        {items.length === 0 ? (
          q ? (
            <EmptyState
              icon={<SearchX size={24} strokeWidth={1.75} />}
              title="No closed cases match"
              action={
                <Link href="/review/archives" className={buttonClass("secondary")}>
                  Clear search
                </Link>
              }
            >
              Nothing in the archives has “{q}” in its title, reporter, description or closing note.
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
