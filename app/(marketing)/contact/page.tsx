import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Contact the team · SafeTrail" };

// Placeholder: replace with a real way to reach the team before students use SafeTrail.
export default function ContactPage() {
  return (
    <div className="mk-wrap flex flex-col items-start gap-4 py-16">
      <h1>Contact the team</h1>
      <p className="max-w-prose">
        This page is being written. A way to reach the SafeTrail team will appear here before the pilot opens to
        students.
      </p>
      <p className="max-w-prose text-muted">
        SafeTrail isn&apos;t an emergency service. If you feel unsafe right now, reach out to your university&apos;s
        guidance office or local emergency services.
      </p>
      <Link href="/" className="link">
        Back to the home page
      </Link>
    </div>
  );
}
