import { Suspense } from "react";
import { RedeemForm } from "@/components/safetrail/redeem-form";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { pageUser } from "@/server/page-auth";
import { linkMeta } from "@/server/services/links";

async function Redeem({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await pageUser();
  const meta = await linkMeta(token);
  if (!meta.valid) {
    return (
      <>
        <h1>This link isn&apos;t valid</h1>
        <p className="text-muted">It may have been mistyped. Ask the person who shared it to send it again.</p>
      </>
    );
  }
  const what = meta.resourceType === "case" ? "a case" : "a piece of evidence";
  return (
    <>
      <div>
        <h1>Open a shared link</h1>
        <p className="mt-1 text-muted">
          Someone shared {what} with you. Enter the password they gave you to open it.
        </p>
      </div>
      <RedeemForm token={token} />
    </>
  );
}

export default function SharedLinkPage({ params }: PageProps<"/s/[token]">) {
  return (
    <Card className="flex flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <Redeem params={params} />
      </Suspense>
    </Card>
  );
}
