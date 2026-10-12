# Implementation Plan: Case page (assemble a draft)

Status: **approved and implemented.** Tasks are tracked in [todo.md](todo.md).

This replaces the evidence page plan, which was finished and committed in `0e57dac`.

## Problem

How might we make a draft case quick to assemble (evidence, people, the account of what happened) for one or several students, without the page explaining itself in every section?

## Overview

Rework `/cases/[id]` into one page you assemble. Evidence becomes a table with an "Add evidence" button that opens a picker of your vault with checkboxes. The title and description are edited in place and save themselves, and the page picks up other people's changes. The owner can delete a draft and remove collaborators; a collaborator can leave. Section subtitles and the header sentence go. The evidence page's back link returns to the case you came from.

## Decisions already made

- **Sync** means autosave plus staying current, not live co-typing. If two people change the same field, the later save is refused and both versions are shown.
- **Delete:** the owner only, on drafts only. Collaborators are notified. Evidence stays in each person's vault; case links stop working.
- **Text:** every section subtitle and the header sentence are removed. Warnings stay inside dialogs where a decision is made.
- **Remove or leave:** the owner can remove a collaborator from a draft and a collaborator can leave. Either way that person's evidence is removed from the case. The removed person and the owner are notified.
- **Escalating:** only "no evidence" blocks it, as today. An empty description is a warning in the dialog.
- **Who added what:** the evidence table shows who added each item, and offers Remove only where the server allows it.

## Architecture decisions

- **Evidence table:** name, kind, captured, added by, and a remove action. It follows the vault table's look but is its own small component, because its columns and actions differ. Rows link to the evidence page.
- **Picker:** a dialog listing your own vault items not yet in the case, with the vault's search and kind filter, checkboxes and a count on the Add button. Collaborators see their own vault, matching the server rule that you can only add your own evidence.
- **Adding several items is one request** to the existing `POST /api/cases/:id/evidence`, which will also accept a list. It is all or nothing, in one transaction. The single-item form keeps working, because the evidence page uses it.
- **Back link:** the case links to `/vault/:id?from=<caseId>`. The evidence page shows "Back to the case" only when that case is one the viewer can open; otherwise it falls back to today's link.
- **Autosave:** title and description are edited in place and saved shortly after you stop typing, with a small "Saving… / Saved" indicator. Each save sends the text the field had when you started. The server applies it only if the field still has that text; otherwise it answers with a conflict and the current text. No database change is needed. Today a second save silently overwrites the first, so this also fixes a real loss of work.
- **Staying current:** while a draft is open and the tab is visible, the page asks the server every few seconds whether the case changed, and refreshes if so. A field you are typing in, or that has an unsaved edit, is never replaced.
- **Delete case:** a new `DELETE /api/cases/:id` and a new rule, owner and draft only. Notifications are tied to a case and are removed with it, so the "case deleted" notification is stored without a case link.
- **Remove and leave:** a new `DELETE /api/cases/:id/collaborators/:userId`. The owner may name any collaborator; a collaborator may name only themselves. It removes that person's evidence from the case in the same transaction.
- **Header:** title, status chip, Escalate, and a "More" menu with Delete case (owner) or Leave case (collaborator), reusing the menu built for the vault.
- **Ready to escalate:** Escalate is always clickable for the owner of a draft. Its dialog lists what is missing (no evidence blocks; empty description warns) before the existing preview. The "add evidence first" banner goes.
- **No schema change** in any task.

## Dependency graph

```
Task 1  evidence table and page text cleanup
   ├── Task 2  evidence picker (multi-select, one request)
   └── Task 3  back link from evidence to case
Task 4  autosave with same-field conflict     (independent)
   └── Task 5  stay current while open
Task 6  delete a draft case                   (independent; adds the header menu)
   └── Task 7  remove a collaborator / leave  (uses the header menu)
Task 8  ready-to-escalate check               (independent)
Task 9  verification and cleanup              (last)
```

## Task list

See [todo.md](todo.md) for acceptance criteria and verification per task.

### Phase 1: Evidence
- Task 1: Evidence table and page text cleanup
- Task 2: Evidence picker
- Task 3: Back to the case from an evidence page

### Phase 2: Editing together
- Task 4: Autosave with same-field conflict
- Task 5: Stay current while open

### Phase 3: People and lifecycle
- Task 6: Delete a draft case
- Task 7: Remove a collaborator, leave a case
- Task 8: Ready-to-escalate check

### Phase 4: Finish
- Task 9: Verification pass and cleanup

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Autosave loses or overwrites text | High | Saves carry the starting text and are refused on mismatch; the typed text is kept on any failure; a field in use is never replaced by a refresh. Browser check with two signed-in students editing the same and different fields. |
| Delete or remove races with escalation | High | Both take the same row lock escalation takes and re-check "draft" inside the transaction. Smoke checks: delete and remove are refused once escalated. |
| Removing a person leaves their evidence on the case, or deleting a case deletes evidence | High | Removal detaches that person's items in the same transaction; deleting a case only detaches. Smoke checks confirm the files still exist in each vault. |
| A collaborator removes someone else, or a removed person keeps access | High | Rule in `server/authz.ts` with unit tests; smoke checks for each role, and that the removed person gets 404 afterwards. |
| The `from` parameter is used to show a link to a case the viewer cannot open | Medium | The evidence page checks the case through the existing service before showing the link. |
| Checking for changes every few seconds adds load | Low | Only on drafts, only while the tab is visible, and the check returns a timestamp, not the case. |
| Removing subtitles loses "reviewers will see only what is listed here" | Medium | The escalation dialog already lists exactly what is sent; the ready check sits above it. |
| No browser tests live in the repo | Low | Verification uses a throwaway headless-Chrome script, as before; say so in the summary. |

## Not doing

- Live character-by-character co-editing, or showing who is currently editing.
- A step-by-step flow, or people shown as chips.
- Adding evidence from other people's vaults, or selecting several items in the vault to add to a case.
- Removing collaborators, deleting, or editing after escalation.
- Restoring a deleted case.
- Trimming the remaining info banners (locked case, "you were added").

## Open questions

None blocking. Two defaults I will use unless you say otherwise:

1. Autosave waits about one second after you stop typing, and also saves when you leave the field.
2. The page checks for other people's changes every five seconds.
