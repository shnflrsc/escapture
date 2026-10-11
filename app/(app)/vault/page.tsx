import { Inbox, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { EvidenceList, EvidenceRow } from "@/components/safetrail/evidence-row";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { pageUser } from "@/server/page-auth";
import { listEvidence } from "@/server/services/evidence";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function VaultPage({ searchParams }: PageProps<"/vault">) {
  const user = await pageUser(["student"]);
  const tab = (await searchParams).tab === "shared" ? "shared" : "mine";
  const items = await listEvidence(user, tab);

  const tabs = [
    { key: "mine", label: "My evidence", href: "/vault" },
    { key: "shared", label: "Shared with me", href: "/vault?tab=shared" },
  ];

  return (
    <>
      <PageHeader
        title="Vault"
        description="Evidence you capture is saved here. Only you can see your vault unless you choose to share something."
      />
      <nav aria-label="Vault sections" className="flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "flex h-10 items-center rounded-md px-4 text-[15px] font-semibold",
              tab === t.key ? "bg-brand-100 text-brand-800" : "text-brand-700 hover:bg-brand-50",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 && tab === "mine" && (
        <EmptyState icon={<LockKeyhole size={24} strokeWidth={1.75} />} title="Your vault is empty">
          Capture a Facebook post or conversation with the Escrow Capture extension and it will appear here.
        </EmptyState>
      )}
      {items.length === 0 && tab === "shared" && (
        <EmptyState icon={<Inbox size={24} strokeWidth={1.75} />} title="Nothing has been shared with you">
          When someone shares evidence with you by email or with a password link, it will appear here.
        </EmptyState>
      )}
      {items.length > 0 && (
        <EvidenceList>
          {items.map((item) => (
            <EvidenceRow
              key={item.id}
              item={item}
              note={tab === "shared" ? `Shared by ${item.ownerName}` : undefined}
            />
          ))}
        </EvidenceList>
      )}

      {tab === "mine" && (
        <section className="rounded-xl bg-brand-50 p-[var(--card-pad)]">
          <h2 className="text-[20px] leading-7">How to capture</h2>
          <ol className="mt-3 flex max-w-prose list-decimal flex-col gap-2 pl-5 text-sm leading-[22px] text-ink">
            <li>
              Install the Escrow Capture extension in Chrome. Open <span className="mono">chrome://extensions</span>,
              turn on Developer mode, choose Load unpacked and select the <span className="mono">extension/dist</span>{" "}
              folder.
            </li>
            <li>Open the Facebook post or Messenger conversation, then open the extension and sign in.</li>
            <li>Choose Capture this page and click the post or conversation you want to keep.</li>
          </ol>
          <p className="mt-3 max-w-prose text-[13px] leading-[18px] text-muted">
            Only messages currently loaded on screen are captured. Scroll up to load more before capturing.
          </p>
        </section>
      )}
    </>
  );
}
