"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { vaultHref, type VaultView } from "@/lib/vault-view";

const control =
  "h-10 rounded-md border border-border-strong bg-card text-[15px] leading-5 text-ink placeholder:text-muted";

/**
 * Tabs, search, kind and order. Everything is kept in the address, so the list
 * you were looking at is still there when you come back from an item. It is a
 * plain GET form: it works before (or without) JavaScript, and with it the
 * menus apply as soon as they change.
 */
export function VaultToolbar({
  view,
  counts,
  showControls,
}: {
  view: VaultView;
  counts: { mine: number; shared: number };
  /** Off when the tab has nothing in it: there is nothing to search. */
  showControls: boolean;
}) {
  const router = useRouter();
  const tabs = [
    { key: "mine" as const, label: "My evidence" },
    { key: "shared" as const, label: "Shared with me" },
  ];

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    router.push(
      vaultHref({
        tab: view.tab,
        q: String(data.get("q") ?? "").trim(),
        kind: String(data.get("kind") ?? "") as VaultView["kind"],
        sort: String(data.get("sort") ?? "") as VaultView["sort"],
      }),
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <nav aria-label="Vault sections" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            // The search follows you across tabs; kind and order start again.
            href={vaultHref({ tab: t.key, q: view.q })}
            aria-current={view.tab === t.key ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-2 rounded-md px-4 text-[15px] font-semibold whitespace-nowrap",
              view.tab === t.key ? "bg-brand-100 text-brand-800" : "text-brand-700 hover:bg-brand-50",
            )}
          >
            {t.label}
            <span className="tnum text-[13px] font-semibold text-muted">
              {counts[t.key]}
              <span className="sr-only"> items</span>
            </span>
          </Link>
        ))}
      </nav>

      {showControls && (
        <form
          // Remounts when the address changes, so the controls always show what is applied.
          key={vaultHref(view)}
          role="search"
          action="/vault"
          method="get"
          onSubmit={(e) => {
            e.preventDefault();
            apply(e.currentTarget);
          }}
          className="flex min-w-0 basis-full flex-wrap items-center gap-2 md:basis-auto"
        >
          {view.tab === "shared" && <input type="hidden" name="tab" value="shared" />}
          <label className="relative min-w-[180px] flex-1 md:w-[240px] md:flex-none">
            <span className="sr-only">
              {view.tab === "shared" ? "Search by name or by who shared it" : "Search your evidence by name"}
            </span>
            <Search
              size={18}
              strokeWidth={1.75}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              name="q"
              defaultValue={view.q}
              maxLength={120}
              placeholder={view.tab === "shared" ? "Search name or person" : "Search by name"}
              className={cn(control, "w-full pr-3 pl-10")}
            />
          </label>
          <label>
            <span className="sr-only">Kind</span>
            <select
              name="kind"
              defaultValue={view.kind}
              onChange={(e) => e.currentTarget.form && apply(e.currentTarget.form)}
              className={cn(control, "px-3")}
            >
              <option value="">All kinds</option>
              <option value="facebook_post">Posts</option>
              <option value="facebook_message">Messages</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Order</span>
            <select
              name="sort"
              defaultValue={view.sort}
              onChange={(e) => e.currentTarget.form && apply(e.currentTarget.form)}
              className={cn(control, "px-3")}
            >
              {view.tab === "shared" ? (
                <>
                  <option value="">Recently shared</option>
                  <option value="newest">Newest capture</option>
                </>
              ) : (
                <option value="">Newest first</option>
              )}
              <option value="oldest">Oldest first</option>
              <option value="name">Name, A to Z</option>
            </select>
          </label>
          <Button type="submit" variant="soft" className="h-10 px-4">
            Search
          </Button>
        </form>
      )}
    </div>
  );
}
