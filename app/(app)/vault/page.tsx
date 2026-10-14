import { Inbox, LockKeyhole, SearchX } from "lucide-react";
import Link from "next/link";
import { Pagination } from "@/components/dashboard/data-table";
import { HowToCapture } from "@/components/safetrail/how-to-capture";
import { VaultTable } from "@/components/safetrail/vault-table";
import { VaultToolbar } from "@/components/safetrail/vault-toolbar";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { evidenceKind, evidenceSort } from "@/lib/validators";
import { vaultHref, type VaultView } from "@/lib/vault-view";
import { pageUser } from "@/server/page-auth";
import { countEvidence, listEvidence } from "@/server/services/evidence";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

const PAGE_SIZE = 25;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function VaultPage({ searchParams }: PageProps<"/vault">) {
  const user = await pageUser(["student"]);
  const params = await searchParams;
  // The address is typed by people too: anything unrecognised falls back to the default view.
  const view: VaultView = {
    tab: first(params.tab) === "shared" ? "shared" : "mine",
    q: first(params.q).trim().slice(0, 120),
    kind: evidenceKind.safeParse(first(params.kind)).data ?? "",
    sort: evidenceSort.safeParse(first(params.sort)).data ?? "",
  };
  const [items, counts] = await Promise.all([
    listEvidence(user, view.tab, {
      q: view.q || undefined,
      kind: view.kind || undefined,
      sort: view.sort || undefined,
    }),
    countEvidence(user),
  ]);
  const total = counts[view.tab];
  // A long vault is shown a page at a time.
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(first(params.page), 10) || 1));
  const shown = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const narrowed = Boolean(view.q || view.kind);

  return (
    <>
      <PageHeader
        title="Vault"
        action={total > 0 || view.tab === "shared" ? <HowToCapture label="Capture evidence" /> : undefined}
      />
      <div className="flex flex-col gap-4">
        <VaultToolbar view={view} counts={counts} showControls={total > 0} />

        {narrowed && total > 0 && (
          <p aria-live="polite" className="text-sm leading-[22px] text-muted">
            Showing <span className="tnum">{items.length}</span> of <span className="tnum">{total}</span>
            {view.q && <> for “{view.q}”</>}.{" "}
            <Link href={vaultHref({ tab: view.tab })} className="link">
              Clear
            </Link>
          </p>
        )}

        {total === 0 && view.tab === "mine" && (
          <EmptyState
            icon={<LockKeyhole size={24} strokeWidth={1.75} />}
            title="Your vault is empty"
            action={<HowToCapture variant="primary" label="Capture evidence" />}
          >
            Capture a Facebook post or conversation with the Escapture extension and it will appear here.
          </EmptyState>
        )}
        {total === 0 && view.tab === "shared" && (
          <EmptyState icon={<Inbox size={24} strokeWidth={1.75} />} title="Nothing has been shared with you">
            When someone shares evidence with you by email or with a password link, it will appear here.
          </EmptyState>
        )}
        {total > 0 && items.length === 0 && (
          <EmptyState
            icon={<SearchX size={24} strokeWidth={1.75} />}
            title="Nothing matches"
            action={
              <Link href={vaultHref({ tab: view.tab })} className={buttonClass("secondary")}>
                Clear search and filters
              </Link>
            }
          >
            {view.q ? `No ${view.kind ? "items of that kind" : "items"} match “${view.q}”.` : "No items of that kind."}{" "}
            Clear the search and filters to see everything.
          </EmptyState>
        )}
        {items.length > 0 && <VaultTable items={shown} shared={view.tab === "shared"} />}
        <Pagination
          page={page}
          pages={pages}
          total={items.length}
          unit={items.length === 1 ? "item" : "items"}
          hrefFor={(to) => vaultHref({ ...view, page: to })}
        />
      </div>
    </>
  );
}
