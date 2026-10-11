import { Bell } from "lucide-react";
import { MarkAllRead } from "@/components/safetrail/notification-actions";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listNotifications } from "@/server/services/notifications";
import Link from "next/link";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

export default async function NotificationsPage() {
  const user = await pageUser();
  const { items, unreadCount } = await listNotifications(user);
  const hrefFor = (n: (typeof items)[number]) =>
    n.caseId
      ? user.role === "reviewer"
        ? `/review/${n.caseId}`
        : `/cases/${n.caseId}`
      : n.evidenceId
        ? `/vault/${n.evidenceId}`
        : null;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates about your evidence and cases. SafeTrail doesn't send emails or texts."
        action={unreadCount > 0 ? <MarkAllRead /> : undefined}
      />
      {items.length === 0 ? (
        <EmptyState icon={<Bell size={24} strokeWidth={1.75} />} title="No notifications yet">
          When something is shared with you or a case changes status, you will see it here.
        </EmptyState>
      ) : (
        <ul className="rounded-xl border border-border bg-card shadow-soft">
          {items.map((n) => {
            const href = hrefFor(n);
            const body = (
              <>
                <span
                  className={cn("mt-2 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-brand-700")}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block", !n.readAt && "font-semibold")}>
                    {n.title}
                    {!n.readAt && <span className="sr-only"> (unread)</span>}
                  </span>
                  {n.body && <span className="block text-sm leading-[22px] text-muted">{n.body}</span>}
                </span>
                <span className="tnum shrink-0 text-[13px] leading-[18px] text-muted">
                  {formatDateTime(n.createdAt)}
                </span>
              </>
            );
            return (
              <li key={n.id} className="border-b border-border last:border-b-0">
                {href ? (
                  <Link href={href} className="flex items-start gap-3 px-[var(--card-pad)] py-4 hover:bg-brand-50">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-[var(--card-pad)] py-4">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
