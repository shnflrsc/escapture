import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";
import "./marketing.css";

/** The public pages that explain Escapture: the landing page and the legal and contact pages. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mk-root flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only rounded-md bg-card px-4 py-2 font-semibold text-brand-700 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-30"
      >
        Skip to the content
      </a>
      <SiteNav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
