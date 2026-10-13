import { Suspense } from "react";
import { AuthForm } from "@/components/safetrail/auth-form";
import { AuthShell } from "@/components/safetrail/auth-shell";

export default function SignInPage() {
  const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "bulsu.edu.ph";
  return (
    <AuthShell illustration="sign-in">
      <h1>Sign in</h1>
      <Suspense fallback={null}>
        <AuthForm mode="sign-in" domain={domain} />
      </Suspense>
    </AuthShell>
  );
}
