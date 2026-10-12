import { Inbox, LockKeyhole, SearchX } from "lucide-react";
import Link from "next/link";
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
  const narrowed = Boolean(view.q || view.kind);

  return (
    <>
      <PageHeader
        title="Vault"
        description="Evidence you capture is saved here. Only you can see your vault unless you choose to share something."
        action={total > 0 || view.tab === "shared" ? <HowToCapture /> : undefined}
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
            action={<HowToCapture variant="primary" />}
          >
            Capture a Facebook post or conversation with the Escrow Capture extension and it will appear here.
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
        {items.length > 0 && <VaultTable items={items} shared={view.tab === "shared"} />}
      </div>
    </>
  );
}
