import { Suspense } from "react";
import { AuthForm } from "@/components/safetrail/auth-form";
import { AuthShell } from "@/components/safetrail/auth-shell";
import { allowedEmailDomain } from "@/lib/email-domain";

export default function SignInPage() {
  const domain = allowedEmailDomain();
  return (
    <AuthShell illustration="sign-in">
      <h1>Sign in</h1>
      <Suspense fallback={null}>
        <AuthForm mode="sign-in" domain={domain} />
      </Suspense>
    </AuthShell>
  );
}
