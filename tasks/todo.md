# Tasks: Case page

Plan and rationale: [plan.md](plan.md). **Approved and implemented.** Browser checks were run with a throwaway headless-Chrome script (two students signed in at once), not a test kept in the repository.

Standing checks for every task: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `/cases/[id]` still loads for an owner and a collaborator, as a draft and after escalation.

---

## Phase 1: Evidence

### - [x] Task 1: Evidence table and page text cleanup

**Description:** Replace the tall evidence rows with a table, and remove the explanatory text the page no longer needs.

**Acceptance criteria:**
- [x] The table shows name, kind, captured and "added by" (you, or the person's name); a row opens the evidence page. With nothing attached it shows an empty message.
- [x] Remove appears only on rows the viewer may remove (owner: any; collaborator: their own), and only on drafts.
- [x] The "What happened" heading, the header sentence and every section subtitle are gone; the status chip stays.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test`
- [x] Browser check as owner and collaborator, draft and escalated, at 1280 and 375.

**Dependencies:** None

**Files likely touched:** `components/safetrail/case-evidence-table.tsx` (new), `app/(app)/cases/[id]/page.tsx`, `components/safetrail/case-actions.tsx`

**Estimated scope:** Medium

### - [x] Task 2: Evidence picker

**Description:** "Add evidence" above the table opens a dialog of your vault where you tick one or several items and add them in one go. It replaces the dropdown.

**Acceptance criteria:**
- [x] The dialog lists your own items not yet in the case, with search and a kind filter; the Add button shows how many are ticked and is disabled at zero.
- [x] Adding sends one request; all ticked items are attached or none are, the table updates and a toast confirms. A failure keeps the dialog and the ticks.
- [x] With an empty vault, or nothing left to add, the dialog says so. The single-item attach used by the evidence page still works.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm smoke` with new checks: several at once; one not yours refuses the whole request; an escalated case refuses.
- [x] Browser check: add three, search then add, keyboard only.

**Dependencies:** Task 1

**Files likely touched:** `components/safetrail/evidence-picker.tsx` (new), `server/services/cases.ts`, `lib/validators.ts`, `app/api/cases/[id]/evidence/route.ts`, `scripts/smoke.ts`

**Estimated scope:** Medium

### - [x] Task 3: Back to the case from an evidence page

**Description:** Opening evidence from a case and pressing the page's back link returns to that case.

**Acceptance criteria:**
- [x] Evidence opened from a case shows "Back to the case" and returns there.
- [x] Opened from the vault, or with a case the viewer cannot open in the address, it shows today's link.

**Verification:**
- [x] `pnpm typecheck && pnpm lint`
- [x] Browser check: from a case, from the vault, and with someone else's case id typed into the address.

**Dependencies:** Task 1

**Files likely touched:** `app/(app)/vault/[id]/page.tsx`, `components/safetrail/case-evidence-table.tsx`

**Estimated scope:** Small

### Checkpoint: Evidence
- [x] Standing checks and `pnpm smoke` pass
- [x] A student can build a case's evidence list without a dropdown, and get back from an item
- [x] Review with human before continuing

---

## Phase 2: Editing together

### - [x] Task 4: Autosave with same-field conflict

**Description:** Title and description are edited in place and save themselves. Two people changing the same field no longer silently overwrite each other.

**Acceptance criteria:**
- [x] There is no Save button. A change saves about a second after typing stops and when leaving the field, with a "Saving… / Saved" indicator; an empty title is refused with its message.
- [x] A save whose field was changed by someone else meanwhile is refused; the page shows their text beside yours and lets you keep either. Changes to different fields both succeed.
- [x] On any failure the typed text stays in the field and the indicator says it is not saved.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke` with new checks: stale same-field save gets a conflict with the current text; different fields both apply; escalated refuses.
- [x] Browser check with two students signed in at once.

**Dependencies:** None

**Files likely touched:** `components/safetrail/case-details.tsx` (new), `server/services/cases.ts`, `lib/validators.ts`, `app/api/cases/[id]/route.ts`, `scripts/smoke.ts`

**Estimated scope:** Medium

### - [x] Task 5: Stay current while open

**Description:** A draft that is open picks up other people's changes without a manual reload.

**Acceptance criteria:**
- [x] Within about five seconds of someone else changing the title, description, evidence or people, an open draft shows it.
- [x] A field being typed in, or with an unsaved edit, is not replaced.
- [x] Nothing is checked on escalated cases or while the tab is hidden.

**Verification:**
- [x] `pnpm typecheck && pnpm lint`
- [x] Browser check with two students: edits and added evidence appear on the other screen; typing is not interrupted.

**Dependencies:** Task 4

**Files likely touched:** `components/safetrail/case-details.tsx`, `components/safetrail/case-live.tsx` (new), `app/api/cases/[id]/route.ts`

**Estimated scope:** Small

### Checkpoint: Editing together
- [x] Standing checks and `pnpm smoke` pass
- [x] Two people can work on one draft without losing text
- [x] Review with human before continuing

---

## Phase 3: People and lifecycle

### - [x] Task 6: Delete a draft case

**Description:** The owner can delete a draft from a "More" menu in the header.

**Acceptance criteria:**
- [x] Only the owner of a draft sees Delete case; it asks first, naming the case, then returns to the case list with a toast.
- [x] The case, its collaborator list and its links are gone; every piece of evidence is still in its owner's vault and no longer shows the case.
- [x] Collaborators get a notification. Escalated cases, collaborators and strangers are refused.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke` with new checks for each of the above.
- [x] Browser check: delete as owner; no menu item as collaborator or after escalation.

**Dependencies:** None

**Files likely touched:** `server/authz.ts`, `server/services/cases.ts`, `app/api/cases/[id]/route.ts`, `components/safetrail/case-actions.tsx`, `app/(app)/cases/[id]/page.tsx`

**Estimated scope:** Medium

### - [x] Task 7: Remove a collaborator, leave a case

**Description:** The owner can remove a collaborator from a draft, and a collaborator can leave one. Their evidence leaves the case with them.

**Acceptance criteria:**
- [x] The owner sees Remove on each collaborator; a collaborator sees Leave case in the header menu. Both ask first and say that the person's evidence will be removed from the case.
- [x] Afterwards that person cannot open the case, their items are off the case and still in their vault, and the removed person and the owner are notified.
- [x] A collaborator cannot remove anyone else; nothing is allowed after escalation; the owner cannot be removed.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke` with new checks for each rule.
- [x] Browser check: remove as owner; leave as collaborator.

**Dependencies:** Task 6

**Files likely touched:** `server/authz.ts`, `server/services/cases.ts`, `app/api/cases/[id]/collaborators/[userId]/route.ts` (new), `components/safetrail/case-actions.tsx`, `app/(app)/cases/[id]/page.tsx`

**Estimated scope:** Medium

### - [x] Task 8: Ready-to-escalate check

**Description:** Escalate tells you what is missing instead of being disabled beside a banner.

**Acceptance criteria:**
- [x] On a draft the owner can always open Escalate. With no evidence the dialog says so and cannot be confirmed; with an empty description it warns and can be confirmed.
- [x] With nothing missing, the dialog is the existing preview, unchanged.
- [x] The "add at least one piece of evidence" banner is gone.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm smoke`
- [x] Browser check: no evidence; evidence but no description; complete.

**Dependencies:** None

**Files likely touched:** `components/safetrail/case-actions.tsx`, `app/(app)/cases/[id]/page.tsx`

**Estimated scope:** Small

### Checkpoint: People and lifecycle
- [x] Standing checks and `pnpm smoke` pass
- [x] Every new action is refused on the server for the wrong person or the wrong status
- [x] Review with human before continuing

---

## Phase 4: Finish

### - [x] Task 9: Verification pass and cleanup

**Description:** Check the finished page against the decisions in the plan and remove anything left over.

**Acceptance criteria:**
- [x] Each decision in the plan is done or listed as a limitation.
- [x] No unused components or exports remain (the old form and dropdown); README describes deleting, removing, leaving and autosave where it covers cases.
- [x] The page works with the keyboard alone and at 375, 768 and 1280.

**Verification:**
- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm smoke && pnpm build`
- [x] The vault, evidence page and reviewer browser checks still pass.

**Dependencies:** Tasks 1 to 8

**Files likely touched:** `README.md`, files touched above

**Estimated scope:** Small

### Checkpoint: Complete
- [x] All acceptance criteria met or listed as limitations
- [x] Ready for review
