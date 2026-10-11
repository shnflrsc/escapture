import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AttachEvidence,
  CaseDetailsForm,
  DetachButton,
  EscalateButton,
} from "@/components/safetrail/case-actions";
import { EvidenceList, EvidenceRow } from "@/components/safetrail/evidence-row";
import { EmailShareButton, LinkShareButton } from "@/components/safetrail/share-dialogs";
import { Timeline } from "@/components/safetrail/timeline";
import { StatusBadge } from "@/components/ui/badge";
import { Card, PageHeader, Section } from "@/components/ui/card";
import { Banner } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/format";
import { isUuid, orNotFound, pageUser } from "@/server/page-auth";
import { getCase } from "@/server/services/cases";
import { listEvidence } from "@/server/services/evidence";

export default async function CasePage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const user = await pageUser(["student"]);
  if (!isUuid(id)) notFound();
  const c = await orNotFound(getCase(user, id));
  const draft = c.status === "draft";
  const owner = c.role === "owner";
  const attached = new Set(c.evidence.map((e) => e.id));
  const available = draft ? (await listEvidence(user, "mine")).filter((e) => !attached.has(e.id)) : [];

  return (
    <>
      <div>
        <Link href="/cases" className="link inline-flex items-center gap-1 text-sm">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          Back to cases
        </Link>
      </div>
      <PageHeader
        title={c.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            {draft
              ? "Only you and the people you add can see this draft."
              : owner
                ? "Your case"
                : `Case by ${c.owner.name}`}
          </span>
        }
        action={
          draft && owner ? (
            <EscalateButton caseId={c.id} disabled={c.evidence.length === 0} />
          ) : undefined
        }
      />

      {!draft && c.escalatedAt && (
        <Banner tone="info">
          <span className="inline-flex items-center gap-1 font-semibold">
            <Lock size={16} strokeWidth={1.75} aria-hidden />
            Locked since <span className="tnum">{formatDateTime(c.escalatedAt)}</span>.
          </span>{" "}
          Reviewers can see this case. It can&apos;t be edited or withdrawn, and its evidence can&apos;t be deleted.
        </Banner>
      )}
      {draft && owner && c.evidence.length === 0 && (
        <Banner tone="info">Add at least one piece of evidence before you can escalate this case.</Banner>
      )}
      {draft && !owner && (
        <Banner tone="info">
          {c.owner.name} added you to this case. You can edit the details and add your own evidence. Only{" "}
          {c.owner.name} can escalate it.
        </Banner>
      )}

      <Section title="What happened">
        <Card>
          {draft ? (
            <CaseDetailsForm caseId={c.id} title={c.title} description={c.description} />
          ) : (
            <p className="max-w-prose whitespace-pre-wrap">{c.description || "No description was added."}</p>
          )}
        </Card>
      </Section>

      <Section
        title="Evidence"
        description={
          draft
            ? "You can add evidence from your own vault. Reviewers will see only what is listed here."
            : "This is the evidence reviewers can see."
        }
      >
        {c.evidence.length === 0 ? (
          <Card>
            <p className="text-sm leading-[22px] text-muted">No evidence has been added yet.</p>
          </Card>
        ) : (
          <EvidenceList>
            {c.evidence.map((e) => (
              <EvidenceRow
                key={e.id}
                item={e}
                note={`Added by ${e.ownerId === user.id ? "you" : e.ownerName}`}
                action={
                  draft && (owner || e.attachedBy === user.id) ? (
                    <DetachButton caseId={c.id} evidenceId={e.id} />
                  ) : undefined
                }
              />
            ))}
          </EvidenceList>
        )}
        {draft && <AttachEvidence caseId={c.id} available={available.map((e) => ({ id: e.id, label: e.label }))} />}
      </Section>

      <Section
        title="People on this case"
        description="Reviewers will see the name and email of everyone listed here."
      >
        <Card className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2 text-sm leading-[22px]">
            <li>
              <span className="font-semibold">{c.owner.name}</span>{" "}
              <span className="text-muted">{c.owner.email} · Reported this case</span>
            </li>
            {c.collaborators.map((p) => (
              <li key={p.id}>
                <span className="font-semibold">{p.name}</span>{" "}
                <span className="text-muted">
                  {p.email} · Added {p.via === "link" ? "with a link" : "by email"}
                </span>
              </li>
            ))}
          </ul>
          {draft && owner && (
            <div className="flex flex-wrap gap-3 border-t border-border pt-4">
              <EmailShareButton
                endpoint={`/api/cases/${c.id}/collaborators`}
                buttonLabel="Add someone by email"
                title="Add someone to this case"
                risk="You are choosing to share this case. The person you add will see the case and its evidence, can edit the details and can add their own evidence. Reviewers will see their name and email. This can't be undone in this version of SafeTrail."
                confirmLabel="I understand, add them"
                successText="They have been added to the case."
              />
              <LinkShareButton
                endpoint={`/api/cases/${c.id}/links`}
                title="Create a password link to this case"
                risk="Any student who has this link, its password and a SafeTrail account can join this case, see its evidence and add their own. Reviewers will see their name and email."
              />
            </div>
          )}
        </Card>
      </Section>

      {!draft && (
        <Section title="Status" description="Updates from the reviewers appear here.">
          <Card>
            <Timeline events={c.events} />
          </Card>
        </Section>
      )}
    </>
  );
}
