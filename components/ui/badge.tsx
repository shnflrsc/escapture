import { CircleCheck, CircleDot, FileCheck2, Lock, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "escalated" | "review" | "closed" | "tamper" | "neutral";

const tones: Record<Tone, string> = {
  escalated: "bg-escalated-bg text-escalated-fg",
  review: "bg-review-bg text-review-fg",
  closed: "bg-closed-bg text-closed-fg",
  tamper: "bg-tamper-bg text-tamper-fg",
  neutral: "bg-subtle text-muted",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] leading-5 font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export type CaseStatus = "draft" | "escalated" | "under_review" | "closed";

const statusMeta: Record<CaseStatus, { tone: Tone; label: string; Icon: typeof Lock }> = {
  draft: { tone: "neutral", label: "Draft, private", Icon: Pencil },
  escalated: { tone: "escalated", label: "Escalated", Icon: CircleDot },
  under_review: { tone: "review", label: "Under review", Icon: CircleDot },
  closed: { tone: "closed", label: "Closed", Icon: CircleCheck },
};

export const statusLabel = (s: CaseStatus) => statusMeta[s].label;

/** The one place case statuses are styled. Color, icon and text together. */
export function StatusBadge({ status }: { status: CaseStatus }) {
  const { tone, label, Icon } = statusMeta[status];
  return (
    <Badge tone={tone} icon={<Icon size={14} strokeWidth={1.75} aria-hidden />}>
      {label}
    </Badge>
  );
}

/** Wording is fixed: never "verified", "authentic" or "tamper-proof". */
export function TamperBadge({ reviewer = false }: { reviewer?: boolean }) {
  return (
    <Badge tone="tamper" icon={<FileCheck2 size={14} strokeWidth={1.75} aria-hidden />}>
      {reviewer ? "Passed tamper checks" : "Captured with tamper checks"}
    </Badge>
  );
}
