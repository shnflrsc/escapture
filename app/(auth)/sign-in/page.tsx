import { Suspense } from "react";
import { AuthForm } from "@/components/safetrail/auth-form";
import { AuthShell } from "@/components/safetrail/auth-shell";
import { RedirectIfSignedIn } from "@/components/safetrail/redirect-if-signed-in";
import { allowedEmailDomain } from "@/lib/email-domain";

export default function SignInPage() {
  const domain = allowedEmailDomain();
  return (
    <AuthShell illustration="sign-in">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <h1>Sign in</h1>
      <Suspense fallback={null}>
        <AuthForm mode="sign-in" domain={domain} />
      </Suspense>
    </AuthShell>
  );
}
