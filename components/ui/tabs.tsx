import Link from "next/link";
import { cn } from "@/lib/cn";

export type LinkTab = { label: string; href: string; count?: number; active: boolean };

/**
 * Tabs that are links: the choice lives in the address, so it survives a reload
 * and the Back button. The count is how many items the tab holds.
 */
export function LinkTabs({ label, tabs, unit = "items" }: { label: string; tabs: LinkTab[]; unit?: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "flex h-10 items-center gap-2 rounded-md px-4 text-[15px] font-semibold whitespace-nowrap",
            tab.active ? "bg-brand-100 text-brand-800" : "text-brand-700 hover:bg-brand-50",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="tnum text-[13px] font-semibold text-muted">
              {tab.count}
              <span className="sr-only"> {unit}</span>
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
