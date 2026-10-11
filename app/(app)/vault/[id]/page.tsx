import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceOwnerActions, VerifyNow } from "@/components/safetrail/evidence-actions";
import { TamperBadge } from "@/components/ui/badge";
import { Card, PageHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { formatDateTime, kindLabel } from "@/lib/format";
import { isUuid, orNotFound, pageUser } from "@/server/page-auth";
import { getEvidence } from "@/server/services/evidence";
import { listEvidenceShares } from "@/server/services/shares";

const CHECK_LABELS: Record<string, string> = {
  "design-mode": "Page editing mode was off",
  contenteditable: "No editable content in the captured area",
  "userscript-markers": "No userscript manager detected",
  "injected-elements": "No injected scripts or styles in the captured area",
};

export default async function EvidencePage({ params }: PageProps<"/vault/[id]">) {
  const { id } = await params;
  const user = await pageUser(["student", "reviewer"]);
  if (!isUuid(id)) notFound();
  const ev = await orNotFound(getEvidence(user, id));
  const shares = ev.isOwner ? await listEvidenceShares(user, id) : [];
  const reviewer = user.role === "reviewer";

  return (
    <>
      <div>
        <Link href={reviewer ? "/review" : "/vault"} className="link inline-flex items-center gap-1 text-sm">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          {reviewer ? "Back to the Review Board" : "Back to your vault"}
        </Link>
      </div>
      <PageHeader
        title={ev.label}
        description={
          ev.isOwner
            ? `${kindLabel(ev.kind)}. Only you can see this unless you share it.`
            : `${kindLabel(ev.kind)}. Captured by ${ev.owner?.name ?? "another student"}.`
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3 text-sm text-muted">
            <span>
              Captured <span className="tnum">{formatDateTime(ev.capturedAt)}</span>
            </span>
            <span className="mono break-all">SHA-256 {ev.sha256.slice(0, 16)}…</span>
          </div>
          <div className="bg-subtle p-4">
            <p className="mb-2 text-[13px] leading-[18px] text-muted">
              Captured content. This is a saved copy, shown in a frame that can&apos;t run scripts.
            </p>
            {/* Untrusted HTML (I8): script-less sandbox, served with a sandbox CSP. */}
            <iframe
              sandbox=""
              src={`/api/evidence/${ev.id}/file`}
              title={`Captured content: ${ev.label}`}
              referrerPolicy="no-referrer"
              className="h-[640px] w-full rounded-md border border-border bg-white"
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col items-start gap-2">
              <TamperBadge reviewer={reviewer} />
              <details className="text-sm leading-[22px] text-muted">
                <summary className="link cursor-pointer">What this means</summary>
                <p className="mt-2">
                  This capture passed the extension&apos;s checks when it was taken, and the saved file hasn&apos;t
                  changed since. It does not prove the capture is complete, or that the page itself was not altered
                  before it was captured.
                </p>
              </details>
            </div>
            <dl className="flex flex-col gap-3 text-sm leading-[22px]">
              <div>
                <dt className="font-semibold">Capture time (server)</dt>
                <dd className="tnum text-muted">{formatDateTime(ev.capturedAt)} (Manila time)</dd>
              </div>
              <div>
                <dt className="font-semibold">Source</dt>
                <dd className="break-all text-muted">{ev.sourceUrl}</dd>
              </div>
              <div>
                <dt className="font-semibold">SHA-256 of the saved file</dt>
                <dd className="mt-1 rounded-md bg-subtle p-2">
                  <code className="mono block break-all">{ev.sha256}</code>
                  <CopyButton value={ev.sha256} label="Copy hash" />
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Checks run at capture</dt>
                <dd>
                  <ul className="list-disc pl-5 text-muted">
                    {ev.tamperReport.checks.map((c) => (
                      <li key={c.id}>{CHECK_LABELS[c.id] ?? c.id}</li>
                    ))}
                  </ul>
                  {ev.tamperReport.warnings?.map((w) => (
                    <p key={w} className="mt-1 text-[13px] leading-[18px] text-muted">
                      Note: {w}
                    </p>
                  ))}
                </dd>
              </div>
            </dl>
            <VerifyNow evidenceId={ev.id} />
          </Card>

          {ev.isOwner && (
            <Card className="flex flex-col gap-4">
              <h3>Sharing and changes</h3>
              <EvidenceOwnerActions evidenceId={ev.id} label={ev.label} locked={ev.locked} />
              <div>
                <h4>Who has access</h4>
                {shares.length === 0 ? (
                  <p className="text-sm leading-[22px] text-muted">Only you.</p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-1 text-sm leading-[22px]">
                    {shares.map((s) => (
                      <li key={s.email}>
                        {s.name}
                        {s.role === "reviewer" ? " (reviewer)" : ""}{" "}
                        <span className="text-muted">{s.email}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
