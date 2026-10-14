import { Suspense } from "react";
import { AuthForm } from "@/components/safetrail/auth-form";
import { AuthShell } from "@/components/safetrail/auth-shell";
import { allowedEmailDomain } from "@/lib/email-domain";

export default function SignUpPage() {
  const domain = allowedEmailDomain();
  return (
    <AuthShell illustration="register">
      <h1>Create your account</h1>
      <Suspense fallback={null}>
        <AuthForm mode="sign-up" domain={domain} />
      </Suspense>
    </AuthShell>
  );
}
