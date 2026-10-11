import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-4 px-6">
      <h1>We couldn&apos;t find that</h1>
      <p className="text-muted">
        The page may have moved, or you may not have access to it. Nothing has been changed.
      </p>
      <Link href="/" className={buttonClass("primary")}>
        Go to your home page
      </Link>
    </main>
  );
}
