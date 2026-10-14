# Implementation Plan: Dashboard shell, notifications, reviewer dashboard and admin page

Status: **ready to implement.** Tasks are tracked in [todo.md](todo.md). Design source: [reference/](reference/) (the "Escapture Dashboard" canvas, 14 artboards).

This replaces the case-page plan, which is finished and committed. **Its decisions still stand** (autosave and conflicts, no section subtitles or header sentence on the case page, delete, remove and leave, ready-to-escalate check).

## Problem

How might we make Escapture feel like a conventional, predictable web dashboard for all three roles (side menu, header, notifications always within reach), and give reviewers and administrators the screens they are missing, without making student screens busier?

## Overview

1. A new **app header** across every signed-in page: breadcrumbs, search, help, a **notification bell with a popover**, and the account menu. The sidebar keeps the logo and navigation, and gains a role label and a small help card. The account block moves from the bottom of the sidebar into the header's account menu.
2. The **Review Board** becomes a triage dashboard: up to four summary tiles, one chart, a status breakdown, a filterable sortable table of open cases, and recent activity. It replaces the two kanban columns.
3. A new **Reviewer accounts** page for administrators (`/admin/reviewers`), which replaces the CLI as the normal way to create reviewer accounts.
4. Student pages, the reviewer case page, Shared with me and Case Archives get **layout and copy alignment** with the design. Behaviour does not change.

## Route map (artboard → route)

| Artboard (`reference/…`) | Route | Status |
|---|---|---|
| `Sidebar.dc.html`, `Topbar.dc.html` | `components/safetrail/app-shell.tsx` (+ new header and popover components) | Change |
| `Main.dc.html` (Student · Vault) | `/vault` | Align |
| `StudentEvidence.dc.html` | `/vault/[id]` | Align |
| `StudentCases.dc.html` | `/cases` | Align |
| `StudentCase.dc.html` (draft) | `/cases/[id]` while draft | Align, keep case-page decisions |
| `EscalateDialog.dc.html` | escalation preview dialog in `case-actions.tsx` | Align copy |
| `StudentCaseClosed.dc.html` | `/cases/[id]` once escalated or closed | Align |
| `StudentNotifications.dc.html` | `/notifications` (all roles) | Change |
| `ReviewBoard.dc.html` | `/review` | **Rebuild** |
| `ReviewCase.dc.html` | `/review/[id]` | Align |
| `SharedWithMe.dc.html` | `/review/shared` | Align |
| `Archives.dc.html` | `/review/archives` | Align |
| `AdminReviewers.dc.html` | `/admin/reviewers` | **New** |

## Decisions already made

These were settled when the design was made. Don't reopen them; follow them.

- **Header on desktop.** DESIGN.md said "No top bar". The user asked for a conventional layout with a header, so the header is added at every width. The DESIGN.md edits are in [design-md-changes.md](design-md-changes.md).
- **Notifications** live in two places: a popover from the bell (the latest items, "Mark all as read", "View all notifications") and the existing `/notifications` page, which gains Unread/All tabs and day groups (Today, Earlier this week, Earlier). Unread is a small `brand-700` dot. **Never a red count badge.** In-app only: no email or text.
- **Review Board is a table, not kanban.** The order follows the design system's dashboard rules: PageHeader (date range on the right) → at most 4 tiles → one bar chart and one status breakdown → toolbar (status tabs, search, filter chips, "Clear filters") → table with pagination → recent activity. Closed cases stay out of the table; they are in Case Archives.
- **Students never get tiles, charts or dense dashboards.** Student pages keep comfortable density.
- **Reviewer separation stays visible.** On `/review/[id]`, the reporter's evidence and "Added by reviewers" are separate sections. The reviewer section has a dashed `border-strong` edge on `brand-50` and the line "Only reviewers can see this section. The student who reported and collaborators can't."
- **One StatusBadge.** Keep `components/ui/badge.tsx` as the single place statuses are styled, including the existing draft label ("Draft, private"). The design's outlined draft pill is only a mockup stand-in, so don't add a second draft style.
- **Wording.** "Captured with tamper checks" for students and "Passed tamper checks" for reviewers. Never "verified", "authentic", "tamper-proof" or "proof".
- **The case page keeps its earlier decisions.** The draft-case artboard shows a header sentence ("Private. Only you and the people you added can see this case.") and a "What happens next" card. The case-page plan removed explanatory text on purpose, so **leave both out**. Take only the layout (details and evidence on the left, people on the right) where it fits the current page.

## Decisions with defaults (proceed with the default unless the user says otherwise)

- **Admin provisioning (no email).** The MVP has no email delivery, and the proposal puts email notifications out of scope. The design's "send setup link" therefore becomes: the admin enters a name, an email and a temporary password, and the account is created through the same path as `scripts/lib/users.ts` (`ensureUser`, role `reviewer`). The form says "Share the temporary password with the reviewer in person or through your office's usual channel." Button label: "Create reviewer account". *A one-time setup link (`/setup/[token]` using Better Auth's `verification` table) is a P1 option. Ask first.*
- **Office column.** There is no `office` field on `user`. Leave the Office column and select out of P0. *Adding it is a schema change. Ask first.*
- **Account status.** P0 shows every reviewer account as Active, with "Last sign-in" taken from the newest `session.createdAt`, or "Not yet". Deactivate and reactivate are P1. *They need a way to block sign-in (for example Better Auth's admin plugin `banned` fields, or a column). Ask first.*
- **Admin home.** Change `homeFor("admin")` in `server/auth.ts` from `/notifications` to `/admin/reviewers`. Admin sidebar: Reviewer accounts, Notifications.
- **Header search** submits a GET form. Students go to `/vault?q=…`, which the vault already supports; the placeholder is "Search your vault". Reviewers go to `/review?q=…` (new filter on the board); the placeholder is "Search cases and reporters". Admins go to `/admin/reviewers?q=…`. No global search across entities.
- **Reviewer "Notifications"** uses the same `/notifications` page as students. Only the content differs, and the server already scopes it per user.
- **Popover data.** On open, the popover fetches `GET /api/notifications` (already exists) and shows the latest 6. "Mark all as read" calls the existing `POST /api/notifications/read`. The unread dot comes from the `unread` prop the layout already passes to the shell. After marking read, call `router.refresh()`.

## The shell (P0)

Reference: `reference/Sidebar.dc.html`, `reference/Topbar.dc.html`, and the `.sb`, `.hd`, `.pop` rules in `reference/app.css`.

**Sidebar** (248px, `card`, 1px right `border`):
- Logo (existing `<Logo />`) with the role label under it in 13px `muted`: "Student", "Case reviewer" or "Administrator".
- A sentence-case group label above the nav: "Your space" (student), "Reviews" (reviewer), "Administration" (admin). 13px 600 `muted`. Never uppercase.
- Nav items stay as today, plus **admin: Reviewer accounts (`Users` icon) and Notifications**. Items are 44px tall with a 10px radius. Active: `brand-100` background and `brand-800` text. Notifications shows the unread dot.
- Help card at the bottom, `brand-50` with a 12px radius:
  - Student: "Escapture extension", "Capture a Facebook post or conversation with the Chrome extension. It goes straight to your vault.", and a link "How to capture" that opens the existing `HowToCapture`.
  - Reviewer: "Reviewing cases", "Escapture supplements the university's own process. Record the outcome when you close a case."
  - Admin: "Administrator", "You create reviewer accounts. You can't see cases or evidence."
- Footer links: Help, Privacy (`/privacy`), Terms (`/terms`), 13px `muted`.
- The name, email and Sign out block is **removed** from the sidebar (it moves to the header).

**Header** (64px, `card`, 1px bottom `border`, padding 0 32px, sticky at the top of the content column):
- Left: **breadcrumbs**. A top-level page shows just its name. A detail page shows `Section › Item title`, with the section as a `brand-700` link and the title in `ink`, truncated with an ellipsis. Pages pass the trail. Suggested API: a `<PageCrumbs items=[…] />` that the header renders through a small context or a slot. Pick the simplest approach that works with Cache Components and Suspense.
- Middle: a **search** form, 320px, 40px tall, `border-strong`, with a search icon (see "Decisions with defaults" for targets).
- Right: a Help icon button (links to `/contact`, or the help page if one exists), the **bell** button, a 1px divider, and the **account button** (avatar initials in a `brand-100` circle, name, role and a chevron). The account button opens the existing `components/ui/menu.tsx` with the name and email, and "Sign out", using the existing sign-out logic.
- Bell: a 44×44 icon button, `aria-label="Notifications, N unread"`, `aria-haspopup="dialog"` and `aria-expanded`, with a `brand-700` dot ringed in `card` when there is anything unread.
- Below 1024px the header wraps. A menu button (the existing drawer trigger) moves into the header at the far left and the search drops to its own row. The current mobile-only top bar is merged into this header; don't keep two bars.

**Notification popover:** 400px wide, `card`, `shadow-raised`, 12px radius, anchored under the bell.
- Head: H2-styled "Notifications" (Lora 17px) and a ghost small "Mark all as read".
- List: each row has a 32px icon circle, the title (14px), the relative time (13px `muted`) and an unread dot. Unread rows have a `brand-50` background.
- Icon circle by type: escalation uses the amber attention tokens, closing uses the closed tokens, a saved capture uses the teal tamper tokens, and anything else uses `brand-100`.
- Each row links to its case or evidence.
- Footer: link "View all notifications" to `/notifications`.
- Empty state: "You're all caught up."
- Behaviour: closes on Escape and on an outside click, returns focus to the bell, and traps focus while open. Reuse `components/ui/dialog.tsx` or the menu primitive if either supports anchored popovers; otherwise use a small non-modal disclosure.

## Pages

### `/notifications` (P0)
- PageHeader: "Notifications", "Updates about your cases and evidence people share with you. Notifications never show the contents of your evidence." Secondary button "Mark all as read" (keep `notification-actions.tsx`).
- Tabs "All N" / "Unread N", using a `?tab=unread` search param.
- Group the list by day: Today, Earlier this week, Earlier. Each group is a bordered `card` list with the same row anatomy as the popover. Unread rows have 600-weight text and a dot.
- Footer caption: "Escapture sends notifications in the app only. Nothing is sent by email or text."

### `/review`: Review Board (P0 table, P1 chart and feed)
- PageHeader: "Review Board", "Cases students have escalated. Open a case to review it. Closed cases move to Case Archives." Right: a date-range select (P1; P0 can omit it).
- **Tiles (P0)**, compact `StatTile`: label with icon, the count in Lora 32px, and one plain line of context.
  1. Escalated: count; note "N new this week". New means `escalatedAt` within the last 7 days.
  2. Under Review: count; note "Oldest has been open N days", from the oldest `under_review` case's escalation time.
  3. Shared with you: evidence shared with this reviewer that isn't attached to any case; note "Not yet attached to a case".
  4. Closed this month: count of `closed` events this calendar month.
  - No arrows, percentages or sparklines.
- **Chart (P1):** a "Cases escalated per week" panel (last 7 weeks) with one `brand-700` series, a tooltip on each bar and a "View as table" link. Plain SVG, as in the design-system bundle's `BarChart` (`reference/ds/components/bundle.js`).
- **Status breakdown (P1):** a "Cases by status" panel covering this semester, with a stacked bar plus a legend that lists every status with its count. Use the `chart-escalated`, `chart-review` and `chart-closed` tokens. Add those tokens to `globals.css` from `reference/ds/tokens.json`.
- **Toolbar (P0):**
  - Status tabs "All open N / Escalated N / Under Review N", via `?status=`.
  - Search via `?q=`, matching the title or the reporter's name.
  - P1 filter chips: "Has collaborators" and "Has reviewer attachments", plus a ghost "Clear filters" that appears only when a filter is on, and a result count.
- **Table (P0):**
  - Columns: Case (600 weight, links to `/review/[id]`), Status (`StatusBadge`), Reporter, Collaborators (right-aligned), Evidence (right-aligned), Escalated (date, `muted`), Last update (latest `case_events` row, phrased plainly, P1).
  - Sortable headers for Status, Reporter and Escalated, via `?sort=`. Default: oldest escalated first, matching today's `listBoard` order.
  - Rows are 44px, hover `brand-50`, focusable, and open on Enter. The whole row is clickable through a link in the title cell plus a row click handler.
  - Pagination after 20 rows.
  - An empty result is an `EmptyState` with "Clear filters", never a blank table.
- **Recent activity (P1):** the latest 8 `case_events` across open cases, newest first. Each item shows an icon, one sentence and a mono timestamp.
- The kanban `Column` component goes away.

### `/review/[id]`: reviewer case page (P0 layout)
- Header:
  - H1 is the case title.
  - Meta row: `StatusBadge`, "Escalated {date}", and a lock icon with "Locked by the student".
  - Right side: the existing status action. A select or button that moves the case from Escalated to Under Review is fine, as long as it uses what `review-actions.tsx` already does.
- Two columns, `minmax(0,1fr) 380px`:
  - **Left, top:** a "Description from the student" panel.
  - **Left, middle:** "Reporter's evidence", a table with Evidence, Added by, Captured (mono), Tamper checks ("Passed tamper checks") and Open.
  - **Left, bottom:** the "Added by reviewers" zone, with a soft button "Attach shared evidence" that goes to `/review/shared`.
  - **Right:** a "People" panel (reporter and collaborators with emails), a "Status history" panel (existing `timeline.tsx`), and a "Close this case" panel. That panel has a textarea labelled "Actions taken", the helper text "The student who reported and collaborators will see this note. The case then moves to Case Archives." and a primary "Close case" button. This is the only primary action on the page.
- Once closed, the close panel is replaced by the closing note.

### `/review/shared` (P0 copy and columns)
- PageHeader: "Shared with me", "Evidence other Escapture users shared with you by email or password link. Attach it to a case to keep it with the review." Secondary button "Open a password link" (P1; the redeem flow already exists at `/s/[token]`).
- One info banner: "When you attach shared evidence to a case, it goes in “Added by reviewers”. The student who reported never sees it."
- Tabs: "Not attached N" / "All N".
- Columns: Evidence, Shared by, Via (an inbox icon with "Email", or a lock icon with "Password link"), Captured, Tamper checks, Attached to (the case name, or "Not attached" in `muted`), and an action. The action is "Attach to case" (secondary, small, using the existing `attach-to-case.tsx`) or "Open case".
- Via and Attached to are new fields. If `evidence_shares` doesn't record the channel, show Via as P1.

### `/review/archives` (P0 columns)
- PageHeader: "Case Archives", "Closed cases, so you can look up how earlier cases were handled. Archived cases can't be changed." Right: a closed-date select (P1).
- Toolbar: search (cases, reporters or closing notes; extend `listArchives`'s `q` to match the note), P1 chips "Closed by me" and "Has reviewer attachments", and a result count.
- Columns: Case, Reporter, Escalated, Closed (sorted newest first), Closed by, Closing note (one line, clamped, `muted`), Evidence.

### `/admin/reviewers` (P0, new)
- Role-gated with `pageUser(["admin"])`. Compact density, reviewer width.
- PageHeader: "Reviewer accounts", "Create accounts for the university's designated case reviewers. Students sign up on their own with a BulSU email."
- Layout: table on the left; a "Create a reviewer account" panel on the right, 400px wide, stacked below the table under 1024px.
- Table:
  - Columns: Reviewer (avatar initials, name and email), Status (P0 is always Active, using the teal pill), Created, and Last sign-in.
  - Tabs and search are P1. Add `?q=` search if there's time.
- Form:
  - Fields: "Full name", "University email" (helper "Use the reviewer's bulsu.edu.ph address."), "Temporary password" (at least 8 characters, matching the CLI; include a show/hide toggle).
  - A `brand-50` note: "Reviewers can see every escalated case on the shared Review Board, including who reported it and every collaborator."
  - A primary button, "Create reviewer account".
  - On success: a success toast "Reviewer account created", the form clears, and the table refreshes.
  - Errors: plain sentences under the fields. Never red-fill a field.
- Server:
  - Add `POST /api/admin/reviewers` (admin only, validated with zod) that calls the same logic as `ensureUser` with role `reviewer`. Move that logic from `scripts/lib/users.ts` into `server/services/admin.ts` and import it from both places.
  - The route must refuse to change the role of an existing **student** account. Return 409: "That email already belongs to a student account."
  - Add `listReviewers()` to the same service.
- Tests:
  - Add `canProvisionReviewer` (admin only) to `server/authz.ts`, with tests in `tests/authz.test.ts`.
  - Cover the route in `tests/routes.test.ts`.

### Student pages (P0 is the shell only; alignment is P1)
- **`/vault`:** keep the current table and toolbar. P1 changes:
  - Columns: Evidence (kind icon, title, kind and source), Captured (mono), Tamper checks (badge), In cases (the case name, or "Not in a case" in `muted`), Sharing ("Private" with an eye-off icon, "Shared with N people" with a users icon, or "Password link" with a lock icon), and the row menu.
  - Sharing needs a share count and a link count added to `listEvidence`'s `mine` query.
  - A footer caption under the table: "Only you can see your vault. Nothing reaches reviewers until you escalate a case."
  - The page's primary button stays `HowToCapture`, labelled "Capture evidence".
- **`/vault/[id]`:** already matches (viewer, then Integrity, Cases and Sharing cards). Align the header meta row: kind · "Captured {time}" · Private/Shared. Actions: secondary "Share", primary "Add to case", and the More menu.
- **`/cases`:**
  - Add tabs All / Drafts / With reviewers / Closed via `?tab=` (P1).
  - Each row: a folder icon tile, the title (Lora 17px), meta ("Your case · N evidence items · N collaborators · Updated {date}", or "{Owner} added you · …"), the StatusBadge, a lock icon for escalated cases, and a chevron.
  - Caption: "Escalated cases are locked. You can always see their status and the closing note here."
- **`/cases/[id]` (closed or locked):**
  - Show a `brand-50` lock line under the header: "Locked since {date}. Reviewers can see this case. It can't be edited or withdrawn."
  - When the case is closed, the "Closing note from the reviewer" card comes first, then "What you escalated", with the Status timeline on the right.
- **Escalation preview dialog:**
  - Title: "Review what reviewers will see".
  - Sections on `subtle`: Case (title and description), "People reviewers will see (N)" with emails, and "Attached evidence (N)" with tamper badges.
  - A `brand-50` lock panel: "Once you escalate, this case is locked. You can't edit or withdraw it, and attached evidence can't be deleted."
  - Actions: ghost "Go back" and weighty "Escalate to reviewers".
  - Keep the ready-to-escalate checks from the earlier plan.

## Server additions (summary)

| Need | Where | Priority |
|---|---|---|
| Board filters (`status`, `q`, `sort`) and page size | `listBoard` in `server/services/review.ts` | P0 |
| Board tile counts | new `boardSummary(actor)` in `review.ts` | P0 |
| Admin create and list reviewers | new `server/services/admin.ts`, `app/api/admin/reviewers/route.ts`, `canProvisionReviewer` | P0 |
| `homeFor("admin")` set to `/admin/reviewers` | `server/auth.ts` | P0 |
| Header search targets | page `searchParams` (vault exists; board new; admin new) | P0 |
| Notifications tabs and day grouping | `/notifications` page; `listNotifications` already returns `readAt` and `createdAt` | P0 |
| Weekly escalations, status breakdown, recent activity | `review.ts` (queries on `cases.escalatedAt` and `case_events`) | P1 |
| Last update per case | latest `case_events` per case | P1 |
| Vault sharing summary | `listEvidence` (`mine`) subqueries on shares and links | P1 |
| Shared-with-me "attached to" and "via" | the shared list query | P1 |
| Archive search across closing notes | `listArchives` | P1 |

No schema change in any P0 task.

## Dependency graph

```
Task 1  DESIGN.md + tokens                       (first)
Task 2  Shell: sidebar + header + account menu   (needs 1)
  ├── Task 3  Notification popover               (needs 2)
  │     └── Task 4  /notifications tabs + groups
  ├── Task 5  Breadcrumbs + header search on every page
  ├── Task 6  Review Board table + tiles         (needs 2)
  │     └── Task 11 (P1) chart, breakdown, activity, filter chips
  ├── Task 7  Admin: reviewer accounts           (needs 2)
  └── Task 8  Reviewer case page layout
Task 9  Shared with me + Archives columns
Task 10 Verification pass (P0 done)
Tasks 12–14 (P1) student page alignment
Task 15 Final verification
```

## Risks

- **Breadcrumb titles under Cache Components and Suspense.** The header renders in the layout, and titles come from pages. Keep this simple, for example with the breadcrumb rendered at the top of each page's content and portalled into the header, or a client context the page sets. Don't make the layout fetch page data.
- **Popover and drawer focus.** Below 1024px the drawer is a modal `<dialog>`. Make sure the bell popover and the drawer never open together.
- **The Review Board is a reviewer's main screen.** Make sure the table still works at 1024px; it scrolls sideways inside its box, never the page.
