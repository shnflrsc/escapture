import type { Metadata } from "next";
import Link from "next/link";
import { siteContainer } from "@/components/safetrail/site-chrome";

export const metadata: Metadata = { title: "Terms of service · SafeTrail" };

// Placeholder: replace with the pilot's real terms before students use SafeTrail.
export default function TermsPage() {
  return (
    <div className={`${siteContainer} flex flex-col items-start gap-4 py-12 lg:py-16`}>
      <h1>Terms of service</h1>
      <p className="max-w-prose">
        This page is being written. The terms for the SafeTrail pilot will appear here before the pilot opens to
        students.
      </p>
      <Link href="/" className="link">
        Back to the home page
      </Link>
    </div>
  );
}
