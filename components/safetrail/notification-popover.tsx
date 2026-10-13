"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { NotificationRow, type NotificationItem } from "./notification-row";

const SHOWN = 6;

/**
 * The header's bell. It opens a short list of the latest notifications, fetched
 * when it opens. Unread is a small dot, never a count bubble. Escape and a click
 * elsewhere close it, and focus goes back to the bell.
 */
export function NotificationPopover({
  unread,
  role,
  className,
}: {
  /** How many are unread, from the page's own data. */
  unread: number;
  role: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const bell = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) bell.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    panel.current?.focus();
    api<{ items: NotificationItem[] }>("/api/notifications")
      .then((res) => !cancelled && setItems(res.items.slice(0, SHOWN)))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    const outside = (e: PointerEvent) => {
      // Includes the drawer's menu button: the two are never open together.
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  function toggle() {
    if (open) return close();
    setItems(null);
    setError(null);
    setOpen(true);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      // Keeps Tab inside the popover while it is open.
      const stops = [...(panel.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [])];
      if (stops.length === 0) return e.preventDefault();
      const first = stops[0];
      const last = stops[stops.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === panel.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  async function markAll() {
    setMarking(true);
    try {
      await api("/api/notifications/read", { body: {} });
      const now = new Date().toISOString();
      setItems((list) => list?.map((n) => ({ ...n, readAt: n.readAt ?? now })) ?? null);
      router.refresh(); // the dot comes from the page's data
    } catch (err) {
      setError(errorMessage(err));
    }
    setMarking(false);
  }

  const anyUnread = items ? items.some((n) => !n.readAt) : unread > 0;

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        ref={bell}
        type="button"
        aria-label={`Notifications, ${unread} unread`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "relative grid size-11 place-items-center rounded-md text-ink transition-colors duration-150 hover:bg-brand-100 hover:text-brand-800",
          open && "bg-brand-100 text-brand-800",
        )}
      >
        <Bell size={20} strokeWidth={1.75} aria-hidden />
        {unread > 0 && (
          <span aria-hidden className="absolute top-2.5 right-[11px] size-2 rounded-full bg-brand-700 ring-2 ring-card" />
        )}
      </button>
      {open && (
        <section
          ref={panel}
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="fade-in fixed inset-x-4 top-[60px] z-30 overflow-hidden rounded-xl border border-border bg-card shadow-raised outline-none sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[400px]"
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
            <h2 className="text-[17px] leading-6">Notifications</h2>
            <button
              type="button"
              disabled={!anyUnread || marking}
              onClick={markAll}
              className={buttonClass("ghost", "h-9 px-3 text-sm")}
            >
              Mark all as read
            </button>
          </div>
          <div aria-live="polite" className="max-h-[420px] overflow-y-auto border-t border-border">
            {error ? (
              <p className="px-4 py-6 text-sm leading-[22px] text-muted">{error}</p>
            ) : items === null ? (
              <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Loading">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm leading-[22px] text-muted">You&apos;re all caught up.</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id} className="border-b border-border">
                    <NotificationRow n={n} role={role} compact onNavigate={() => setOpen(false)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-center p-3">
            <Link href="/notifications" className="link rounded-sm text-sm" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
