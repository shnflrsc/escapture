"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

/** A filter that is on or off. It is a link, so the choice lives in the address. */
export function FilterChip({ label, href, on }: { label: string; href: string; on: boolean }) {
  return (
    <Link
      href={href}
      aria-current={on ? "true" : undefined}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm leading-5 font-semibold whitespace-nowrap transition-colors duration-150",
        on ? "border-transparent bg-brand-100 text-brand-800" : "border-border-strong bg-card text-ink hover:bg-brand-50",
      )}
    >
      {on && <Check size={14} strokeWidth={1.75} aria-hidden />}
      {label}
      <span className="sr-only">{on ? ", on. Activate to turn off." : ", off. Activate to turn on."}</span>
    </Link>
  );
}

/**
 * A select that changes one search parameter and reloads the list. `hrefs` maps
 * each option's value to where choosing it leads, worked out on the server.
 */
export function ParamSelect({
  label,
  value,
  options,
  hrefs,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  hrefs: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm leading-5 font-semibold text-ink">
      {label}
      <select
        value={value}
        onChange={(e) => router.push(hrefs[e.target.value])}
        className="h-10 rounded-md border border-border-strong bg-card px-3 text-[15px] leading-5 font-normal text-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
