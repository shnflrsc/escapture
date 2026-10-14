import { Suspense } from "react";
import { AuthForm } from "@/components/safetrail/auth-form";
import { AuthShell } from "@/components/safetrail/auth-shell";
import { RedirectIfSignedIn } from "@/components/safetrail/redirect-if-signed-in";
import { allowedEmailDomain } from "@/lib/email-domain";

export default function SignUpPage() {
  const domain = allowedEmailDomain();
  return (
    <AuthShell illustration="register">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <h1>Create your account</h1>
      <Suspense fallback={null}>
        <AuthForm mode="sign-up" domain={domain} />
      </Suspense>
    </AuthShell>
  );
}
