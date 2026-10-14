import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { TrailRegister } from "@/components/safetrail/illustrations/trail-register";
import { TrailSignIn } from "@/components/safetrail/illustrations/trail-sign-in";
import { Logo } from "@/components/safetrail/logo";

const topLink = "link inline-flex min-h-10 items-center rounded-sm";
const footLink = "inline-flex min-h-10 items-center rounded-sm hover:text-brand-800 hover:underline";

/**
 * The split layout for sign in and register: a brand panel beside the form.
 * Breakpoints follow the shell's own width (container queries), not the viewport's.
 */
export function AuthShell({
  illustration,
  children,
}: {
  illustration: "sign-in" | "register";
  children: React.ReactNode;
}) {
  const register = illustration === "register";
  const Illustration = register ? TrailRegister : TrailSignIn;
  return (
    <div className="@container bg-card">
      <div className="flex min-h-screen @max-[1040px]:flex-col">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-12 border-r border-border bg-brand-50 px-16 py-12 @max-[1040px]:flex-none @max-[1040px]:border-r-0 @max-[1040px]:border-b @max-[1040px]:p-6 @max-[560px]:hidden">
          <Link href="/" className="self-start rounded-md">
            <Logo size={36} />
          </Link>
          <div
            data-illustration={illustration}
            className="flex min-h-0 flex-1 items-center justify-center @max-[1040px]:hidden"
          >
            <Illustration className="h-auto max-h-[560px] w-full max-w-[520px]" />
          </div>
        </div>

        <main className="flex min-w-0 flex-[1_1_520px] flex-col gap-8 px-12 py-8 @max-[1040px]:p-6 @max-[560px]:gap-6 @max-[560px]:px-4 @max-[560px]:pt-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 text-[15px] leading-[22px] text-muted">
            <Link href="/" className="hidden rounded-md @max-[560px]:inline-flex">
              <Logo size={28} />
            </Link>
            <Link href="/" className={`${topLink} gap-1`}>
              <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
              Home
            </Link>
            <span>
              <span className="@max-[560px]:hidden">
                {register ? "Already have an account? " : "New to Escapture? "}
              </span>
              <Link href={register ? "/sign-in" : "/sign-up"} className={topLink}>
                {register ? "Sign in" : "Create an account"}
              </Link>
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center @max-[560px]:items-start">
            <div className="flex w-full max-w-[420px] flex-col gap-6 @max-[560px]:[&_h1]:text-[28px] @max-[560px]:[&_h1]:leading-9">
              {children}
            </div>
          </div>

          <nav
            aria-label="Legal"
            className="flex flex-wrap justify-center gap-x-6 text-[13px] leading-[18px] text-muted"
          >
            <Link href="/privacy" className={footLink}>
              Privacy Policy
            </Link>
            <Link href="/terms" className={footLink}>
              Terms of Service
            </Link>
            <Link href="/contact" className={footLink}>
              Contact the team
            </Link>
          </nav>
        </main>
      </div>
    </div>
  );
}
