import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/safetrail/auth-form";
import { Card } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <Card className="flex flex-col gap-6">
      <div>
        <h1>Sign in</h1>
        <p className="mt-1 text-muted">Welcome back. Your vault is private to you.</p>
      </div>
      <Suspense fallback={null}>
        <AuthForm mode="sign-in" />
      </Suspense>
      <p className="text-sm text-muted">
        New to SafeTrail?{" "}
        <Link href="/sign-up" className="link">
          Create an account
        </Link>
      </p>
    </Card>
  );
}
