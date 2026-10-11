import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/safetrail/auth-form";
import { Card } from "@/components/ui/card";

export default function SignUpPage() {
  const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "bulsu.edu.ph";
  return (
    <Card className="flex flex-col gap-6">
      <div>
        <h1>Create your account</h1>
        <p className="mt-1 text-muted">
          SafeTrail is for Bulacan State University students, so you need an email that ends in @{domain}.
        </p>
      </div>
      <Suspense fallback={null}>
        <AuthForm mode="sign-up" domain={domain} />
      </Suspense>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="link">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
