import { Inbox, Lock } from "lucide-react";
import Link from "next/link";
import { bodyRow, headRow, rowLink, TableBox, td, th } from "@/components/dashboard/data-table";
import { AttachToCase } from "@/components/safetrail/attach-to-case";
import { OpenLinkButton } from "@/components/safetrail/open-link";
import { TamperCheck } from "@/components/safetrail/tamper-check";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { Banner, EmptyState } from "@/components/ui/feedback";
import { LinkTabs } from "@/components/ui/tabs";
import { formatDateTime, kindLabel } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listBoard, listSharedForReview } from "@/server/services/review";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function SharedWithReviewerPage({ searchParams }: PageProps<"/review/shared">) {
  const user = await pageUser(["reviewer"]);
  const showAll = (await searchParams).tab === "all";
  const [all, board] = await Promise.all([listSharedForReview(user), listBoard(user)]);
  const unattached = all.filter((e) => e.cases.length === 0);
  const items = showAll ? all : unattached;
  const open = board.map((c) => ({ id: c.id, title: c.title, reporterName: c.reporterName }));

  return (
    <>
      <PageHeader
        title="Shared with me"
        description="Evidence other SafeTrail users shared with you by email or password link. Attach it to a case to keep it with the review."
        action={<OpenLinkButton />}
      />
      {all.length === 0 ? (
        <EmptyState icon={<Inbox size={24} strokeWidth={1.75} />} title="Nothing has been shared with you">
          When someone shares evidence with your email, or you open a password link they sent you, it appears here.
        </EmptyState>
      ) : (
        <section aria-label="Shared evidence" className="flex min-w-0 flex-col gap-4 [&>*]:min-w-0">
          <Banner tone="info">
            When you attach shared evidence to a case, it goes in “Added by reviewers”. The student who reported never
            sees it.
          </Banner>
          <LinkTabs
            label="Show"
            tabs={[
              { label: "Not attached", href: "/review/shared", count: unattached.length, active: !showAll },
              { label: "All", href: "/review/shared?tab=all", count: all.length, active: showAll },
            ]}
          />
          {items.length === 0 ? (
            <EmptyState
              icon={<Inbox size={24} strokeWidth={1.75} />}
              title="Everything shared with you is attached"
              action={
                <Link href="/review/shared?tab=all" className={buttonClass("secondary")}>
                  Show all
                </Link>
              }
            >
              Nothing is waiting to be attached to a case.
            </EmptyState>
          ) : (
            <TableBox caption="Evidence shared with you" minWidth={1040}>
              <thead>
                <tr className={headRow}>
                  <th scope="col" className={th}>
                    Evidence
                  </th>
                  <th scope="col" className={th}>
                    Shared by
                  </th>
                  <th scope="col" className={th}>
                    Via
                  </th>
                  <th scope="col" className={th}>
                    Captured
                  </th>
                  <th scope="col" className={th}>
                    Tamper checks
                  </th>
                  <th scope="col" className={th}>
                    Attached to
                  </th>
                  <th scope="col" className={th}>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => {
                  const attachedIds = new Set(e.cases.map((c) => c.id));
                  return (
                    <tr key={e.id} className={bodyRow}>
                      <td className={`${td} max-w-[260px]`}>
                        <Link href={`/vault/${e.id}`} className={`${rowLink} block truncate`} title={e.label}>
                          {e.label}
                        </Link>
                        <span className="block text-[13px] leading-[18px] text-muted">{kindLabel(e.kind)}</span>
                      </td>
                      <td className={`${td} max-w-[220px]`}>
                        <span className="block truncate">{e.ownerName}</span>
                        <span className="block truncate text-[13px] leading-[18px] text-muted">{e.ownerEmail}</span>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <span className="inline-flex items-center gap-1.5">
                          {e.via === "link" ? (
                            <Lock size={14} strokeWidth={1.75} aria-hidden className="text-muted" />
                          ) : (
                            <Inbox size={14} strokeWidth={1.75} aria-hidden className="text-muted" />
                          )}
                          {e.via === "link" ? "Password link" : "Email"}
                        </span>
                      </td>
                      <td className={`${td} mono tnum whitespace-nowrap text-muted`}>{formatDateTime(e.capturedAt)}</td>
                      <td className={`${td} whitespace-nowrap`}>
                        <TamperCheck reviewer />
                      </td>
                      <td className={`${td} max-w-[220px]`}>
                        {e.cases.length === 0 ? (
                          <span className="text-muted">Not attached</span>
                        ) : (
                          <span className="block truncate" title={e.cases.map((c) => c.title).join(", ")}>
                            {e.cases[0].title}
                            {e.cases.length > 1 && <span className="text-muted"> and {e.cases.length - 1} more</span>}
                          </span>
                        )}
                      </td>
                      {/* Above the row's link, so these are clickable. */}
                      <td className={`${td} relative z-10 text-right whitespace-nowrap`}>
                        {e.cases.length > 0 ? (
                          <Link href={`/review/${e.cases[0].id}`} className={buttonClass("ghost", "h-9 px-3 text-sm")}>
                            Open case
                          </Link>
                        ) : (
                          <AttachToCase
                            evidenceId={e.id}
                            cases={open.filter((c) => !attachedIds.has(c.id))}
                            as="reviewer"
                            compact
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableBox>
          )}
        </section>
      )}
    </>
  );
}
