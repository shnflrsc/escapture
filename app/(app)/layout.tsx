import { Suspense } from "react";
import { AppShell } from "@/components/safetrail/app-shell";
import { PageSkeleton } from "@/components/ui/feedback";
import { pageUser } from "@/server/page-auth";
import { unreadCount } from "@/server/services/notifications";

// Every page here is per-user and reads the session, so navigations are allowed
// to wait for the server instead of being prerendered (see the Next.js
// "instant" route segment config).
export const instant = false;

// The session is request data, so the shell streams in behind Suspense.
async function Shell({ children }: { children: React.ReactNode }) {
  const user = await pageUser();
  const unread = await unreadCount(user);
  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} unread={unread}>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="p-4 lg:p-10 lg:pl-[288px]">
          <PageSkeleton />
        </div>
      }
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}
