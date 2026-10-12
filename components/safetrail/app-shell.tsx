"use client";

import { Archive, Bell, Columns3, FolderOpen, Inbox, LockKeyhole, LogOut, Menu as MenuIcon, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";

type Role = "student" | "reviewer" | "admin";

const NAV: Record<Role, { href: string; label: string; Icon: typeof Bell; match: (p: string) => boolean }[]> = {
  student: [
    { href: "/vault", label: "Vault", Icon: LockKeyhole, match: (p) => p.startsWith("/vault") },
    { href: "/cases", label: "Cases", Icon: FolderOpen, match: (p) => p.startsWith("/cases") },
  ],
  reviewer: [
    {
      href: "/review",
      label: "Review Board",
      Icon: Columns3,
      match: (p) => p.startsWith("/review") && !p.startsWith("/review/archives") && !p.startsWith("/review/shared"),
    },
    { href: "/review/shared", label: "Shared with me", Icon: Inbox, match: (p) => p.startsWith("/review/shared") },
    { href: "/review/archives", label: "Case Archives", Icon: Archive, match: (p) => p.startsWith("/review/archives") },
  ],
  admin: [],
};

export function AppShell({
  user,
  unread,
  children,
}: {
  user: { name: string; email: string; role: Role };
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const reviewer = user.role === "reviewer";
  const items = [
    ...NAV[user.role],
    { href: "/notifications", label: "Notifications", Icon: Bell, match: (p: string) => p.startsWith("/notifications") },
  ];

  async function signOut() {
    setSigningOut(true);
    await api("/api/auth/sign-out", { body: {} }).catch(() => {});
    // A full page load on purpose: it drops every cached page for this session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/sign-in";
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);

  // Below 1024px the sidebar becomes a drawer. A modal <dialog> gives it a focus
  // trap, Escape and a backdrop without any extra code.
  useEffect(() => {
    const d = drawer.current;
    if (!d) return;
    if (menuOpen && !d.open) d.showModal();
    if (!menuOpen && d.open) d.close();
  }, [menuOpen]);

  // Widening the window past the breakpoint brings the sidebar back, so the drawer goes.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const onChange = () => wide.matches && setMenuOpen(false);
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);

  const sidebar = (
    <>
      <Link href={items[0].href} className="rounded-md px-2 py-2" onClick={() => setMenuOpen(false)}>
        <Logo />
      </Link>
      <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          const showDot = href === "/notifications" && unread > 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-[15px] leading-5 font-semibold transition-colors duration-150",
                active ? "bg-brand-100 text-brand-800" : "text-ink hover:bg-brand-50",
              )}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              {label}
              {showDot && (
                <>
                  <span className="ml-auto size-2 rounded-full bg-brand-700" aria-hidden />
                  <span className="sr-only">{unread} unread</span>
                </>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        <div className="min-w-0 px-2">
          <p className="truncate text-sm leading-5 font-semibold">{user.name}</p>
          <p className="truncate text-[13px] leading-[18px] text-muted">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-brand-700 hover:bg-brand-100"
        >
          <LogOut size={18} strokeWidth={1.75} aria-hidden />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div data-density={reviewer ? "compact" : "comfortable"} className="app-shell min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] flex-col border-r border-border bg-card p-4 lg:flex">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card px-3 lg:hidden">
        <button
          type="button"
          aria-label="Open the menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          className="relative flex size-11 items-center justify-center rounded-md text-ink hover:bg-brand-50"
        >
          <MenuIcon size={22} strokeWidth={1.75} aria-hidden />
          {unread > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-brand-700" aria-hidden />}
        </button>
        <Link href={items[0].href} className="rounded-md px-1 py-1">
          <Logo />
        </Link>
      </header>
      <dialog
        ref={drawer}
        aria-label="Menu"
        onClose={() => setMenuOpen(false)}
        // A click on the dialog element itself is a click on the backdrop.
        onClick={(e) => e.target === e.currentTarget && setMenuOpen(false)}
        className="drawer m-0 h-full max-h-none w-[min(288px,calc(100%-48px))] max-w-none border-r border-border bg-card p-0 text-ink shadow-modal"
      >
        {menuOpen && (
          <div className="flex h-full flex-col p-4">
            <button
              type="button"
              aria-label="Close the menu"
              onClick={() => setMenuOpen(false)}
              className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-md text-muted hover:bg-brand-50"
            >
              <X size={20} strokeWidth={1.75} aria-hidden />
            </button>
            {sidebar}
          </div>
        )}
      </dialog>

      <main className="lg:pl-[248px]">
        <div
          className={cn(
            "mx-auto flex flex-col gap-[var(--section-gap)] p-[var(--page-pad)]",
            reviewer ? "max-w-[1440px]" : "max-w-[1040px]",
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
