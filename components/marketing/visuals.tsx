import { CircleCheck, FileCheck2, Inbox, Lock, X } from "lucide-react";
import { TamperCheck } from "@/components/safetrail/tamper-check";
import { StatusBadge, type CaseStatus } from "@/components/ui/badge";
import { MockButton, ProductFrame } from "./blocks";

// Pictures of the product for the landing page. Everything here is sample
// content inside a ProductFrame or an image role: nothing is interactive.

const Row = ({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) => (
  <div className="mk-mock-row">
    <div>
      <b>{title}</b>
      <span className="mk-m tnum">{meta}</span>
    </div>
    {children}
  </div>
);

export function VaultVisual() {
  return (
    <ProductFrame url="safetrail.app/vault" label="The SafeTrail vault, showing three saved captures">
      <div className="mk-mock">
        <div className="mk-mock-head">
          <p className="mk-h3">Your vault</p>
          <MockButton>
            <FileCheck2 size={18} strokeWidth={1.75} />
            Capture evidence
          </MockButton>
        </div>
        <Row title="Group chat, 3 Oct" meta="Messenger · 42 messages">
          <TamperCheck />
        </Row>
        <Row title="Comments on my post" meta="Facebook post · 18 comments">
          <TamperCheck />
        </Row>
        <Row title="Shared photo thread" meta="Facebook post · 6 comments">
          <TamperCheck />
        </Row>
      </div>
    </ProductFrame>
  );
}

export function ExtensionVisual() {
  return (
    <ProductFrame url="Escrow Capture extension" label="The Escrow Capture extension after saving a capture">
      <div className="mk-popup-wrap">
        <div className="mk-popup">
          <div className="flex items-center justify-between">
            <span className="font-heading text-[18px] leading-6 font-semibold">SafeTrail</span>
            <span className="text-[13px] leading-[18px] text-muted">Signed in as you</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[15px] leading-[22px] font-semibold">Comments on my post</span>
            <span className="text-[13px] leading-[18px] text-muted">Facebook post · 18 comments loaded</span>
          </div>
          <TamperCheck time="13 Oct 2026, 7:42 PM" />
          <div className="flex items-start gap-3 rounded-xl bg-tamper-bg p-4 text-[15px] leading-6 text-tamper-fg">
            <CircleCheck size={20} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            <p>
              Saved to your vault. <span className="font-semibold underline">Open in vault</span>
            </p>
          </div>
          <MockButton variant="secondary" className="w-full">
            Capture another page
          </MockButton>
        </div>
        <span className="mk-toast">Saved to your vault</span>
      </div>
    </ProductFrame>
  );
}

export function SharingVisual() {
  return (
    <ProductFrame url="safetrail.app/cases/comments-on-my-post" label="A case shared with one person through a password-protected link">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl bg-brand-100 p-4 text-[15px] leading-6 text-brand-800">
          <Lock size={20} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <p>Only you can see your vault. Nothing reaches reviewers until you escalate.</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-soft">
          <p className="mk-h3">Comments on my post</p>
          <p className="text-sm leading-[22px] text-muted">3 captures · Shared with 1 person</p>
          <div className="mt-2 flex flex-col gap-3">
            <TamperCheck time="3 Oct 2026, 8:12 PM" />
            <div className="mk-hash">
              <code>sha256 9f2c4e81a07bd3c5e6f1029a8c4d7be3015f6a92c8e4d1b07a3f5c9e2d6b8a41</code>
              <MockButton variant="ghost" className="h-8 px-2.5 text-[13px]">
                Copy
              </MockButton>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-subtle py-2 pr-2 pl-3">
              <span className="flex items-center gap-2 text-sm leading-5 font-semibold">
                <Lock size={16} strokeWidth={1.75} />
                Ana R. · password-protected link
              </span>
              <MockButton variant="ghost">
                <X size={18} strokeWidth={1.75} />
                Remove access
              </MockButton>
            </div>
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

/** The escalation dialog, drawn open and inline with no overlay. */
export function EscalateVisual() {
  return (
    <div className="mk-dialog" role="img" aria-label="The escalation preview: review what reviewers will see before you send it">
      <div aria-hidden className="contents">
        <p className="mk-h3">Review what reviewers will see</p>
        <p className="text-muted">This is everything reviewers will receive when you escalate.</p>
        <div className="flex flex-col gap-2">
          <Row title="Comments on my post" meta="Facebook post · 18 comments">
            <FileCheck2 size={20} strokeWidth={1.75} className="text-tamper-fg" />
          </Row>
          <Row title="Group chat, 3 Oct" meta="Messenger · 42 messages">
            <FileCheck2 size={20} strokeWidth={1.75} className="text-tamper-fg" />
          </Row>
        </div>
        <div className="mk-note-panel">
          Once you escalate, this case is locked. You can&apos;t edit or withdraw it, and attached evidence can&apos;t be
          deleted.
        </div>
        <div className="mk-dialog-actions">
          <MockButton variant="ghost">Go back</MockButton>
          <MockButton variant="weighty">Escalate to reviewers</MockButton>
        </div>
      </div>
    </div>
  );
}

const board: [string, string, CaseStatus][] = [
  ["Comments on my post", "Escalated 8 Oct 2026", "escalated"],
  ["Group chat, 3 Oct", "Escalated 5 Oct 2026", "under_review"],
  ["Edited photo caption", "Escalated 22 Sep 2026", "closed"],
];

export function ReviewBoardVisual() {
  return (
    <ProductFrame url="safetrail.app/review" label="The Review Board, listing three cases with their statuses">
      <div className="mk-mock">
        <div className="mk-mock-head">
          <p className="mk-h3">Review Board</p>
          <span className="text-[13px] leading-[18px] text-muted">3 cases</span>
        </div>
        {board.map(([title, meta, status]) => (
          <Row key={title} title={title} meta={meta}>
            <StatusBadge status={status} />
          </Row>
        ))}
        <TamperCheck reviewer time="3 Oct 2026, 8:12 PM" />
      </div>
    </ProductFrame>
  );
}

export function EmptyVaultVisual() {
  return (
    <ProductFrame url="safetrail.app/vault" label="A new, empty vault">
      <div className="mx-auto flex max-w-[480px] flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="mk-icon-circle">
          <Inbox size={28} strokeWidth={1.75} />
        </div>
        <p className="mk-h3">Your vault is ready</p>
        <p className="text-muted">
          When you capture a post or conversation, it appears here with its tamper checks and capture time.
        </p>
        <MockButton variant="soft" className="mt-2">
          Install Escrow Capture
        </MockButton>
      </div>
    </ProductFrame>
  );
}
