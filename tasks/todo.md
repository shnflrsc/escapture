# Tasks: Student Vault redesign

Plan and rationale: [plan.md](plan.md). **Approved and implemented.** Browser checks were run with a throwaway headless-Chrome script, not a test kept in the repository.

Standing checks for every task: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and the page still loads signed in as a student.

---

## Phase 1: Foundation

### - [x] Task 1: Evidence list query

**Description:** Extend the list service so the vault can search, filter and sort on the server, and so "My evidence" rows know whether an item is in a case and whether it is locked. The existing `GET /api/evidence` keeps working for callers that send no new parameters.

**Acceptance criteria:**
- [x] `listEvidence` accepts optional `q` (matches the name; on the shared scope also the sharer's name), `kind` and `sort` (newest, oldest, name), and returns the same items as today when none are given.
- [x] "Mine" rows carry `caseCount` and `locked`; shared rows carry neither.
- [x] A count per scope is available for the tab labels.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test`
- [x] `pnpm smoke` passes with new checks: search narrows the list, an unknown `kind` or `sort` is a 400, a recipient's shared list has no case fields.

**Dependencies:** None

**Files likely touched:** `server/services/evidence.ts`, `lib/validators.ts`, `app/api/evidence/route.ts`, `scripts/smoke.ts`

**Estimated scope:** Medium

### - [x] Task 2: Vault table

**Description:** Replace the tall rows on `/vault` with a compact table built for scanning, in a new vault-only component. `EvidenceRow` stays untouched for the case and reviewer pages.

**Acceptance criteria:**
- [x] Columns: Name with kind icon, Kind, Captured, Shared by (shared tab), Status (tamper-check badge; "In a case" or "Locked" when true). The whole row opens the item; long names truncate with the full name available.
- [x] Below 768px the same rows stack as a list (name, then kind and date, then status) with no horizontal scrolling.
- [x] Hover, focus-visible and keyboard activation work on every row; the page looks unchanged for case and reviewer pages.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test`
- [x] Browser check at 1280px and 375px: more rows visible than before, nothing clipped, Tab reaches each row and Enter opens it.

**Dependencies:** Task 1

**Files likely touched:** `components/safetrail/vault-table.tsx` (new), `app/(app)/vault/page.tsx`

**Estimated scope:** Small

### Checkpoint: Foundation
- [x] Standing checks pass
- [x] Vault shows the real data in the new table, both tabs
- [x] Review with human before continuing

---

## Phase 2: Finding things

### - [x] Task 3: Toolbar and address state

**Description:** Add the controls for finding an item, with their state in the address so it survives opening an item and coming back.

**Acceptance criteria:**
- [x] Tabs show counts. Search, kind filter (All, Posts, Messages) and sort (Newest, Oldest, Name) each change the list, and are reflected in `?tab=&q=&kind=&sort=`. Switching tab keeps the search text.
- [x] Opening an item and pressing Back returns to the same filtered list. The controls work with JavaScript disabled (a plain form).
- [x] When filters match nothing, a "no matches" state names what was searched and offers Clear; it is different from the empty-vault state.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test`
- [x] Browser check: type a search, filter, sort, open an item, go back; reload the address directly; clear.

**Dependencies:** Tasks 1, 2

**Files likely touched:** `components/safetrail/vault-toolbar.tsx` (new), `app/(app)/vault/page.tsx`

**Estimated scope:** Medium

### - [x] Task 4: How to capture, on demand

**Description:** Move the permanent "How to capture" panel behind a header button that opens the same content in a dialog.

**Acceptance criteria:**
- [x] A "How to capture" button in the page header opens the existing steps and the loaded-messages note in a dialog; the panel no longer sits under the list.
- [x] The empty-vault state still explains what to do and offers the same button.
- [x] The dialog closes on Escape, returns focus to the button, and is not left open after navigating away.

**Verification:**
- [x] `pnpm typecheck && pnpm lint`
- [x] Browser check: open and close by mouse and keyboard, on an empty and a non-empty vault.

**Dependencies:** None

**Files likely touched:** `components/safetrail/how-to-capture.tsx` (new), `app/(app)/vault/page.tsx`

**Estimated scope:** Small

### Checkpoint: Finding things
- [x] Standing checks and `pnpm smoke` pass
- [x] A student with 20+ items can find one by name in a few seconds
- [x] Review with human before continuing

---

## Phase 3: Acting on items

### - [x] Task 5: Menu primitive

**Description:** One accessible menu component in the existing UI kit, for row actions.

**Acceptance criteria:**
- [x] A button with an accessible name opens a menu; arrow keys move between items, Enter or Space activates, Escape closes and returns focus, clicking outside closes.
- [x] Items support a disabled state with a visible reason, and a danger style.
- [x] Uses existing tokens only; respects reduced motion.

**Verification:**
- [x] `pnpm typecheck && pnpm lint`
- [x] Keyboard-only walkthrough; check it is not clipped at the bottom and right edges of the window.

**Dependencies:** None

**Files likely touched:** `components/ui/menu.tsx` (new)

**Estimated scope:** Small

### - [x] Task 6: Row actions

**Description:** Let the owner act on an item from the list: Open, Rename, Share by email, Create password link, Delete. Reuses the existing dialogs and API routes; no server rule changes.

**Acceptance criteria:**
- [x] The dialogs currently inside `evidence-actions.tsx` are usable from both the detail page and a row menu, and the detail page behaves exactly as before.
- [x] Owner rows offer all five actions; shared rows offer Open only. Delete and Rename are disabled with the existing explanation when the item is locked.
- [x] After each action the list updates, a toast confirms it, and a failure shows the server's message with the dialog still open.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke`
- [x] Browser check: rename, share, create link, delete from the list; the same four from the detail page; a locked item; a shared item.

**Dependencies:** Tasks 2, 5

**Files likely touched:** `components/safetrail/evidence-actions.tsx`, `components/safetrail/share-dialogs.tsx`, `components/safetrail/vault-table.tsx`, `app/(app)/vault/[id]/page.tsx`

**Estimated scope:** Medium

### Checkpoint: Acting on items
- [x] Standing checks and `pnpm smoke` pass
- [x] Every visible control on the vault does what it says; none is a placeholder
- [x] Review with human before continuing

---

## Phase 4: Narrow screens and finish

### - [x] Task 7: Collapsible navigation (only if Open question 1 is answered yes)

**Description:** Below 1024px the sidebar becomes a drawer opened from a small top bar, so the vault is usable on tablets and phones. At 1024px and wider nothing changes.

**Acceptance criteria:**
- [x] At 1024px and wider every page renders exactly as it does today.
- [x] Below 1024px a top bar shows the logo and a menu button; the drawer lists the same destinations, shows the active one, closes on Escape, on choosing a destination and on outside click, and traps focus while open.
- [x] DESIGN.md §1, §6 and §16 are updated to match, with your approval of the wording.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm build`
- [x] Browser check of the vault, a case page and the review board at 1280px, 768px and 375px.

**Dependencies:** None (decision needed)

**Files likely touched:** `components/safetrail/app-shell.tsx`, `app/(app)/layout.tsx`, `DESIGN.md`

**Estimated scope:** Medium

### - [x] Task 8: Verification pass and cleanup

**Description:** Check the finished page against the brief's acceptance criteria and remove anything left over.

**Acceptance criteria:**
- [x] Each of the brief's thirteen acceptance criteria is checked off with what was observed, or listed as a remaining limitation.
- [x] Contrast of any new colour pair is computed and recorded as DESIGN.md §4.4 requires; no new hex values in components.
- [x] No unused components, styles or exports remain from the old vault layout; README mentions the new controls where it describes the vault.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke && pnpm build`
- [x] Keyboard-only run through the whole page; widths 1280, 768 and 375.

**Dependencies:** Tasks 1 to 6 (and 7 if included)

**Files likely touched:** `README.md`, `DESIGN.md`, files touched above

**Estimated scope:** Small

### Checkpoint: Complete
- [x] All acceptance criteria met or listed as limitations
- [x] Ready for review
