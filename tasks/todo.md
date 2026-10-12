# Tasks: Evidence page

Plan and rationale: [plan.md](plan.md). **Approved and implemented.** One limitation: on a 1280 by 800 screen the Sharing card ends about 80px below the fold for a student. Browser checks were run with a throwaway headless-Chrome script, not a test kept in the repository.

Standing checks for every task: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `/vault/[id]` still loads for a student owner, a student recipient and a reviewer.

---

## Phase 1: Cases

### - [x] Task 1: Cases-for-evidence query

**Description:** A read query for students that returns the cases holding a piece of evidence which the viewer can open, and the viewer's draft cases the evidence could still be added to. Reviewers keep the existing query.

**Acceptance criteria:**
- [x] Returns only cases the viewer owns or collaborates on, reporter side only, with id, title and status.
- [x] Returns the viewer's draft cases that do not hold the evidence yet, and only when the viewer owns the evidence.
- [x] Someone the evidence was merely shared with gets no case they are not part of; reviewer attachments never appear.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test`
- [x] `pnpm smoke` with new checks: owner sees the case; a collaborator sees it; a plain recipient sees none; a reviewer attachment is not listed for the owner.

**Dependencies:** None

**Files likely touched:** `server/services/cases.ts`, `scripts/smoke.ts`

**Estimated scope:** Small

### - [x] Task 2: Cases card with Add to a case

**Description:** One Cases card, first in the side column, for both roles. Students see their cases for this item and the owner can add it to a draft case; reviewers keep their list and their attach button.

**Acceptance criteria:**
- [x] Each case shows its title as a link, its status badge, and for reviewers which side added it. With none: "Not in a case yet."
- [x] The owner's "Add to a case" opens a dialog listing their draft cases and attaches through the existing route; the list updates and a toast confirms. With no draft case the button is disabled and says there are no cases.
- [x] The reviewer's card behaves exactly as today, including never listing drafts.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm smoke`
- [x] Browser check: owner adds to a draft; owner with no drafts; recipient; reviewer attach flow.

**Dependencies:** Task 1

**Files likely touched:** `components/safetrail/attach-to-case.tsx`, `components/safetrail/evidence-cases.tsx` (new), `app/(app)/vault/[id]/page.tsx`

**Estimated scope:** Medium

### Checkpoint: Cases
- [x] Standing checks and `pnpm smoke` pass
- [x] A student can go from a capture to a draft case without leaving the page
- [x] Review with human before continuing

---

## Phase 2: Declutter

### - [x] Task 3: Integrity card and header facts

**Description:** Replace the overloaded details card with a short Integrity card, and move the basic facts to one line under the title.

**Acceptance criteria:**
- [x] The card shows the tamper-check badge (wording unchanged), one summary line with the number of checks passed and notes, and Verify now.
- [x] One "Details" disclosure holds the full hash with Copy, the source address, the list of checks, the notes (deduplicated) and "What this means". It starts open for reviewers and closed for students.
- [x] The header shows kind, captured time and, when it is not yours, the owner. The strip above the frame is gone.

**Verification:**
- [x] `pnpm typecheck && pnpm lint`
- [x] Browser check: a capture with no notes and one with several; as student and as reviewer; Verify now still reports a match.

**Dependencies:** None

**Files likely touched:** `components/safetrail/evidence-integrity.tsx` (new), `app/(app)/vault/[id]/page.tsx`

**Estimated scope:** Small

### - [x] Task 4: Sharing card with actions menu

**Description:** A short Sharing card for the owner: who has access, and the owner's actions in a "More" menu.

**Acceptance criteria:**
- [x] The card lists who has access, or "Only you."
- [x] Share by email, Create a password link, Rename and Delete are in one menu and work as before; Rename and Delete are disabled with the reason when the item is locked.
- [x] The lock reason is shown on the card whether or not the viewer can see the case that caused it.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm smoke`
- [x] Browser check: all four actions; a locked item; the vault row menu still works.

**Dependencies:** None

**Files likely touched:** `components/safetrail/evidence-actions.tsx`, `app/(app)/vault/[id]/page.tsx`

**Estimated scope:** Small

### Checkpoint: Declutter
- [x] Standing checks and `pnpm smoke` pass
- [x] No fact appears twice on the page; the side column fits on one screen at 1280 by 800 for a student
- [x] Review with human before continuing

---

## Phase 3: Finish

### - [x] Task 5: One column below 1024px

**Description:** Make the page usable on tablets and phones: capture first, then Cases, Integrity and Sharing.

**Acceptance criteria:**
- [x] Below 1024px the cards stack under the capture with no sideways scrolling and nothing clipped.
- [x] The capture frame keeps a sensible height at 375, 768 and 1280.
- [x] At 1024px and wider the two-column layout is used.

**Verification:**
- [x] `pnpm typecheck && pnpm lint`
- [x] Browser check at 375, 768, 1024 and 1280 with a post capture and a messages capture.

**Dependencies:** Tasks 2, 3, 4

**Files likely touched:** `app/(app)/vault/[id]/page.tsx`, `components/safetrail/evidence-frame.tsx`

**Estimated scope:** Small

### - [x] Task 6: Verification pass and cleanup

**Description:** Check the finished page against the one-pager and remove anything left over.

**Acceptance criteria:**
- [x] Every item in the one-pager's scope is done or listed as a limitation.
- [x] The label is still exactly "Captured with tamper checks" / "Passed tamper checks"; the capture is still only shown in the script-less frame.
- [x] No unused components or exports remain; README mentions the cases list where it describes the vault.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke && pnpm build`
- [x] Keyboard-only run through the page; the reviewer and vault browser checks still pass.

**Dependencies:** Tasks 1 to 5

**Files likely touched:** `README.md`, files touched above

**Estimated scope:** Small

### Checkpoint: Complete
- [x] All acceptance criteria met or listed as limitations
- [x] Ready for review
