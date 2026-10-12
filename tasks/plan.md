# Implementation Plan: Student Vault redesign (Google Drive-inspired)

Status: **approved and implemented** with the recommended answers to the open questions (narrow screens: yes; no grid; badge on every row; no preview drawer; Delete in the row menu). Tasks are tracked in [todo.md](todo.md).

## Overview

Redesign `/vault` (the student's evidence list) around the things Google Drive does well: a scannable list, fast ways to find an item, actions on the item itself, and secondary information kept out of the way. The page keeps its route, data, permissions and the app's existing visual system. The detail page `/vault/[id]`, the reviewer pages and the cases pages are not redesigned.

## What the page is for

- **Primary task:** find a piece of evidence and open it.
- **Secondary tasks:** share it, rename it, delete it, see what was shared with me, learn how to capture.
- **Most important information per item:** its name, what kind it is (post or messages), when it was captured, who shared it (shared tab), and whether it is locked into an escalated case.

## Problems with the current page

1. **No way to find anything.** No search, filter or sort. Items are named by default ("Facebook post, 12 Oct 2026 14:03"), so a vault of twenty captures is twenty near-identical rows.
2. **Every action needs a detour.** Sharing, renaming and deleting are only on the detail page: open, act, come back.
3. **Rows are tall and repeat themselves.** Each row spends a line on a badge and a hash that are the same shape on every item, so few items fit on screen and the differences between them are hard to see.
4. **Useful state is missing.** Nothing shows that an item is already in a case, or locked because that case was escalated. A student finds out when Delete is disabled on the detail page.
5. **The "How to capture" panel is permanent.** It takes a third of the screen on every visit, long after it has been read once.
6. **Returning loses your place.** There is no state in the address, so nothing could be preserved even if filters existed.
7. **Not usable below about 1024px.** The fixed 248px sidebar leaves no room. (See Open question 1: DESIGN.md currently says desktop only.)

## Design decisions

- **A table, not a card grid.** Evidence is compared by name, kind and date, which is what a list is for. A grid earns its place when items have previews; ours can only be shown inside a sandboxed frame, so thumbnails would mean one live frame per item. No grid/list toggle (Open question 2).
- **Columns:** Name (with a kind icon) · Kind · Captured · Shared by (shared tab only) · Status (the tamper-check badge, and "In a case" / "Locked" when true) · actions menu. The short hash moves off the list: it is on the detail page, where it can be copied and verified.
- **State lives in the address** (`?tab=&q=&kind=&sort=`), filtered on the server. Search, filters and sort work on the real data, survive opening an item and coming back, and work without JavaScript. No client-side copy of the list.
- **Toolbar:** the two existing tabs, now with counts; a search box; a kind filter (All, Posts, Messages); a sort control (Newest, Oldest, Name). Nothing else.
- **Row actions in a "More" menu** (owner only): Open, Rename, Share by email, Create password link, Delete. They reuse the existing dialogs and the existing API routes; the server rules are untouched. Delete is disabled with its reason when the item is locked, exactly as on the detail page. Shared items get Open only.
- **"How to capture" becomes a button** in the page header that opens the same content in a dialog. The empty vault state keeps the explanation in view, with that button as its action.
- **No new primary button.** Capturing happens in the extension, not on this page, so the page does not invent a "New" button that would do nothing. The header action is "How to capture" (soft style).
- **A vault-specific list component.** `EvidenceRow` is also used on the case pages and reviewer pages; it stays as it is so those pages do not change.
- **The existing visual system only:** tokens, Lora/Nunito, Lucide icons, the existing Button, Dialog, Badge, EmptyState and toast. One new primitive is needed: an accessible menu.

## Conflicts with the project's own rules (need your decision)

| Brief says | Project says | Proposed |
|---|---|---|
| Works at desktop, tablet and mobile; navigation collapses on narrow screens | DESIGN.md §1, §6, §16: desktop only, minimum 1024px, "no mobile-specific layouts" | Make the vault content responsive, and make the sidebar collapsible below 1024px (Task 7). That touches the shared app shell, so every page gains the collapsed navigation; nothing else on other pages changes. DESIGN.md would need those three lines updated. |
| Grid/list toggle "if genuinely useful" | DESIGN.md §16: no repeated card grids, no widget grids for students | No grid. |
| "Use the existing design system" | DESIGN.md §9 names shadcn/Radix; the codebase uses a small hand-built kit | Keep the hand-built kit; add one menu primitive in the same style. |

## Dependency graph

```
Task 1  list query (search, kind, sort, case state)
   ├── Task 2  table presentation
   │      ├── Task 3  toolbar (tabs with counts, search, filter, sort)
   │      └── Task 6  row actions ── needs Task 5 (menu primitive)
   └── Task 3
Task 4  how-to-capture dialog          (independent)
Task 5  menu primitive                 (independent)
Task 7  collapsible navigation         (independent; decision needed)
Task 8  verification and cleanup       (last)
```

Tasks 4 and 5 can be done in parallel with 2 and 3.

## Task list

See [todo.md](todo.md) for acceptance criteria and verification per task.

### Phase 1: Foundation
- Task 1: Evidence list query
- Task 2: Vault table

### Phase 2: Finding things
- Task 3: Toolbar and address state
- Task 4: How to capture, on demand

### Phase 3: Acting on items
- Task 5: Menu primitive
- Task 6: Row actions

### Phase 4: Narrow screens and finish
- Task 7: Collapsible navigation (only if Open question 1 is answered yes)
- Task 8: Verification pass and cleanup

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Task 7 changes the shell every page uses | Medium | Desktop layout stays byte-for-byte the same at 1024px and wider; the change only applies below that. Check every page at 1280px before and after. |
| Moving dialogs out of `evidence-actions.tsx` breaks the detail page | Medium | Extract first with no behaviour change and re-run the detail-page checks before wiring the menu. |
| The menu is the first popover in the app; easy to get keyboard and focus wrong | Medium | Build on the native `popover` attribute or a `<details>`-free button + roving focus; test Escape, arrow keys, Tab and outside click explicitly. |
| A dialog opened from a row is left open when the page is hidden (the freeze bug fixed earlier) | Medium | Reuse the existing `Dialog`, which already closes itself when hidden. |
| Case-state columns leak something to the wrong person | High | The query only reports state for the viewer's own evidence in "My evidence"; the shared tab shows no case state. Add a smoke check that a recipient's list carries no case information. |
| No automated browser tests live in the repo | Low | Verification uses a throwaway headless-Chrome script, as for earlier work; say so in the summary. |

## Open questions

1. **Narrow screens.** DESIGN.md says desktop only. The brief requires tablet and mobile. Do it (Task 7, and update DESIGN.md), or keep desktop only and make the vault merely not break below 1024px?
2. **Grid view.** Recommended: none, because there are no thumbnails to show. Agree?
3. **Tamper-check badge on every row.** INSTRUCTIONS.md §10 lists the badge on each vault card. Recommended: keep it on every row, in the Status column, so nothing about the trust wording changes. The alternative is to state it once above the list.
4. **Preview without leaving the list** (a side drawer). Recommended: not now; the detail page already does this job and the drawer would need a second sandboxed frame. Agree?
5. **Delete from the list.** It keeps the same confirmation dialog and the same lock rule. Acceptable to offer it from the row menu, or should deleting stay on the detail page only?
