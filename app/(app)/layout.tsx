import { Suspense } from "react";
import { AppShell } from "@/components/safetrail/app-shell";
import { PageSkeleton } from "@/components/ui/feedback";
import { pageUser } from "@/server/page-auth";
import { unreadCount } from "@/server/services/notifications";

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
        <div className="p-10 pl-[288px]">
          <PageSkeleton />
        </div>
      }
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}
