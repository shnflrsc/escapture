"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { api, ApiError } from "@/lib/client-api";

const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/");

export function AuthForm({ mode, domain }: { mode: "sign-in" | "sign-up"; domain?: string }) {
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setError(null);
    setEmailError(null);
    if (mode === "sign-up" && domain && !email.toLowerCase().endsWith(`@${domain}`)) {
      // The server enforces this too; checking here just saves a round trip.
      setEmailError(`Please enter an email that ends in @${domain}.`);
      return;
    }
    setLoading(true);
    try {
      if (mode === "sign-up") {
        await api("/api/auth/sign-up/email", {
          body: { name: String(form.get("name") ?? "").trim(), email, password },
        });
      } else {
        await api("/api/auth/sign-in/email", { body: { email, password } });
      }
      window.location.href = next;
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError && err.code === "EMAIL_DOMAIN_NOT_ALLOWED") setEmailError(err.message);
      else if (err instanceof ApiError && err.status === 401) setError("That email or password isn't right. Check them and try again.");
      else if (err instanceof ApiError && err.status === 429) setError("Too many attempts. Please wait a minute and try again.");
      else if (err instanceof ApiError && err.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") setEmailError("There's already an account with that email. Try signing in.");
      else setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
      {error && <Banner tone="attention">{error}</Banner>}
      {mode === "sign-up" && <Input label="Your name" name="name" autoComplete="name" required maxLength={80} />}
      <Input
        label={mode === "sign-up" ? "BulSU email" : "Email"}
        name="email"
        type="email"
        autoComplete="email"
        required
        error={emailError}
        hint={mode === "sign-up" && domain ? `Must end in @${domain}` : undefined}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
        required
        minLength={8}
        hint={mode === "sign-up" ? "At least 8 characters." : undefined}
      />
      <Button type="submit" loading={loading}>
        {mode === "sign-up" ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}
