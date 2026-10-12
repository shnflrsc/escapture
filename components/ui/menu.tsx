"use client";

import { EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  /** A destination. Otherwise give onSelect. */
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
};

/**
 * A "More" button that opens a short list of actions. Arrow keys move, Enter or
 * Space chooses, Escape and clicking elsewhere close it. Focus goes back to the
 * button before an action runs, so a dialog it opens returns focus there.
 */
export function Menu({
  label,
  items,
  note,
  className,
}: {
  /** What the button is for, e.g. "Actions for Screenshot of the post". */
  label: string;
  items: MenuItem[];
  /** Shown under the items; use it to say why some are disabled. */
  note?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const focusLast = useRef(false);
  const id = useId();

  const enabled = () => [
    ...(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []),
  ];

  // Opens upwards when there is no room below, then moves focus into the list.
  useLayoutEffect(() => {
    if (!open || !list.current || !button.current) return;
    const below = window.innerHeight - button.current.getBoundingClientRect().bottom;
    setUp(below < list.current.offsetHeight + 16);
    const options = enabled();
    (focusLast.current ? options.at(-1) : options[0])?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function show(last = false) {
    focusLast.current = last;
    setOpen(true);
  }

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  function onListKey(e: React.KeyboardEvent) {
    const options = enabled();
    const at = options.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      options[(i + options.length) % options.length]?.focus();
    };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(options.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") setOpen(false);
  }

  const itemClass = (item: MenuItem) =>
    cn(
      "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[15px] leading-5 font-semibold whitespace-nowrap",
      item.disabled
        ? "cursor-not-allowed text-disabled-fg"
        : item.danger
          ? "text-danger-solid hover:bg-danger-bg focus-visible:bg-danger-bg"
          : "text-ink hover:bg-brand-50 focus-visible:bg-brand-50",
    );

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        ref={button}
        type="button"
        aria-label={label}
        title="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show(e.key === "ArrowUp");
          }
        }}
        className={cn(
          "flex size-10 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-brand-100 hover:text-brand-800",
          open && "bg-brand-100 text-brand-800",
        )}
      >
        <EllipsisVertical size={20} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div
          ref={list}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onListKey}
          className={cn(
            "fade-in absolute right-0 z-20 flex min-w-[220px] flex-col rounded-xl border border-border bg-card p-1 shadow-raised",
            up ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {items.map((item) =>
            item.href && !item.disabled ? (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                className={itemClass(item)}
                onClick={() => setOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                className={itemClass(item)}
                onClick={() => {
                  if (item.disabled) return;
                  close();
                  item.onSelect?.();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
          {note && (
            <p className="max-w-[260px] border-t border-border px-3 pt-2 pb-1 text-[13px] leading-[18px] whitespace-normal text-muted">
              {note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
