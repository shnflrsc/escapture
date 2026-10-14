import { PageCrumbs } from "@/components/safetrail/app-shell";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseMenu, EscalateButton, RemovePersonButton } from "@/components/safetrail/case-actions";
import { CaseEvidenceTable } from "@/components/safetrail/case-evidence-table";
import { EvidenceRecord } from "@/components/safetrail/evidence-record";
import { LinkList } from "@/components/safetrail/sharing-lists";
import { CaseField, CaseLive } from "@/components/safetrail/case-fields";
import { EvidencePicker } from "@/components/safetrail/evidence-picker";
import { EmailShareButton, LinkShareButton } from "@/components/safetrail/share-dialogs";
import { Timeline } from "@/components/safetrail/timeline";
import { StatusBadge } from "@/components/ui/badge";
import { Card, Section } from "@/components/ui/card";
import { Banner } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/format";
import { isUuid, orNotFound, pageUser } from "@/server/page-auth";
import { getCase } from "@/server/services/cases";
import { listEvidence } from "@/server/services/evidence";
import { listCaseLinks } from "@/server/services/links";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function CasePage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const user = await pageUser(["student"]);
  if (!isUuid(id)) notFound();
  const c = await orNotFound(getCase(user, id));
  const draft = c.status === "draft";
  const owner = c.role === "owner";
  const attached = new Set(c.evidence.map((e) => e.id));
  const vault = draft ? await listEvidence(user, "mine") : [];
  const links = owner ? await listCaseLinks(user, c.id) : [];

  const description = (
    // On a draft the card is the text box: no padding of its own, and it carries the focus ring.
    <Card
      className={
        draft
          ? "p-0! has-[textarea:focus-visible]:border-border-strong has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-brand-700"
          : undefined
      }
    >
      {draft ? (
        <CaseField caseId={c.id} field="description" value={c.description} />
      ) : (
        <p className="max-w-prose whitespace-pre-wrap">{c.description || "No description was added."}</p>
      )}
    </Card>
  );
  const evidence = (
    <Section
      title="Evidence"
      action={
        draft ? (
          <EvidencePicker
            caseId={c.id}
            vaultEmpty={vault.length === 0}
            available={vault
              .filter((e) => !attached.has(e.id))
              .map((e) => ({ id: e.id, label: e.label, kind: e.kind, capturedAt: e.capturedAt }))}
          />
        ) : undefined
      }
    >
      {c.record ? (
        c.record.length === 0 ? (
          <Card>
            <p className="text-sm leading-[22px] text-muted">No evidence was attached.</p>
          </Card>
        ) : (
          // The record of what was attached. An item its owner has since deleted has no page to open.
          <EvidenceRecord
            caption="Evidence in this case, as recorded when it closed"
            items={c.record}
            hrefFor={(e) => `/vault/${e.evidenceId}?from=${c.id}`}
          />
        )
      ) : c.evidence.length === 0 ? (
        <Card>
          <p className="text-sm leading-[22px] text-muted">No evidence has been added yet.</p>
        </Card>
      ) : (
        <CaseEvidenceTable
          caseId={c.id}
          items={c.evidence.map((e) => ({
            id: e.id,
            label: e.label,
            kind: e.kind,
            capturedAt: e.capturedAt,
            addedBy: e.ownerId === user.id ? "you" : e.ownerName,
            canRemove: draft && (owner || e.attachedBy === user.id),
          }))}
        />
      )}
    </Section>
  );
  const people = (
    <Section title="People on this case">
      <Card className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2 text-sm leading-[22px]">
          <li>
            <span className="font-semibold">{c.owner.name}</span>{" "}
            <span className="text-muted">{c.owner.email} · Reported this case</span>
          </li>
          {c.collaborators.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3">
              <span className="min-w-0 break-words">
                <span className="font-semibold">{p.name}</span>{" "}
                <span className="text-muted">
                  {p.email} · Added {p.via === "link" ? "with a link" : "by email"}
                </span>
              </span>
              {draft && owner && <RemovePersonButton caseId={c.id} userId={p.id} name={p.name} />}
            </li>
          ))}
        </ul>
        {draft && owner && (
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <EmailShareButton
              endpoint={`/api/cases/${c.id}/collaborators`}
              buttonLabel="Add someone by email"
              title="Add someone to this case"
              risk="You are choosing to share this case. The person you add will see the case and its evidence, can edit the details and can add their own evidence. Reviewers will see their name and email. You can remove them while the case is a draft."
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
        {links.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <h3 className="text-sm leading-5 font-semibold">Password links</h3>
            <LinkList endpoint={`/api/cases/${c.id}/links`} links={links} />
          </div>
        )}
      </Card>
    </Section>
  );

  return (
    <>
      <PageCrumbs title={c.title} />
      {draft && <CaseLive caseId={c.id} updatedAt={c.updatedAt.toISOString()} />}
      <div>
        <Link href="/cases" className="link inline-flex items-center gap-1 text-sm">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          Back to cases
        </Link>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-[320px] flex-col gap-1">
          {draft ? (
            <>
              {/* The title is a field on a draft; the page still needs a heading. */}
              <h1 className="sr-only">{c.title}</h1>
              <CaseField caseId={c.id} field="title" value={c.title} />
            </>
          ) : (
            <h1 className="break-words">{c.title}</h1>
          )}
          <p className="flex flex-wrap items-center gap-2 text-muted">
            <StatusBadge status={c.status} />
            {!owner && `Case by ${c.owner.name}`}
          </p>
        </div>
        {draft && (
          <div className="flex shrink-0 items-center gap-2">
            {owner && <EscalateButton caseId={c.id} hasEvidence={c.evidence.length > 0} />}
            <CaseMenu caseId={c.id} title={c.title} ownerName={c.owner.name} role={owner ? "owner" : "collaborator"} />
          </div>
        )}
      </header>

      {!draft && c.escalatedAt && (
        <Banner tone="info">
          <span className="inline-flex items-center gap-1 font-semibold">
            <Lock size={16} strokeWidth={1.75} aria-hidden />
            Locked since <span className="tnum">{formatDateTime(c.escalatedAt)}</span>.
          </span>{" "}
          Reviewers and administrators can see this case. It can&apos;t be edited or withdrawn, and its evidence can&apos;t be deleted.
        </Banner>
      )}
      {draft && !owner && (
        <Banner tone="info">
          {c.owner.name} added you to this case. You can edit the details and add your own evidence. Only{" "}
          {c.owner.name} can escalate it.
        </Banner>
      )}

      {draft ? (
        <>
          {description}
          {evidence}
          {people}
        </>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-[var(--section-gap)] [&>*]:min-w-0">
            {c.status === "closed" && (
              <Card className="flex flex-col gap-2">
                <h2 className="text-[20px] leading-7">Closing note from the reviewer</h2>
                <p className="max-w-prose whitespace-pre-wrap">{c.closingNote || "No note was recorded."}</p>
                {c.closedAt && (
                  <p className="tnum text-[13px] leading-[18px] text-muted">Closed {formatDateTime(c.closedAt)}</p>
                )}
              </Card>
            )}
            <Section title="What you escalated">{description}</Section>
            {evidence}
            {people}
          </div>
          <Section title="Status">
            <Card>
              {/* The note has its own card above when the case is closed. */}
              <Timeline events={c.events.map((e) => ({ ...e, note: null }))} />
            </Card>
          </Section>
        </div>
      )}
    </>
  );
}
