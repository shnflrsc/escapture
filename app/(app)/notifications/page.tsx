import { Bell } from "lucide-react";
import Link from "next/link";
import { MarkAllRead } from "@/components/safetrail/notification-actions";
import { NotificationRow } from "@/components/safetrail/notification-row";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { dayKey } from "@/lib/format";
import { pageUser } from "@/server/page-auth";
import { listNotifications } from "@/server/services/notifications";

// Per-user page: allowed to wait for the server on navigation.
export const instant = false;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  const user = await pageUser();
  const unreadOnly = (await searchParams).tab === "unread";
  const { items, unreadCount } = await listNotifications(user);
  const shown = unreadOnly ? items.filter((n) => !n.readAt) : items;

  // Today, the rest of the last seven days, then everything older.
  const now = new Date();
  const today = dayKey(now);
  const groups = [
    { title: "Today", items: shown.filter((n) => dayKey(n.createdAt) === today) },
    {
      title: "Earlier this week",
      items: shown.filter(
        (n) => dayKey(n.createdAt) !== today && now.getTime() - new Date(n.createdAt).getTime() < WEEK_MS,
      ),
    },
    { title: "Earlier", items: shown.filter((n) => now.getTime() - new Date(n.createdAt).getTime() >= WEEK_MS) },
  ].filter((g) => g.items.length > 0);

  const tabs = [
    { key: "all", label: "All", href: "/notifications", count: items.length, active: !unreadOnly },
    { key: "unread", label: "Unread", href: "/notifications?tab=unread", count: unreadCount, active: unreadOnly },
  ];

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates about your cases and evidence people share with you. Notifications never show the contents of your evidence."
        action={unreadCount > 0 ? <MarkAllRead /> : undefined}
      />
      <div className="flex flex-col gap-4">
        <nav aria-label="Show" className="flex gap-2">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-md px-4 text-[15px] font-semibold whitespace-nowrap",
                t.active ? "bg-brand-100 text-brand-800" : "text-brand-700 hover:bg-brand-50",
              )}
            >
              {t.label}
              <span className="tnum text-[13px] font-semibold text-muted">
                {t.count}
                <span className="sr-only"> notifications</span>
              </span>
            </Link>
          ))}
        </nav>

        {items.length === 0 ? (
          <EmptyState icon={<Bell size={24} strokeWidth={1.75} />} title="No notifications yet">
            When something is shared with you or a case changes status, you will see it here.
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState icon={<Bell size={24} strokeWidth={1.75} />} title="You're all caught up">
            There is nothing unread. Everything you have been sent is under All.
          </EmptyState>
        ) : (
          groups.map((group) => (
            <section key={group.title} className="flex flex-col gap-2">
              <h2 className="text-[17px] leading-6">{group.title}</h2>
              <ul className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                {group.items.map((n) => (
                  <li key={n.id} className="border-b border-border last:border-b-0">
                    <NotificationRow n={n} role={user.role} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <p className="text-[13px] leading-[18px] text-muted">
          SafeTrail sends notifications in the app only. Nothing is sent by email or text.
        </p>
      </div>
    </>
  );
}
