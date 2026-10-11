import { Archive, Search } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { formatDate } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listArchives } from "@/server/services/review";
import { excerpt } from "@/server/services/notifications";

export default async function ArchivesPage({ searchParams }: PageProps<"/review/archives">) {
  const user = await pageUser(["reviewer"]);
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 200) ?? "";
  const items = await listArchives(user, q);

  return (
    <>
      <PageHeader title="Case Archives" description="Closed cases, with their closing notes." />
      <form method="get" role="search" className="flex items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="archive-q" className="text-sm leading-5 font-semibold">
            Search closed cases
          </label>
          <input
            id="archive-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Title, description or closing note"
            className="h-[var(--control-h)] w-full rounded-md border border-border-strong bg-card px-3 text-base placeholder:text-muted"
          />
        </div>
        <button type="submit" className={buttonClass("secondary")}>
          <Search size={16} strokeWidth={1.75} aria-hidden />
          Search
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon={<Archive size={24} strokeWidth={1.75} />} title={q ? "No closed cases match" : "No closed cases yet"}>
          {q ? "Try a different word, or clear the search to see every closed case." : "Cases appear here after a reviewer closes them with a note."}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm leading-[22px]">
            <thead className="bg-subtle text-[13px] font-semibold text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Title</th>
                <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                <th scope="col" className="px-4 py-2 font-semibold">Reporter</th>
                <th scope="col" className="px-4 py-2 font-semibold">Closed</th>
                <th scope="col" className="px-4 py-2 font-semibold">Closing note</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="h-11 border-t border-border align-top hover:bg-brand-50">
                  <td className="px-4 py-2">
                    <Link href={`/review/${c.id}`} className="link">
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status="closed" />
                  </td>
                  <td className="px-4 py-2">{c.reporterName}</td>
                  <td className="tnum px-4 py-2 whitespace-nowrap">{c.closedAt ? formatDate(c.closedAt) : ""}</td>
                  <td className="max-w-md px-4 py-2 text-muted">{excerpt(c.closingNote ?? "", 160)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
