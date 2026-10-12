import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CasesCard, IntegrityCard } from "@/components/safetrail/evidence-cards";
import { EvidenceFrame } from "@/components/safetrail/evidence-frame";
import { VaultRowMenu } from "@/components/safetrail/vault-row-menu";
import { Card, PageHeader } from "@/components/ui/card";
import { formatDateTime, kindLabel } from "@/lib/format";
import { isUuid, orNotFound, pageUser } from "@/server/page-auth";
import { casesForEvidence, caseVersion } from "@/server/services/cases";
import { getEvidence } from "@/server/services/evidence";
import { casesWithEvidence, listBoard } from "@/server/services/review";
import { listEvidenceShares } from "@/server/services/shares";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function EvidencePage({ params, searchParams }: PageProps<"/vault/[id]">) {
  const { id } = await params;
  const from = (await searchParams).from;
  const user = await pageUser(["student", "reviewer"]);
  if (!isUuid(id)) notFound();
  const ev = await orNotFound(getEvidence(user, id));
  const shares = ev.isOwner ? await listEvidenceShares(user, id) : [];
  const reviewer = user.role === "reviewer";
  // Opened from a case: lead back to it, but only if it is a case this person can open.
  const fromCase =
    !reviewer && typeof from === "string" && isUuid(from) && (await caseVersion(user, from).catch(() => null)) ? from : null;

  // Which cases the viewer may know about differs by role: a student sees their own
  // cases, a reviewer sees every case that is no longer a draft.
  let cases: React.ComponentProps<typeof CasesCard>;
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
  } else {
    cases = { evidenceId: id, reviewer, ...(await casesForEvidence(user, ev)), canAttach: ev.isOwner };
  }
  // Someone it was only shared with has nothing to see or do here unless it is in one of their cases.
  const showCases = reviewer || ev.isOwner || cases.attached.length > 0;

  return (
    <>
      <div>
        <Link
          href={fromCase ? `/cases/${fromCase}` : reviewer ? (ev.sharedWithMe ? "/review/shared" : "/review") : "/vault"}
          className="link inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          {fromCase
            ? "Back to the case"
            : reviewer
              ? ev.sharedWithMe
                ? "Back to Shared with me"
                : "Back to the Review Board"
              : "Back to your vault"}
        </Link>
      </div>
      <PageHeader
        title={ev.label}
        description={
          <>
            {kindLabel(ev.kind)} · Captured <span className="tnum">{formatDateTime(ev.capturedAt)}</span> ·{" "}
            {ev.isOwner
              ? "Only you can see this unless you share it."
              : `Captured by ${ev.owner?.name ?? "another student"}.`}
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 overflow-hidden bg-subtle p-4">
          <p className="mb-2 text-[13px] leading-[18px] text-muted">
            Captured content. This is a saved copy, shown in a frame that can&apos;t run scripts.
          </p>
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
            checks={ev.tamperReport.checks}
            notes={ev.tamperReport.warnings ?? []}
          />

          {ev.isOwner && (
            <Card className="flex flex-col gap-4">
              <h3>Sharing</h3>
              {shares.length === 0 ? (
                <p className="text-sm leading-[22px] text-muted">Only you have access.</p>
              ) : (
                <div>
                  <h4>Who has access</h4>
                  <ul className="mt-1 flex flex-col gap-1 text-sm leading-[22px]">
                    {shares.map((s) => (
                      <li key={s.email} className="break-words">
                        {s.name}
                        {s.role === "reviewer" ? " (reviewer)" : ""} <span className="text-muted">{s.email}</span>
                      </li>
                    ))}
                  </ul>
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
