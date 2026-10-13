import {
  ArrowUpRight,
  Bell,
  CircleCheck,
  Eye,
  FileCheck2,
  FolderX,
  Share2,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatDateTime, timeAgo } from "@/lib/format";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  caseId: string | null;
  evidenceId: string | null;
  readAt: Date | string | null;
  createdAt: Date | string;
};

type Tone = "attention" | "done" | "saved" | "plain";

const tones: Record<Tone, string> = {
  attention: "bg-escalated-bg text-escalated-fg",
  done: "bg-closed-bg text-closed-fg",
  saved: "bg-tamper-bg text-tamper-fg",
  plain: "bg-brand-100 text-brand-800",
};

// One place decides how each kind of notification looks, for the bell's popover and the page.
const kinds: Record<string, { Icon: LucideIcon; tone: Tone }> = {
  case_escalated: { Icon: ArrowUpRight, tone: "attention" },
  case_closed: { Icon: CircleCheck, tone: "done" },
  case_status_changed: { Icon: Eye, tone: "plain" },
  case_shared: { Icon: UserPlus, tone: "plain" },
  case_assigned: { Icon: UserPlus, tone: "attention" },
  case_unassigned: { Icon: UserMinus, tone: "plain" },
  evidence_shared: { Icon: Share2, tone: "plain" },
  collaborator_joined: { Icon: UserPlus, tone: "plain" },
  collaborator_left: { Icon: UserMinus, tone: "plain" },
  collaborator_removed: { Icon: UserMinus, tone: "plain" },
  case_deleted: { Icon: FolderX, tone: "done" },
  capture_saved: { Icon: FileCheck2, tone: "saved" },
};

/** Where a notification leads for this role, if anywhere. */
export function notificationHref(n: Pick<NotificationItem, "caseId" | "evidenceId">, role: string): string | null {
  if (n.caseId) return role === "student" ? `/cases/${n.caseId}` : `/review/${n.caseId}`;
  return n.evidenceId ? `/vault/${n.evidenceId}` : null;
}

/**
 * One notification: an icon circle, the title, when it happened and an unread
 * dot. `compact` is the popover's version; the page also shows the excerpt.
 */
export function NotificationRow({
  n,
  role,
  compact = false,
  onNavigate,
}: {
  n: NotificationItem;
  role: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { Icon, tone } = kinds[n.type] ?? { Icon: Bell, tone: "plain" as const };
  const unread = !n.readAt;
  const href = notificationHref(n, role);
  const className = cn(
    "grid grid-cols-[32px_minmax(0,1fr)_8px] gap-3",
    compact ? "px-4 py-3" : "px-[var(--card-pad)] py-4",
    unread && "bg-brand-50",
    href && "hover:bg-brand-50",
  );
  const content = (
    <>
      <span aria-hidden className={cn("grid size-8 place-items-center rounded-full", tones[tone])}>
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className={cn("block text-ink", compact ? "text-sm leading-5" : "leading-6", unread && !compact && "font-semibold")}>
          {n.title}
        </span>
        {!compact && n.body && <span className="block text-sm leading-[22px] text-muted">{n.body}</span>}
        <time
          dateTime={new Date(n.createdAt).toISOString()}
          title={formatDateTime(n.createdAt)}
          className="block text-[13px] leading-[18px] text-muted"
        >
          {timeAgo(n.createdAt)}
        </time>
      </span>
      {unread ? (
        <span className="mt-2 size-2 rounded-full bg-brand-700">
          <span className="sr-only">Unread</span>
        </span>
      ) : (
        <span />
      )}
    </>
  );
  return href ? (
    <Link href={href} className={className} onClick={onNavigate}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
