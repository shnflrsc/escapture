import { SiteFooter, SiteHeader } from "@/components/safetrail/site-chrome";

/** Public pages that explain SafeTrail: the home page and the legal pages. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only rounded-md bg-card px-4 py-2 font-semibold text-brand-700 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10"
      >
        Skip to the content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
