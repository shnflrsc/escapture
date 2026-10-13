"use client";

import { ArrowRight, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { keepSignupEmail } from "@/lib/signup-email";

/**
 * The "Set up your vault" panel. The email typed here is carried to the sign-up
 * form, where the account is actually created.
 */
export function StartForm({ domain }: { domain: string }) {
  const router = useRouter();
  const id = useId();
  const email = useRef<HTMLInputElement>(null);
  return (
    <form
      className="mk-start-panel"
      // Works before the page is interactive too: it simply opens the sign-up form.
      action="/sign-up"
      onSubmit={(e) => {
        e.preventDefault();
        keepSignupEmail(email.current?.value.trim() ?? "");
        router.push("/sign-up");
      }}
    >
      <div className="flex max-w-[420px] flex-col gap-1.5">
        <label htmlFor={id} className="text-sm leading-5 font-semibold text-ink">
          University email
        </label>
        {/* No name attribute: a submit before the page is interactive must not put the address in the URL. */}
        <input
          ref={email}
          id={id}
          type="email"
          autoComplete="email"
          placeholder={`yourname@${domain}`}
          aria-describedby={`${id}-help`}
          className="h-[var(--control-h)] w-full rounded-md border border-border-strong bg-card px-3.5 text-base text-ink placeholder:text-muted"
        />
        <p id={`${id}-help`} className="text-[13px] leading-[18px] text-muted">
          Use the email that ends in {domain}.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit">
          Create your vault
          <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
        </Button>
        {/* There is no store listing yet: the install steps are in the vault, under "How to capture". */}
        <Link href="/vault" className={buttonClass("soft")}>
          Get the extension
        </Link>
      </div>
      <p className="flex items-center gap-2 text-sm leading-[22px] text-muted">
        <EyeOff size={16} strokeWidth={1.75} aria-hidden />
        Only you can see your vault.
      </p>
    </form>
  );
}
