import { PageCrumbs } from "@/components/safetrail/app-shell";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceList, EvidenceRow } from "@/components/safetrail/evidence-row";
import { ReviewerAttach, ReviewStatusControls } from "@/components/safetrail/review-actions";
import { Timeline } from "@/components/safetrail/timeline";
import { StatusBadge } from "@/components/ui/badge";
import { Card, PageHeader, Section } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { isUuid, orNotFound, pageUser } from "@/server/page-auth";
import { listEvidence } from "@/server/services/evidence";
import { getReviewCase } from "@/server/services/review";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function ReviewCasePage({ params }: PageProps<"/review/[id]">) {
  const { id } = await params;
  const user = await pageUser(["reviewer"]);
  if (!isUuid(id)) notFound();
  const c = await orNotFound(getReviewCase(user, id));
  const closed = c.status === "closed";
  const attachedIds = new Set([...c.reporterEvidence, ...c.reviewerEvidence].map((e) => e.id));
  const attachable = closed
    ? []
    : (await listEvidence(user, "shared"))
        .filter((e) => !attachedIds.has(e.id))
        .map((e) => ({ id: e.id, label: `${e.label} (shared by ${e.ownerName})` }));

  return (
    <>
      <PageCrumbs title={c.title} />
      <div>
        <Link href={closed ? "/review/archives" : "/review"} className="link inline-flex items-center gap-1 text-sm">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          {closed ? "Back to the Case Archives" : "Back to the Review Board"}
        </Link>
      </div>
      <PageHeader
        title={c.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            {c.escalatedAt && (
              <span className="tnum">Escalated {formatDateTime(c.escalatedAt)}</span>
            )}
          </span>
        }
        action={<ReviewStatusControls caseId={c.id} status={c.status} />}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6">
        <div className="flex min-w-0 flex-col gap-[var(--section-gap)]">
          <Section title="Description">
            <Card>
              <p className="max-w-prose whitespace-pre-wrap">{c.description || "No description was added."}</p>
            </Card>
          </Section>

          <Section
            title="Evidence from the reporter"
            description="Attached by the student who reported and their collaborators before escalation."
          >
            <EvidenceList>
              {c.reporterEvidence.map((e) => (
                <EvidenceRow key={e.id} item={e} reviewer note={`Captured by ${e.ownerName}`} />
              ))}
            </EvidenceList>
          </Section>

          <Section
            title="Added by reviewers"
            description="Evidence shared with reviewers and attached here. The reporter and collaborators never see this section."
          >
            {c.reviewerEvidence.length === 0 ? (
              <Card>
                <p className="text-sm leading-[22px] text-muted">No reviewer attachments yet.</p>
              </Card>
            ) : (
              <EvidenceList>
                {c.reviewerEvidence.map((e) => (
                  <EvidenceRow
                    key={e.id}
                    item={e}
                    reviewer
                    note={`Shared by ${e.ownerName} (${e.ownerEmail})`}
                  />
                ))}
              </EvidenceList>
            )}
            {!closed && <ReviewerAttach caseId={c.id} available={attachable} />}
          </Section>
        </div>

        <div className="flex flex-col gap-[var(--section-gap)]">
          <Section title="People">
            <Card>
              <ul className="flex flex-col gap-3 text-sm leading-[22px]">
                <li>
                  <span className="block font-semibold">{c.owner.name}</span>
                  <span className="block break-all text-muted">{c.owner.email}</span>
                  <span className="block text-muted">Reported this case</span>
                </li>
                {c.collaborators.map((p) => (
                  <li key={p.id}>
                    <span className="block font-semibold">{p.name}</span>
                    <span className="block break-all text-muted">{p.email}</span>
                    <span className="block text-muted">
                      Collaborator, added {p.via === "link" ? "with a link" : "by email"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </Section>
          <Section title="History">
            <Card>
              <Timeline events={c.events} />
            </Card>
          </Section>
        </div>
      </div>
    </>
  );
}
