"use client";

import {
  Archive,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Columns3,
  FolderOpen,
  Inbox,
  LockKeyhole,
  LogOut,
  Menu as MenuIcon,
  Search,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useRef, useState } from "react";
import { Menu } from "@/components/ui/menu";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { HowToCapture } from "./how-to-capture";
import { Logo } from "./logo";
import { NotificationPopover } from "./notification-popover";

type Role = "student" | "reviewer" | "admin";
type NavItem = { href: string; label: string; Icon: typeof Bell; match: (p: string) => boolean };

const NAV: Record<Role, NavItem[]> = {
  student: [
    { href: "/vault", label: "Vault", Icon: LockKeyhole, match: (p) => p.startsWith("/vault") },
    { href: "/cases", label: "Cases", Icon: FolderOpen, match: (p) => p.startsWith("/cases") },
  ],
  reviewer: [
    {
      href: "/review",
      label: "Review Board",
      Icon: Columns3,
      // Evidence opens under /vault for every role; for a reviewer it belongs to the board.
      match: (p) =>
        p.startsWith("/vault") ||
        (p.startsWith("/review") && !p.startsWith("/review/archives") && !p.startsWith("/review/shared")),
    },
    { href: "/review/shared", label: "Shared with me", Icon: Inbox, match: (p) => p.startsWith("/review/shared") },
    { href: "/review/archives", label: "Case Archives", Icon: Archive, match: (p) => p.startsWith("/review/archives") },
  ],
  admin: [
    { href: "/admin/reviewers", label: "Reviewer accounts", Icon: Users, match: (p) => p.startsWith("/admin") },
  ],
};

const ROLE: Record<Role, { label: string; group: string; search: { action: string; label: string } }> = {
  student: { label: "Student", group: "Your space", search: { action: "/vault", label: "Search your vault" } },
  reviewer: {
    label: "Case reviewer",
    group: "Reviews",
    search: { action: "/review", label: "Search cases and reporters" },
  },
  admin: {
    label: "Administrator",
    group: "Administration",
    search: { action: "/admin/reviewers", label: "Search reviewer accounts" },
  },
};

// A detail page names itself for the header's breadcrumb. The header belongs to
// the layout, which must not fetch page data, so the page hands its title up.
type Crumb = { path: string; title: string; section?: string };
const CrumbContext = createContext<(crumb: Crumb) => void>(() => {});

/**
 * Put this on a detail page: the header then shows "Section › {title}". `section`
 * is the address of a different sidebar page to file it under, when the address
 * alone would pick the wrong one (a closed case belongs to the archives).
 */
export function PageCrumbs({ title, section }: { title: string; section?: string }) {
  const set = useContext(CrumbContext);
  const path = usePathname();
  useEffect(() => set({ path, title, section }), [set, path, title, section]);
  return null;
}

/** One search field for the role's main list. A plain GET form: it works without JavaScript. */
function HeaderSearch({ role, className }: { role: Role; className?: string }) {
  const { action, label } = ROLE[role].search;
  const pathname = usePathname();
  const q = useSearchParams().get("q") ?? "";
  // Shows the current search only on the page that is being searched.
  const current = pathname === action ? q : "";
  return (
    <form role="search" action={action} method="get" className={cn("relative", className)}>
      <Search
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
      />
      <input
        key={`${pathname}?${current}`}
        type="search"
        name="q"
        defaultValue={current}
        aria-label={label}
        placeholder={label}
        maxLength={120}
        className="h-10 w-full rounded-md border border-border-strong bg-card pr-3 pl-[38px] text-[15px] leading-5 text-ink placeholder:text-muted"
      />
    </form>
  );
}

const iconButton =
  "relative grid size-11 place-items-center rounded-md text-ink transition-colors duration-150 hover:bg-brand-100 hover:text-brand-800";

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
  const role = ROLE[user.role];
  const items: NavItem[] = [
    ...NAV[user.role],
    { href: "/notifications", label: "Notifications", Icon: Bell, match: (p) => p.startsWith("/notifications") },
  ];
  const home = items[0].href;
  const [crumb, setCrumb] = useState<Crumb | null>(null);
  // A page's crumb only counts on the page that set it.
  const mine = crumb && crumb.path === pathname ? crumb : null;
  const section =
    items.find((item) => item.href === mine?.section) ?? items.find((item) => item.match(pathname)) ?? items[0];
  const detail = mine && pathname !== section.href ? mine.title : null;

  async function signOut() {
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
      <div className="flex flex-col gap-1">
        <Link href={home} className="self-start rounded-md p-2" onClick={() => setMenuOpen(false)}>
          <Logo />
        </Link>
        <span className="px-2 text-[13px] leading-[18px] font-semibold text-muted">{role.label}</span>
      </div>
      <nav aria-label="Main">
        <p className="mb-1 px-3 text-[13px] leading-[18px] font-semibold text-muted">{role.group}</p>
        <ul className="flex flex-col gap-1">
          {items.map(({ href, label, Icon }) => {
            const active = href === section.href;
            const showDot = href === "/notifications" && unread > 0;
            return (
              <li key={href}>
                <Link
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
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto flex flex-col gap-2 rounded-xl bg-brand-50 p-4">
        {user.role === "student" && (
          <>
            <p className="text-sm leading-5 font-semibold">Escrow Capture</p>
            <p className="text-[13px] leading-[18px] text-muted">
              Capture a Facebook post or conversation with the Chrome extension. It goes straight to your vault.
            </p>
            <HowToCapture asLink />
          </>
        )}
        {user.role === "reviewer" && (
          <>
            <p className="text-sm leading-5 font-semibold">Reviewing cases</p>
            <p className="text-[13px] leading-[18px] text-muted">
              SafeTrail supplements the university&apos;s own process. Record the outcome when you close a case.
            </p>
          </>
        )}
        {user.role === "admin" && (
          <>
            <p className="text-sm leading-5 font-semibold">Administrator</p>
            <p className="text-[13px] leading-[18px] text-muted">
              You create reviewer accounts. You can&apos;t see cases or evidence.
            </p>
          </>
        )}
      </div>
      <nav aria-label="Help and legal" className="flex gap-4 px-3 text-[13px] leading-[18px]">
        {[
          ["Help", "/contact"],
          ["Privacy", "/privacy"],
          ["Terms", "/terms"],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="py-1 text-muted hover:text-brand-800 hover:underline">
            {label}
          </Link>
        ))}
      </nav>
    </>
  );

  return (
    <div data-density={user.role === "student" ? "comfortable" : "compact"} className="app-shell min-h-screen">
      <aside
        aria-label="Sidebar"
        className="fixed inset-y-0 left-0 hidden w-[248px] flex-col gap-6 overflow-y-auto border-r border-border bg-card p-4 lg:flex"
      >
        {sidebar}
      </aside>

      <dialog
        ref={drawer}
        aria-label="Menu"
        onClose={() => setMenuOpen(false)}
        // A click on the dialog element itself is a click on the backdrop.
        onClick={(e) => e.target === e.currentTarget && setMenuOpen(false)}
        className="drawer m-0 h-full max-h-none w-[min(288px,calc(100%-48px))] max-w-none border-r border-border bg-card p-0 text-ink shadow-modal"
      >
        {menuOpen && (
          <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
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

      <div className="flex min-h-screen flex-col lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-2 lg:px-8 lg:py-0">
          <button
            type="button"
            aria-label="Open the menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className={cn(iconButton, "-ml-2 lg:hidden")}
          >
            <MenuIcon size={22} strokeWidth={1.75} aria-hidden />
          </button>

          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 flex-1 basis-0 items-center gap-2 text-sm leading-5 font-semibold"
          >
            {detail ? (
              <>
                <Link href={section.href} className="shrink-0 rounded-sm text-brand-700 hover:text-brand-800 hover:underline">
                  {section.label}
                </Link>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
                <span aria-current="page" className="truncate text-ink" title={detail}>
                  {detail}
                </span>
              </>
            ) : (
              <span aria-current="page" className="truncate text-ink">
                {section.label}
              </span>
            )}
          </nav>

          <Suspense fallback={<div className="order-last h-10 w-full lg:order-none lg:w-[320px]" />}>
            <HeaderSearch role={user.role} className="order-last w-full lg:order-none lg:w-[320px]" />
          </Suspense>

          <div className="flex items-center gap-1 lg:gap-2">
            <Link href="/contact" aria-label="Help" title="Help" className={cn(iconButton, "hidden sm:grid")}>
              <CircleHelp size={20} strokeWidth={1.75} aria-hidden />
            </Link>
            <NotificationPopover unread={unread} role={user.role} />
            <span aria-hidden className="mx-1 hidden h-7 w-px bg-border sm:block" />
            <Menu
              label="Account menu"
              triggerClassName="flex h-11 items-center gap-3 rounded-md py-0 pr-2 pl-1 text-left text-ink transition-colors duration-150 hover:bg-brand-50"
              trigger={
                <>
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[13px] leading-none font-bold text-brand-800"
                  >
                    {initials(user.name)}
                  </span>
                  <span className="hidden max-w-[160px] lg:block">
                    <span className="block truncate text-sm leading-[18px] font-semibold">{user.name}</span>
                    <span className="block text-[13px] leading-[18px] text-muted">{role.label}</span>
                  </span>
                  <ChevronDown size={16} strokeWidth={1.75} aria-hidden className="text-muted" />
                </>
              }
              header={
                <div className="mb-1 min-w-0 border-b border-border px-3 pt-2 pb-3">
                  <p className="truncate text-sm leading-5 font-semibold">{user.name}</p>
                  <p className="truncate text-[13px] leading-[18px] text-muted">{user.email}</p>
                </div>
              }
              items={[
                { label: "Sign out", icon: <LogOut size={18} strokeWidth={1.75} aria-hidden />, onSelect: signOut },
              ]}
            />
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <CrumbContext.Provider value={setCrumb}>
            <div
              className={cn(
                // min-w-0: a wide table scrolls inside its own box instead of widening the page.
                "mx-auto flex flex-col gap-[var(--section-gap)] p-[var(--page-pad)] [&>*]:min-w-0",
                user.role === "student" ? "max-w-[1040px]" : "max-w-[1440px]",
              )}
            >
              {children}
            </div>
          </CrumbContext.Provider>
        </main>
      </div>
    </div>
  );
}
