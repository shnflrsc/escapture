"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { api, errorMessage } from "@/lib/client-api";

/** A new reviewer chooses their password. The link they came by works once. */
export function SetupForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (password.length < 8) return setError("Use at least 8 characters.");
    setLoading(true);
    setError(null);
    try {
      await api(`/api/setup/${token}`, { body: { password } });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err).replace(/^password: /, ""));
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Banner tone="success">Your password is set. This link won&apos;t work again.</Banner>
        <Link href="/sign-in" className={buttonClass("primary")}>
          Sign in
        </Link>
      </div>
    );
  }
  // method="post" so a submit before hydration can never put the password in the URL.
  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Input
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={200}
        error={error}
        hint="At least 8 characters. Only you will know it."
      />
      <Button type="submit" loading={loading}>
        Set password
      </Button>
    </form>
  );
}
