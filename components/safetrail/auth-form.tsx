"use client";

import { Circle, CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { Input, PasswordInput } from "@/components/ui/field";
import { api, ApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { peekSignupEmail, takeSignupEmail } from "@/lib/signup-email";

// With nowhere particular to go, /go sends each role to its own first page.
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/go");

const MIN_PASSWORD = 8;
const never = () => () => {};
const nothing = () => null;
// 40px tall so the whole row is a comfortable target; the box lines up with the first line of text.
const checkRow = "flex min-h-10 cursor-pointer items-start gap-3 py-[9px] text-[15px] leading-[22px]";
const checkBox = "mt-px size-5 shrink-0 accent-brand-700";

function FieldError({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className={cn("flex items-start gap-1 text-[13px] leading-[18px] text-danger-fg", className)}>
      <CircleAlert size={16} strokeWidth={1.75} aria-hidden className="mt-px shrink-0" />
      {children}
    </p>
  );
}

export function AuthForm({ mode, domain }: { mode: "sign-in" | "sign-up"; domain: string }) {
  const signUp = mode === "sign-up";
  const next = safeNext(useSearchParams().get("next"));
  const [name, setName] = useState("");
  // Someone who typed their email on the home page shouldn't have to type it again:
  // it shows here until they change it or the account is created.
  const carried = useSyncExternalStore(never, signUp ? peekSignupEmail : nothing, nothing);
  const [typed, setTyped] = useState<string | null>(null);
  const email = typed ?? carried ?? "";
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [agreed, setAgreed] = useState(false);
  // Messages for empty or unfinished fields wait until the first try.
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverEmailError, setServerEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const ruleId = useId();
  const agreeId = useId();

  const address = email.trim().toLowerCase();
  const afterAt = address.includes("@") ? address.slice(address.indexOf("@") + 1) : null;
  const rightDomain = address.endsWith(`@${domain}`);
  // While typing, wait until the part after the @ can no longer become the right domain.
  const wrongDomain =
    signUp && afterAt !== null && !rightDomain && (tried || (afterAt.includes(".") && !domain.startsWith(afterAt)));
  const emailError = !address
    ? tried
      ? signUp
        ? "Enter your BulSU email."
        : "Enter the email you signed up with."
      : null
    : wrongDomain
      ? `Please enter an email that ends in @${domain}.`
      : serverEmailError;
  const nameMissing = signUp && tried && !name.trim();
  const longEnough = password.length >= MIN_PASSWORD;
  const passwordMissing = !signUp && tried && !password;
  const passwordShort = signUp && tried && !longEnough;
  const agreeMissing = signUp && tried && !agreed;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTried(true);
    setError(null);
    setServerEmailError(null);
    // The server enforces all of this too; checking here saves a round trip.
    const ready = signUp
      ? Boolean(name.trim() && address && rightDomain && longEnough && agreed)
      : Boolean(address && password);
    if (!ready) {
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus({ preventScroll: false }),
      );
      return;
    }
    setLoading(true);
    try {
      if (signUp) {
        await api("/api/auth/sign-up/email", { body: { name: name.trim(), email: email.trim(), password } });
        takeSignupEmail();
      } else {
        await api("/api/auth/sign-in/email", { body: { email: email.trim(), password, rememberMe: remember } });
      }
      window.location.href = next;
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError && err.code === "EMAIL_DOMAIN_NOT_ALLOWED") setServerEmailError(err.message);
      else if (err instanceof ApiError && err.status === 401) setError("That email or password isn't right. Check them and try again.");
      else if (err instanceof ApiError && err.status === 429) setError("Too many attempts. Please wait a minute and try again.");
      else if (err instanceof ApiError && err.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") setServerEmailError("There's already an account with that email. Try signing in.");
      else setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  // method="post" so a submit before hydration can never put the password in the URL.
  return (
    <form ref={formRef} method="post" noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      {error && <Banner tone="attention">{error}</Banner>}
      <div className="flex flex-col gap-4">
        {signUp && (
          <Input
            label="Your name"
            name="name"
            autoComplete="name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameMissing ? "Enter your name." : null}
          />
        )}
        <Input
          label={signUp ? "BulSU email" : "Email"}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={signUp ? `2025000001@${domain}` : `you@${domain}`}
          value={email}
          onChange={(e) => {
            setTyped(e.target.value);
            takeSignupEmail();
            setServerEmailError(null);
          }}
          error={emailError}
          hint={signUp ? `Must end in @${domain}` : undefined}
        />
        {signUp ? (
          <div className="flex flex-col gap-1">
            <PasswordInput
              label="Password"
              name="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={passwordShort}
              aria-describedby={ruleId}
            />
            <p
              id={ruleId}
              aria-live="polite"
              data-state={longEnough ? "met" : passwordShort ? "unmet" : "waiting"}
              className={cn(
                "flex items-center gap-1 text-[13px] leading-[18px]",
                longEnough ? "text-tamper-fg" : passwordShort ? "text-danger-fg" : "text-muted",
              )}
            >
              {longEnough ? (
                <CircleCheck size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />
              ) : (
                <Circle size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />
              )}
              At least {MIN_PASSWORD} characters
            </p>
          </div>
        ) : (
          <PasswordInput
            label="Password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={passwordMissing ? "Enter your password." : null}
            labelEnd={
              <Link href="/contact" className="link -my-2.5 inline-flex min-h-10 items-center rounded-sm text-sm leading-5">
                Can&apos;t sign in?
              </Link>
            }
          />
        )}
        {signUp ? (
          <div className="flex flex-col gap-1">
            <label className={checkRow}>
              <input
                type="checkbox"
                name="agree"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                aria-invalid={agreeMissing ? true : undefined}
                aria-describedby={agreeMissing ? agreeId : undefined}
                className={checkBox}
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="link">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="link">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {agreeMissing && (
              <FieldError id={agreeId} className="ml-8">
                Please agree to the terms to create an account.
              </FieldError>
            )}
          </div>
        ) : (
          <label className={checkRow}>
            <input
              type="checkbox"
              name="rememberMe"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className={checkBox}
            />
            Keep me signed in on this device
          </label>
        )}
      </div>
      <Button type="submit" loading={loading} className="h-12! w-full text-base">
        {signUp ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}
