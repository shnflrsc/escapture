# DESIGN.md changes

Apply these edits to `DESIGN.md` in Task 1. Everything not listed stays as it is.

## §1 Product context: "Target" paragraph

Replace:

> Below 1024px the sidebar becomes a drawer opened from a top bar, and the Vault is laid out for tablets and phones.

with:

> Below 1024px the sidebar becomes a drawer opened from a menu button in the header, and the Vault is laid out for tablets and phones.

## §6 Layout, spacing and density

Replace the **App shell** bullet with:

- **App shell:** a left sidebar (248px, `card` background, 1px right `border`) and a content column on `canvas`. The content column starts with a **header** (64px, `card`, 1px bottom `border`, sticky). The account menu sits at the right of the header, not in the sidebar.

Replace the **Sidebar navigation** bullet list with:

- **Sidebar**
  - Logo, then the role label in 13px `muted` ("Student", "Case reviewer", "Administrator").
  - A sentence-case group label above the nav ("Your space", "Reviews", "Administration"), 13px 600 `muted`.
  - Students: Vault, Cases, Notifications.
  - Reviewers: Review Board, Shared with me, Case Archives, Notifications.
  - Administrators: Reviewer accounts, Notifications.
  - Active item: `brand-100` background, `brand-800` text, 10px radius, 44px tall. Unread notifications show a small `brand-700` dot, not a red count badge.
  - A small `brand-50` help card at the bottom (one heading, one sentence, at most one link), then Help, Privacy and Terms links.
- **Header**
  - Left: breadcrumbs. A top-level page shows its name. A detail page shows `Section › Title`, with the section as a `brand-700` link.
  - Middle: one search field (320px, 40px tall) that searches the role's main list.
  - Right: Help, the notification bell, a divider, then the account button (avatar initials, name, role) that opens the account menu with Sign out.
  - Below 1024px the menu button that opens the sidebar drawer joins the header at the far left and the search wraps to its own row. There is never a second bar.

Replace the **Page structure** bullet with:

- **Page structure:** H1 and one short sentence of context on the left, at most one primary button on the right, then content. Do not stack banners above the header. The page H1 is the page's own title; the header breadcrumb doesn't replace it.

Replace the "Designed for 1024px and wider" bullet's first sentence with:

> Below 1024px the sidebar collapses into a drawer opened from the header's menu button, page padding tightens, and the Vault table stacks into a list.

## §9 Components: add three subsections after "Tables (reviewer views)"

### Notification bell and popover
- Bell: a 44×44 icon button in the header, `aria-label="Notifications, N unread"`, with a `brand-700` dot ringed in `card` when anything is unread. Never a number bubble or red badge.
- Popover:
  - Layout: 400px wide, `card`, `shadow-raised`, 12px radius, anchored under the bell.
  - Head: "Notifications" (Lora 17px) and a ghost "Mark all as read".
  - Rows: a 32px icon circle, title (14px), relative time (13px `muted`) and an unread dot. Unread rows are tinted `brand-50`.
  - Footer: "View all notifications".
  - Icon circle by type: escalation uses amber attention tokens, closing uses closed tokens, a saved capture uses tamper tokens, and anything else uses `brand-100`.
  - Behaviour: Escape and an outside click close it, and focus returns to the bell.
- Notifications never show evidence contents, only titles and short excerpts.

### Reviewer dashboard (Review Board only)
- Order:
  1. Page header.
  2. At most 4 summary tiles: label, count in Lora 32px, one plain line of context. No arrows, sparklines or percentages without the count.
  3. At most one chart and one status breakdown, each in a panel.
  4. One toolbar row: status tabs, search, filter chips, and a ghost "Clear filters" that shows only when a filter is on.
  5. The table with pagination.
  6. Recent activity.
- The table is the job. Tiles and the chart summarise it and never replace it.
- Chart colors come from the chart tokens (`chart-primary`, `chart-escalated`, `chart-review`, `chart-closed`), never badge colors. Never red, even when numbers rise.
- Administrators get the same shell with a plain table and no tiles or charts.

### Account menu
- Opens from the header's account button. It shows the name and email, then "Sign out". It uses the same menu component as row menus.

## §10.7 Reviewer separation: append

- The "Added by reviewers" section uses a dashed 1px `border-strong` edge on `brand-50` and starts with an eye-off icon and the line "Only reviewers can see this section. The student who reported and collaborators can't."

## §16 Never do this: edit

Replace:

> Dense dashboards for students: no widget grids, stat tiles or charts on student screens.

with:

> Dense dashboards for students: no widget grids, stat tiles or charts on student screens. On reviewer screens: no more than four tiles, more than one chart per view, dual axes or pie charts.

Add:

> A red count badge on the notification bell, or a second top bar under 1024px.

## §17 Pre-merge checklist: add

- [ ] Header breadcrumb and search work on the page; the bell popover opens, closes on Escape and returns focus.
