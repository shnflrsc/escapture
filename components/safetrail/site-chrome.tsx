import Link from "next/link";
import { Suspense } from "react";
import { buttonClass } from "@/components/ui/button";
import { getUser, homeFor } from "@/server/auth";
import { Logo } from "./logo";

/** The address new accounts must use; the same setting the sign-up gate reads. */
export const emailDomain = () => process.env.ALLOWED_EMAIL_DOMAIN ?? "bulsu.edu.ph";

const container = "mx-auto w-full max-w-[1040px] px-4 sm:px-6";

function SignedOut({ place }: { place: "header" | "hero" }) {
  if (place === "header") {
    return (
      <Link href="/sign-in" className={buttonClass("secondary", "h-10 px-4")}>
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/sign-in" className={buttonClass("primary")}>
          Sign in
        </Link>
        <Link href="/sign-up" className="link">
          Create an account
        </Link>
      </div>
      <p className="text-sm leading-[22px] text-muted">
        For Bulacan State University students. You need an email that ends in @{emailDomain()}.
      </p>
    </div>
  );
}

// Reads the session, so it streams in behind Suspense and the rest of the page stays static.
async function Account({ place }: { place: "header" | "hero" }) {
  const user = await getUser();
  if (!user) return <SignedOut place={place} />;
  const open = (
    <Link
      href={homeFor(user.role)}
      className={place === "header" ? buttonClass("secondary", "h-10 px-4") : buttonClass("primary")}
    >
      Open SafeTrail
    </Link>
  );
  if (place === "header") return open;
  return (
    <div className="flex flex-col items-start gap-3">
      {open}
      <p className="text-sm leading-[22px] text-muted">You are signed in as {user.name}.</p>
    </div>
  );
}

/** "Sign in", or "Open SafeTrail" for someone who already is. One primary button: the hero's. */
export function AccountAction({ place }: { place: "header" | "hero" }) {
  return (
    <Suspense fallback={<SignedOut place={place} />}>
      <Account place={place} />
    </Suspense>
  );
}

const navLink = "rounded-md px-3 py-2 text-[15px] leading-5 font-semibold text-ink hover:bg-brand-50";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className={`${container} flex h-16 items-center justify-between gap-4`}>
        <Link href="/" className="rounded-md py-1">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <nav aria-label="On this page" className="hidden items-center gap-1 md:flex">
            <Link href="/#how-it-works" className={navLink}>
              How it works
            </Link>
            <Link href="/#privacy" className={navLink}>
              Privacy
            </Link>
          </nav>
          <AccountAction place="header" />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className={`${container} flex flex-col gap-6 py-8 md:flex-row md:items-start md:justify-between`}>
        <div className="flex max-w-prose flex-col gap-2">
          <Logo size={28} />
          <p className="text-sm leading-[22px] text-muted">
            A pilot with Bulacan State University students. SafeTrail is not an official university service.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm leading-[22px]">
          <Link href="/terms" className="link">
            Terms of service
          </Link>
          <Link href="/privacy" className="link">
            Privacy policy
          </Link>
          <Link href="/sign-in" className="link">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export const siteContainer = container;
