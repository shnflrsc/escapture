import Link from "next/link";
import { Suspense } from "react";
import { SetupForm } from "@/components/safetrail/setup-form";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { setupInfo } from "@/server/services/admin";

// A new reviewer opens the one-time link their administrator gave them and chooses a password.
async function Setup({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const account = await setupInfo(token);
  if (!account) {
    return (
      <>
        <h1>This setup link isn&apos;t valid</h1>
        <p className="text-muted">
          It may have been used already, or it is more than 7 days old. Ask your administrator for a new one.
        </p>
        <Link href="/sign-in" className="link">
          Go to sign in
        </Link>
      </>
    );
  }
  return (
    <>
      <div>
        <h1>Set up your reviewer account</h1>
        <p className="mt-1 text-muted">
          {account.name}, choose a password for {account.email}. You will sign in with it from now on.
        </p>
      </div>
      <SetupForm token={token} />
    </>
  );
}

export default function SetupPage({ params }: PageProps<"/setup/[token]">) {
  return (
    <Card className="flex flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <Setup params={params} />
      </Suspense>
    </Card>
  );
}
