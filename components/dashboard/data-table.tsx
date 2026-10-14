import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// The reviewer and administrator tables: a `subtle` header row, 44px rows, hover
// brand-50, no zebra striping. On a narrow screen the table scrolls sideways
// inside its own box; the page never does.

export const th = "px-4 py-3 text-left text-[13px] leading-[18px] font-semibold whitespace-nowrap text-muted";
export const td = "h-11 px-4 py-2 align-middle text-sm leading-5";

export function TableBox({
  caption,
  minWidth = 720,
  children,
}: {
  caption: string;
  /** Below this the table scrolls inside the box. */
  minWidth?: number;
  children: React.ReactNode;
}) {
  return (
    // relative: screen-reader-only text inside the table is positioned, and must stay inside this box.
    <div className="relative overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
      <table className="w-full border-collapse" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export const headRow = "border-b border-border bg-subtle";
export const bodyRow =
  "relative border-b border-border transition-colors duration-150 last:border-b-0 focus-within:bg-brand-50 hover:bg-brand-50";
/** Put on the row's main link: its ::after covers the row, so the whole row opens it. */
export const rowLink = "font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:underline";

/** A column header that sorts. The link flips the direction; aria-sort says which way it is now. */
export function SortHeader({
  label,
  href,
  direction,
  align = "left",
}: {
  label: string;
  /** Where clicking leads: this column sorted, or flipped if it already is. */
  href: string;
  direction: "ascending" | "descending" | null;
  align?: "left" | "right";
}) {
  const Icon = direction === "ascending" ? ArrowUp : direction === "descending" ? ArrowDown : ArrowUpDown;
  return (
    <th scope="col" aria-sort={direction ?? "none"} className={cn(th, align === "right" && "text-right")}>
      <Link href={href} className="inline-flex items-center gap-1 rounded-sm py-1 hover:text-brand-800">
        {label}
        <Icon size={14} strokeWidth={1.75} aria-hidden className={direction ? "text-brand-700" : undefined} />
        <span className="sr-only">
          {direction ? `, sorted ${direction}. Activate to reverse.` : ". Activate to sort."}
        </span>
      </Link>
    </th>
  );
}

/** A search box that filters the list in the address. `keep` carries the other filters along. */
export function TableSearch({
  action,
  label,
  value,
  keep = {},
  className,
}: {
  action: string;
  label: string;
  value: string;
  keep?: Record<string, string | undefined>;
  className?: string;
}) {
  return (
    <form role="search" action={action} method="get" className={cn("relative", className)}>
      {Object.entries(keep).map(([name, v]) => (v ? <input key={name} type="hidden" name={name} value={v} /> : null))}
      <Search
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
      />
      <input
        key={value}
        type="search"
        name="q"
        defaultValue={value}
        aria-label={label}
        placeholder={label}
        maxLength={120}
        className="h-10 w-full rounded-md border border-border-strong bg-card pr-3 pl-[38px] text-[15px] leading-5 text-ink placeholder:text-muted"
      />
    </form>
  );
}

export function Pagination({
  page,
  pages,
  total,
  hrefFor,
  unit,
}: {
  page: number;
  pages: number;
  total: number;
  hrefFor: (page: number) => string;
  unit: string;
}) {
  if (pages <= 1) return null;
  const step = (to: number, label: string, Icon: typeof ChevronLeft, before: boolean) =>
    to >= 1 && to <= pages ? (
      <Link href={hrefFor(to)} className={buttonClass("secondary", "h-9 px-3 text-sm")}>
        {before && <Icon size={16} strokeWidth={1.75} aria-hidden />}
        {label}
        {!before && <Icon size={16} strokeWidth={1.75} aria-hidden />}
      </Link>
    ) : (
      <span aria-disabled className={buttonClass("secondary", "h-9 cursor-not-allowed border-transparent bg-disabled-bg px-3 text-sm text-disabled-fg hover:bg-disabled-bg")}>
        {before && <Icon size={16} strokeWidth={1.75} aria-hidden />}
        {label}
        {!before && <Icon size={16} strokeWidth={1.75} aria-hidden />}
      </span>
    );
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="tnum text-sm leading-5 text-muted">
        Page {page} of {pages} · {total} {unit}
      </p>
      <div className="flex gap-2">
        {step(page - 1, "Previous", ChevronLeft, true)}
        {step(page + 1, "Next", ChevronRight, false)}
      </div>
    </nav>
  );
}
