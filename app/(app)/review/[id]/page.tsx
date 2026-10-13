import { ArrowLeft, EyeOff, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bodyRow, headRow, rowLink, TableBox, td, th } from "@/components/dashboard/data-table";
import { PageCrumbs } from "@/components/safetrail/app-shell";
import { CloseCasePanel, StartReviewButton } from "@/components/safetrail/review-actions";
import { TamperCheck } from "@/components/safetrail/tamper-check";
import { Timeline } from "@/components/safetrail/timeline";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime, initials, kindLabel } from "@/lib/format";
import { isUuid, orNotFound, pageUser } from "@/server/page-auth";
import { getReviewCase } from "@/server/services/review";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

const panelTitle = "text-[17px] leading-6";

export default async function ReviewCasePage({ params }: PageProps<"/review/[id]">) {
  const { id } = await params;
  const user = await pageUser(["reviewer"]);
  if (!isUuid(id)) notFound();
  const c = await orNotFound(getReviewCase(user, id));
  const closed = c.status === "closed";
  const people = [
    { ...c.owner, role: "Reporter" },
    ...c.collaborators.map((p) => ({ ...p, role: "Collaborator" })),
  ];

  return (
    <>
      <PageCrumbs title={c.title} section={closed ? "/review/archives" : undefined} />
      <div>
        <Link href={closed ? "/review/archives" : "/review"} className="link inline-flex items-center gap-1 text-sm">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          {closed ? "Back to the Case Archives" : "Back to the Review Board"}
        </Link>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="break-words">{c.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-[22px] text-muted">
            <StatusBadge status={c.status} />
            {c.escalatedAt && <span className="tnum">Escalated {formatDateTime(c.escalatedAt)}</span>}
            <span className="inline-flex items-center gap-1">
              <Lock size={16} strokeWidth={1.75} aria-hidden />
              Locked by the student
            </span>
          </p>
        </div>
        {c.status === "escalated" && <StartReviewButton caseId={c.id} />}
      </header>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-[var(--section-gap)] [&>*]:min-w-0">
          <Card className="flex flex-col gap-2">
            <h2 className={panelTitle}>Description from the student</h2>
            <p className="max-w-[72ch] whitespace-pre-wrap">{c.description || "No description was added."}</p>
          </Card>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h2 className="text-[20px] leading-7">Reporter&apos;s evidence</h2>
              <span className="tnum text-[13px] leading-[18px] text-muted">
                {c.reporterEvidence.length} {c.reporterEvidence.length === 1 ? "item" : "items"} · attached by the
                student and collaborators
              </span>
            </div>
            <TableBox caption="Evidence attached by the student and collaborators" minWidth={640}>
              <thead>
                <tr className={headRow}>
                  <th scope="col" className={th}>
                    Evidence
                  </th>
                  <th scope="col" className={th}>
                    Added by
                  </th>
                  <th scope="col" className={th}>
                    Captured
                  </th>
                  <th scope="col" className={th}>
                    Tamper checks
                  </th>
                </tr>
              </thead>
              <tbody>
                {c.reporterEvidence.map((e) => (
                  <tr key={e.id} className={bodyRow}>
                    <td className={`${td} max-w-[280px]`}>
                      <Link href={`/vault/${e.id}`} className={`${rowLink} block truncate`} title={e.label}>
                        {e.label}
                      </Link>
                      <span className="block text-[13px] leading-[18px] text-muted">{kindLabel(e.kind)}</span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{e.ownerName}</td>
                    <td className={`${td} mono tnum whitespace-nowrap text-muted`}>{formatDateTime(e.capturedAt)}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      <TamperCheck reviewer />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableBox>
          </section>

          {/* Kept apart from the reporter's evidence, and never shown to them (I5). */}
          <section className="flex flex-col gap-4 rounded-xl border border-dashed border-border-strong bg-brand-50 p-[var(--card-pad)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[20px] leading-7">Added by reviewers</h2>
                <p className="mt-0.5 flex items-start gap-1.5 text-sm leading-[22px] text-muted">
                  <EyeOff size={16} strokeWidth={1.75} aria-hidden className="mt-[3px] shrink-0" />
                  Only reviewers can see this section. The student who reported and collaborators can&apos;t.
                </p>
              </div>
              {!closed && (
                <Link href="/review/shared" className={buttonClass("soft")}>
                  Attach shared evidence
                </Link>
              )}
            </div>
            {c.reviewerEvidence.length === 0 ? (
              <p className="text-sm leading-[22px] text-muted">No reviewer attachments yet.</p>
            ) : (
              <ul className="rounded-xl border border-border bg-card">
                {c.reviewerEvidence.map((e) => (
                  <li
                    key={e.id}
                    className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-b-0 focus-within:bg-brand-50 hover:bg-brand-50"
                  >
                    <div className="min-w-0">
                      <Link href={`/vault/${e.id}`} className={`${rowLink} block truncate text-sm`} title={e.label}>
                        {e.label}
                      </Link>
                      <span className="block text-[13px] leading-[18px] text-muted">
                        {kindLabel(e.kind)} · Shared by {e.ownerName} ({e.ownerEmail})
                      </span>
                    </div>
                    <TamperCheck reviewer />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className={panelTitle}>People</h2>
            <ul className="flex flex-col gap-3">
              {people.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[13px] leading-none font-bold text-brand-800"
                  >
                    {initials(p.name)}
                  </span>
                  <span className="min-w-0 text-sm leading-5">
                    <span className="block font-semibold">{p.name}</span>
                    <span className="block text-[13px] leading-[18px] break-all text-muted">
                      {p.role} · {p.email}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className={panelTitle}>Status history</h2>
            <Timeline events={c.events} />
          </Card>

          {closed ? (
            <Card className="flex flex-col gap-2">
              <h2 className={panelTitle}>Closing note</h2>
              <p className="whitespace-pre-wrap">{c.closingNote || "No note was recorded."}</p>
              {c.closedAt && (
                <p className="tnum text-[13px] leading-[18px] text-muted">Closed {formatDateTime(c.closedAt)}</p>
              )}
            </Card>
          ) : (
            <Card className="flex flex-col gap-3">
              <h2 className={panelTitle}>Close this case</h2>
              <CloseCasePanel caseId={c.id} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
