import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/safetrail/logo";
import { buttonClass } from "@/components/ui/button";
import { allowedEmailDomain } from "@/lib/email-domain";
import { getUser, homeFor } from "@/server/auth";

/** The address new accounts must use; the same setting the sign-up gate reads. */
export const emailDomain = allowedEmailDomain;

const ghost = buttonClass("ghost", "mk-nav-signin");

// Reads the session, so it streams in behind Suspense and the rest of the page stays static.
async function Account() {
  const user = await getUser();
  return user ? (
    <Link href={homeFor(user.role)} className={ghost}>
      Open SafeTrail
    </Link>
  ) : (
    <SignIn />
  );
}
const SignIn = () => (
  <Link href="/sign-in" className={ghost}>
    Sign in
  </Link>
);

const links = [
  { label: "How it works", href: "/#how" },
  { label: "Privacy", href: "/#privacy" },
  { label: "For reviewers", href: "/#reviewers" },
  { label: "FAQ", href: "/#faq" },
];

export function SiteNav() {
  return (
    <header className="mk-nav">
      <div className="mk-wrap">
        <Link href="/" className="rounded-md py-1">
          <Logo />
        </Link>
        <nav aria-label="On this page" className="mk-nav-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mk-nav-actions">
          <Suspense fallback={<SignIn />}>
            <Account />
          </Suspense>
          <Link href="/#start" className={buttonClass("primary")}>
            Start your vault
          </Link>
        </div>
      </div>
    </header>
  );
}

const columns = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how" },
      // There is no store listing yet: the install steps are in the vault, under "How to capture".
      { label: "Escrow Capture extension", href: "/vault" },
      { label: "For reviewers", href: "/#reviewers" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "FAQ", href: "/#faq" },
      { label: "Contact the team", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-wrap">
        <div className="mk-footer-grid">
          <div className="flex flex-col items-start gap-3">
            <Logo size={28} />
            <p className="max-w-[36ch] text-[15px] leading-6 text-muted">
              Keep evidence of what happened online and share it with your university when you&apos;re ready.
            </p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mk-footer-note">
          SafeTrail supplements Bulacan State University&apos;s existing process. It does not replace it.
        </p>
      </div>
    </footer>
  );
}
