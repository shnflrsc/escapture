import type { Metadata } from "next";
import Link from "next/link";
import { siteContainer } from "@/components/safetrail/site-chrome";

export const metadata: Metadata = { title: "Privacy policy · SafeTrail" };

// Placeholder: replace with the pilot's real privacy policy before students use SafeTrail.
export default function PrivacyPage() {
  return (
    <div className={`${siteContainer} flex flex-col items-start gap-4 py-12 lg:py-16`}>
      <h1>Privacy policy</h1>
      <p className="max-w-prose">
        This page is being written. It will explain what SafeTrail stores, who can see it and how long it is kept,
        before the pilot opens to students.
      </p>
      <p className="max-w-prose text-muted">
        For now, the{" "}
        <Link href="/#privacy" className="link">
          home page
        </Link>{" "}
        says in plain words what stays private.
      </p>
      <Link href="/" className="link">
        Back to the home page
      </Link>
    </div>
  );
}
