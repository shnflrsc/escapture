import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy · SafeTrail" };

// Placeholder: replace with the pilot's real privacy policy before students use SafeTrail.
export default function PrivacyPage() {
  return (
    <div className="mk-wrap flex flex-col items-start gap-4 py-16">
      <h1>Privacy policy</h1>
      <p className="max-w-prose">
        This page is being written. It will explain what SafeTrail stores, who can see it and how long it is kept,
        before the pilot opens to students.
      </p>
      <p className="max-w-prose text-muted">
        For now, the{" "}
        <Link href="/#faq" className="link">
          home page
        </Link>{" "}
        answers the common questions about who can see what.
      </p>
      <Link href="/" className="link">
        Back to the home page
      </Link>
    </div>
  );
}
