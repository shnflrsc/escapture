# Tasks: Dashboard shell, notifications, reviewer dashboard, admin page

Plan and rationale: [plan.md](plan.md). Design source: [reference/](reference/).

**Standing checks after every task:**

- Run `pnpm typecheck && pnpm lint && pnpm test`.
- Sign in as each seeded role (`pnpm db:seed` prints the accounts) and check that every page in that role's sidebar loads at 1280px and 375px, with no sideways page scroll.
- Check the keyboard path: Tab reaches every control, the focus ring is visible, and Escape closes popovers and dialogs.

Do every **P0** task before any **P1** task. Commit after each task.

---

## Phase 1: Foundation (P0)

### - [x] Task 1: Update DESIGN.md and tokens

**Description:** Apply [design-md-changes.md](design-md-changes.md) to `DESIGN.md`. Add the chart tokens (`--chart-primary`, `--chart-fill`, `--chart-grid`, `--chart-axis`, `--chart-escalated`, `--chart-review`, `--chart-closed`) and `--shadow-drawer` to `app/globals.css`, with values from `reference/ds/tokens.json`. Map them in `@theme inline`.

**Acceptance criteria:**
- [x] DESIGN.md describes the header, the notifications popover and the reviewer dashboard. "No top bar" is gone.
- [x] The new tokens exist, and no raw hex values appear in components.

**Verification:** `pnpm lint`, and read through the DESIGN.md diff.

**Files likely touched:** `DESIGN.md`, `app/globals.css`

**Estimated scope:** Small

### - [x] Task 2: Shell: sidebar and header

**Description:** Rework `components/safetrail/app-shell.tsx` into a sidebar plus a content column with a 64px sticky header (`reference/Sidebar.dc.html`, `reference/Topbar.dc.html`, `.sb`/`.hd` in `reference/app.css`). Move the account block into a header account menu. Add the admin nav (Reviewer accounts, Notifications). Merge the mobile top bar into the header.

**Acceptance criteria:**
- [x] Sidebar: logo, role label, group label, nav with active state and unread dot, role help card, footer links. No account block.
- [x] Header: breadcrumb slot, search slot, Help, bell (with dot when anything is unread), divider, account button that opens a menu with name, email and "Sign out".
- [x] Below 1024px: the menu button sits in the header and opens the existing drawer, the search wraps to its own row, and there is only one bar.
- [x] Students get comfortable density and reviewers and admins get compact, as today.

**Verification:** Standing checks, plus sign out from the header menu for each role.

**Dependencies:** Task 1

**Files likely touched:** `components/safetrail/app-shell.tsx`, new `components/safetrail/app-header.tsx`, `components/safetrail/account-menu.tsx`, `app/(app)/layout.tsx`

**Estimated scope:** Medium

### - [x] Task 3: Notification popover

**Description:** The bell opens a popover with the latest 6 notifications (fetched on open from `GET /api/notifications`), "Mark all as read" (`POST /api/notifications/read`) and "View all notifications".

**Acceptance criteria:**
- [x] Row anatomy follows plan.md: icon circle by type, title, relative time, unread dot, and a `brand-50` background on unread rows. Each row links to its case or evidence.
- [x] The empty state reads "You're all caught up."
- [x] `aria-expanded` and an accessible name with the unread count are set. Escape and an outside click close it, focus returns to the bell, and it never opens together with the drawer.
- [x] After "Mark all as read" the dot disappears (via `router.refresh()`).
- [x] No red badge or count bubble.

**Verification:** Standing checks, plus escalating a case as a student and then seeing the notification in a reviewer's popover.

**Dependencies:** Task 2

**Files likely touched:** new `components/safetrail/notification-popover.tsx`, `components/safetrail/app-header.tsx`

**Estimated scope:** Medium

### - [x] Task 4: `/notifications` tabs and day groups

**Description:** Add All/Unread tabs (`?tab=unread`) and group rows into Today, Earlier this week and Earlier, using the popover's row anatomy (`reference/StudentNotifications.dc.html`).

**Acceptance criteria:**
- [x] Header copy and the footer caption match plan.md. "Mark all as read" still works.
- [x] The page works for students, reviewers and admins.

**Verification:** Standing checks.

**Dependencies:** Task 3

**Files likely touched:** `app/(app)/notifications/page.tsx`, `components/safetrail/notification-actions.tsx`

**Estimated scope:** Small

### - [x] Task 5: Breadcrumbs and header search on every page

**Description:** Every signed-in page sets its breadcrumb trail. Detail pages show "Section › Title". Header search submits to the role's target (plan.md, "Decisions with defaults").

**Acceptance criteria:**
- [x] `/vault/[id]` shows "Vault › {label}", `/cases/[id]` shows "Cases › {title}", and `/review/[id]` shows "Review Board › {title}". Top-level pages show their name.
- [x] Student search goes to `/vault?q=`, reviewer search to `/review?q=`, and admin search to `/admin/reviewers?q=`. The current query is pre-filled.
- [x] The layout doesn't fetch page data to build breadcrumbs.

**Verification:** Standing checks.

**Dependencies:** Task 2 (the board `q` filter lands in Task 6, and the admin `q` in Task 7)

**Files likely touched:** `components/safetrail/app-header.tsx`, each `app/(app)/**/page.tsx`

**Estimated scope:** Small to medium

## Phase 2: Reviewer and admin (P0)

### - [x] Task 6: Review Board table and tiles

**Description:** Replace the kanban columns with tiles, a toolbar and a table (`reference/ReviewBoard.dc.html`).

**Acceptance criteria:**
- [x] Four tiles (Escalated, Under Review, Shared with you, Closed this month), each with a count and one line of context, computed by a new `boardSummary(actor)`.
- [x] Tabs All open / Escalated / Under Review (`?status=`) and search (`?q=`, title or reporter) filter the table.
- [x] Table columns are Case, Status, Reporter, Collaborators, Evidence and Escalated. The Status, Reporter and Escalated headers sort via `?sort=` with `aria-sort`. Rows are focusable and open on Enter.
- [x] Pagination after 20 rows. An empty result shows an `EmptyState` with "Clear filters".
- [x] Closed cases never appear. Drafts never appear (the existing rule).

**Verification:** Standing checks, plus unit tests for the `listBoard` filters and `boardSummary` counts against seeded data.

**Dependencies:** Task 2

**Files likely touched:** `app/(app)/review/page.tsx`, `server/services/review.ts`, new `components/dashboard/stat-tile.tsx`, `components/dashboard/board-table.tsx`, `components/ui/tabs.tsx` (if missing)

**Estimated scope:** Medium to large

### - [x] Task 7: Admin: reviewer accounts

**Description:** New `/admin/reviewers` with a reviewer table and a "Create a reviewer account" form (`reference/AdminReviewers.dc.html`, adapted as plan.md says: temporary password, no Office, no Deactivate in P0).

**Acceptance criteria:**
- [x] Only admins can open it; other roles are redirected home. `homeFor("admin")` returns `/admin/reviewers`.
- [x] `POST /api/admin/reviewers` (zod: name, email, password of 8+ characters) creates a reviewer using shared logic moved from `scripts/lib/users.ts` into `server/services/admin.ts`. The CLI still works.
- [x] An email that already belongs to a student returns 409 with "That email already belongs to a student account." Errors show as plain sentences under the fields.
- [x] The table lists reviewers with Created and Last sign-in ("Not yet" when they have never signed in). Optional `?q=` search.
- [x] On success: the toast "Reviewer account created", the form clears, and the table refreshes.

**Verification:** Standing checks, plus a `canProvisionReviewer` test in `tests/authz.test.ts` and a route test in `tests/routes.test.ts`. Create a reviewer in the browser, then sign in as them.

**Dependencies:** Task 2

**Files likely touched:** `app/(app)/admin/reviewers/page.tsx`, `app/api/admin/reviewers/route.ts`, `server/services/admin.ts`, `server/authz.ts`, `server/auth.ts`, `scripts/lib/users.ts`, `components/safetrail/app-shell.tsx`, `tests/*`

**Estimated scope:** Medium

### - [x] Task 8: Reviewer case page layout

**Description:** Rearrange `/review/[id]` into the two-column layout (`reference/ReviewCase.dc.html`). Behaviour doesn't change.

**Acceptance criteria:**
- [x] Left: Description, the "Reporter's evidence" table ("Passed tamper checks"), and the "Added by reviewers" zone with its privacy line and "Attach shared evidence".
- [x] Right: People (with emails), Status history, and "Close this case" (the "Actions taken" textarea with helper text, and the only primary button). A closed case shows the closing note instead.
- [x] The status change to Under Review still works from the header.

**Verification:** Standing checks, plus taking a case through Escalated → Under Review → Closed. The student sees the note, and never sees reviewer attachments.

**Dependencies:** Task 2

**Files likely touched:** `app/(app)/review/[id]/page.tsx`, `components/safetrail/review-actions.tsx`

**Estimated scope:** Medium

### - [x] Task 9: Shared with me and Case Archives columns

**Description:** Align both tables and their copy with `reference/SharedWithMe.dc.html` and `reference/Archives.dc.html`.

**Acceptance criteria:**
- [x] Shared with me: the info banner, Not attached/All tabs, and the columns Evidence, Shared by, Captured, Tamper checks, Attached to, and action (Attach to case, or Open case). Via is P1 if the data isn't stored.
- [x] Archives: the columns Case, Reporter, Escalated, Closed (newest first), Closed by, Closing note (clamped to one line) and Evidence. Search also matches closing notes.

**Verification:** Standing checks.

**Dependencies:** Task 2

**Files likely touched:** `app/(app)/review/shared/page.tsx`, `app/(app)/review/archives/page.tsx`, `server/services/review.ts`, `server/services/shares.ts`

**Estimated scope:** Medium

### - [x] Task 10: P0 verification pass

**Acceptance criteria:**
- [x] Every role's whole journey works end to end in the browser: capture or seed, case, escalate, notification, review, close, archive, and admin creating a reviewer.
- [x] `pnpm smoke` passes against a running dev server.
- [x] DESIGN.md's pre-merge checklist holds for every changed page.

**Dependencies:** Tasks 1–9

---

## Phase 3: Polish (P1). Only after every P0 task passes.

### - [x] Task 11: Board chart, status breakdown, activity, filter chips
Weekly escalations bar chart (plain SVG, tooltip, "View as table"), a "Cases by status" stacked bar with legend, a recent-activity feed from `case_events`, a "Last update" column, the "Has collaborators" and "Has reviewer attachments" chips, "Clear filters", a result count and the date-range select. At most one chart. Never red.

### - [ ] Task 12: Vault columns
Tamper checks, In cases and Sharing columns (add share and link counts to `listEvidence` `mine`), the footer privacy caption, and the "Capture evidence" label.

### - [ ] Task 13: Cases list tabs and row anatomy; locked and closed case page
Tabs All, Drafts, With reviewers and Closed. Folder icon, lock icon and caption on rows. On the case page: the lock line, then the closing note card first.

### - [ ] Task 14: Sidebar counts and the admin extras (Ask first)
Counts beside Vault, Cases, Review Board and Shared with me. Admin: Office field, Deactivate/Reactivate and the setup-link flow. **Each admin item needs a schema or auth change, so ask the user before starting it.**

### - [ ] Task 15: Final verification
Run the standing checks for every role at 1280px, 1024px and 375px, check reduced motion, and confirm contrast for any new color pair (update DESIGN.md §4.4).
