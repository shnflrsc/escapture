import Link from "next/link";
import { StatusBadge, TamperBadge, type CaseStatus } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { formatDateTime } from "@/lib/format";
import { AttachToCase } from "./attach-to-case";
import { VerifyNow } from "./evidence-actions";

const CHECK_LABELS: Record<string, string> = {
  "design-mode": "Page editing mode was off",
  contenteditable: "No editable content in the captured area",
  "userscript-markers": "No userscript manager detected",
  "injected-elements": "No injected scripts or styles in the captured area",
  "dom-provenance": "No changes to the captured area from outside the page's own scripts",
};

type AttachedCase = { id: string; title: string; status: CaseStatus; side?: "reporter" | "reviewer" };

/** The cases this evidence is in, as far as the viewer is allowed to know, and a way to add it to one. */
export function CasesCard({
  evidenceId,
  reviewer,
  attached,
  available,
  canAttach,
}: {
  evidenceId: string;
  reviewer: boolean;
  attached: AttachedCase[];
  /** Cases it could be added to: the owner's drafts, or for a reviewer the open cases. */
  available: { id: string; title: string; reporterName?: string }[];
  canAttach: boolean;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <h3>Cases</h3>
      {attached.length === 0 ? (
        <p className="text-sm leading-[22px] text-muted">
          {reviewer ? "Not attached to any case yet." : "Not in a case yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3 text-sm leading-[22px]">
          {attached.map((c) => (
            <li key={c.id} className="flex flex-col items-start gap-1">
              <Link href={reviewer ? `/review/${c.id}` : `/cases/${c.id}`} className="link break-words">
                {c.title}
              </Link>
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge status={c.status} />
                {reviewer && (
                  <span className="text-muted">{c.side === "reviewer" ? "Added by reviewers" : "From the reporter"}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canAttach ? (
        <AttachToCase evidenceId={evidenceId} cases={available} as={reviewer ? "reviewer" : "owner"} />
      ) : (
        reviewer && (
          <p className="text-[13px] leading-[18px] text-muted">
            You can attach evidence to other cases only when it has been shared with you directly.
          </p>
        )
      )}
    </Card>
  );
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Notes are written by the extension and stored with the capture. Two of the older
 * wordings could be read as a sign of tampering, so they are shown as the current
 * extension would word them. Anything else is shown as stored.
 */
function clearNote(note: string): string {
  const elsewhere = /^(\d+) changes? elsewhere on this page did not come from the page's own scripts\./.exec(note);
  if (elsewhere) {
    const n = Number(elsewhere[1]);
    return `${count(n, "change", "changes")} outside the captured area ${n === 1 ? "was" : "were"} made by something other than the page, such as a browser extension. The captured area was not affected.`;
  }
  const replaced = /^Some of the browser's functions for changing content had been replaced on this page \((.*)\)\./.exec(note);
  if (replaced) {
    return `The page or a browser extension had replaced built-in browser functions (${replaced[1]}). The captured area was still checked.`;
  }
  return note;
}

/**
 * What stands behind the capture. The badge, a one-line summary and the
 * re-check stay in view; the hash, source, checks and notes open on request.
 */
export function IntegrityCard({
  evidenceId,
  reviewer,
  capturedAt,
  sourceUrl,
  sha256,
  checks,
  notes,
}: {
  evidenceId: string;
  reviewer: boolean;
  capturedAt: Date | string;
  sourceUrl: string;
  sha256: string;
  checks: { id: string }[];
  notes: string[];
}) {
  const unique = [...new Set(notes.map(clearNote))];
  return (
    <Card className="flex flex-col gap-4">
      <h3>Integrity</h3>
      <div className="flex flex-col items-start gap-2">
        <TamperBadge reviewer={reviewer} />
        <p className="text-sm leading-[22px] text-muted">
          {count(checks.length, "check", "checks")} passed at capture
          {unique.length > 0 && <> · {count(unique.length, "note", "notes")}</>}
        </p>
      </div>
      <VerifyNow evidenceId={evidenceId} />
      {/* Open from the start for reviewers, who assess the evidence; one click away for students. */}
      <details open={reviewer} className="border-t border-border pt-3 text-sm leading-[22px]">
        <summary className="link cursor-pointer">Details</summary>
        <dl className="mt-3 flex flex-col gap-3">
          <div>
            <dt className="font-semibold">What this means</dt>
            <dd className="text-muted">
              This capture passed the extension&apos;s checks when it was taken, and the saved file hasn&apos;t changed
              since. It does not prove the capture is complete, or that the page itself was not altered before it was
              captured.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Capture time (server)</dt>
            <dd className="tnum text-muted">{formatDateTime(capturedAt)} (Manila time)</dd>
          </div>
          <div>
            <dt className="font-semibold">Source</dt>
            <dd className="break-all text-muted">{sourceUrl}</dd>
          </div>
          <div>
            <dt className="font-semibold">SHA-256 of the saved file</dt>
            <dd className="mt-1 rounded-md bg-subtle p-2">
              <code className="mono block break-all">{sha256}</code>
              <CopyButton value={sha256} label="Copy hash" />
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Checks run at capture</dt>
            <dd>
              <ul className="list-disc pl-5 text-muted">
                {checks.map((c) => (
                  <li key={c.id}>{CHECK_LABELS[c.id] ?? c.id}</li>
                ))}
              </ul>
            </dd>
          </div>
          {unique.length > 0 && (
            <div>
              <dt className="font-semibold">Notes from the capture</dt>
              <dd>
                <ul className="list-disc pl-5 text-muted">
                  {unique.map((note) => (
                    <li key={note} className="break-words">
                      {note}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      </details>
    </Card>
  );
}
