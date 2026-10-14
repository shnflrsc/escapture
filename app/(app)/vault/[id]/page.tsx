import { PageCrumbs } from "@/components/safetrail/app-shell";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CasesCard, IntegrityCard } from "@/components/safetrail/evidence-cards";
import { EvidenceFrame } from "@/components/safetrail/evidence-frame";
import { EvidenceTitle } from "@/components/safetrail/evidence-title";
import { AccessList, LinkList } from "@/components/safetrail/sharing-lists";
import { VaultRowMenu } from "@/components/safetrail/vault-row-menu";
import { Card } from "@/components/ui/card";
import { formatDateTime, kindLabel } from "@/lib/format";
import { isUuid, orNotFound, pageUser } from "@/server/page-auth";
import { casesForEvidence, caseVersion } from "@/server/services/cases";
import { getEvidence } from "@/server/services/evidence";
import { casesWithEvidence, listBoard } from "@/server/services/review";
import { listEvidenceLinks } from "@/server/services/links";
import { listEvidenceShares } from "@/server/services/shares";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function EvidencePage({ params, searchParams }: PageProps<"/vault/[id]">) {
  const { id } = await params;
  const from = (await searchParams).from;
  const user = await pageUser(["student", "reviewer", "admin"]);
  if (!isUuid(id)) notFound();
  const ev = await orNotFound(getEvidence(user, id));
  const [shares, links] = ev.isOwner
    ? await Promise.all([listEvidenceShares(user, id), listEvidenceLinks(user, id)])
    : [[], []];
  // An administrator sees evidence exactly as a reviewer does.
  const reviewer = user.role !== "student";
  const fromId = typeof from === "string" && isUuid(from) ? from : null;
  // Opened from a case: lead back to it, but only if it is a case this person can open.
  const fromCase = !reviewer && fromId && (await caseVersion(user, fromId).catch(() => null)) ? fromId : null;

  // Which cases the viewer may know about differs by role: a student sees their own
  // cases, a reviewer sees every case that is no longer a draft.
  let cases: React.ComponentProps<typeof CasesCard>;
  let backToReview: string | null = null;
  if (reviewer) {
    const attached = await casesWithEvidence(user, id);
    // A reviewer may attach evidence that is theirs to use: shared with them, or their own.
    const canAttach = ev.sharedWithMe || ev.isOwner;
    const available = canAttach
      ? (await listBoard(user))
          .filter((c) => !attached.some((a) => a.id === c.id))
          .map((c) => ({ id: c.id, title: c.title, reporterName: c.reporterName }))
      : [];
    cases = { evidenceId: id, reviewer, attached, available, canAttach };
    // Opened from a case under review: that case must really hold this evidence.
    if (fromId && attached.some((a) => a.id === fromId)) backToReview = fromId;
  } else {
    cases = { evidenceId: id, reviewer, ...(await casesForEvidence(user, ev)), canAttach: ev.isOwner };
  }
  // Someone it was only shared with has nothing to see or do here unless it is in one of their cases.
  const showCases = reviewer || ev.isOwner || cases.attached.length > 0;

  return (
    <>
      <PageCrumbs title={ev.label} />
      <div>
        <Link
          href={
            fromCase
              ? `/cases/${fromCase}`
              : backToReview
                ? `/review/${backToReview}`
                : reviewer
                  ? ev.sharedWithMe
                    ? "/review/shared"
                    : "/review/board"
                  : "/vault"
          }
          className="link inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          {fromCase || backToReview
            ? "Back to the case"
            : reviewer
              ? ev.sharedWithMe
                ? "Back to Shared with me"
                : "Back to the Review Board"
              : "Back to your vault"}
        </Link>
      </div>
      <header className="min-w-0">
        {ev.isOwner && !ev.locked ? (
          <>
            {/* The name is a field for its owner; the page still needs a heading. */}
            <h1 className="sr-only">{ev.label}</h1>
            <EvidenceTitle key={ev.label} evidenceId={ev.id} value={ev.label} />
          </>
        ) : (
          <h1 className="break-words">{ev.label}</h1>
        )}
        <p className="mt-1 text-muted">
          {kindLabel(ev.kind)} · Captured <span className="tnum">{formatDateTime(ev.capturedAt)}</span>
          {ev.isOwner
            ? shares.length > 0 && ` · Shared with ${shares.length} ${shares.length === 1 ? "person" : "people"}`
            : ` · Captured by ${ev.owner?.name ?? "another student"}`}
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 overflow-hidden bg-subtle p-4">
          {/* Untrusted HTML (I8): script-less sandbox, served with a sandbox CSP. */}
          <EvidenceFrame
            src={`/api/evidence/${ev.id}/file`}
            title={`Captured content: ${ev.label}`}
            size={ev.tamperReport.size}
          />
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {showCases && <CasesCard {...cases} />}

          <IntegrityCard
            evidenceId={ev.id}
            reviewer={reviewer}
            capturedAt={ev.capturedAt}
            sourceUrl={ev.sourceUrl}
            sha256={ev.sha256}
            checks={ev.tamperReport.checks.length}
          />

          {ev.isOwner && (
            <Card className="flex flex-col gap-4">
              <h3>Sharing</h3>
              {shares.length === 0 ? (
                <p className="text-sm leading-[22px] text-muted">Only you have access.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <h4>Who has access</h4>
                  <AccessList evidenceId={ev.id} people={shares} />
                </div>
              )}
              {links.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4>Password links</h4>
                  <LinkList endpoint={`/api/evidence/${ev.id}/links`} links={links} />
                </div>
              )}
              <VaultRowMenu id={ev.id} label={ev.label} locked={ev.locked} onPage />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
