# Implementation Plan: Evidence page (capture, cases, integrity, sharing)

Status: **approved and implemented** with the recommended answers (Add to a case in the Cases card; all notes shown once Details is open). Tasks are tracked in [todo.md](todo.md).

This replaces the vault redesign plan, which was finished and committed in `5f2b47c`.

## Overview

Rework `/vault/[id]` so the capture stays the focus and the side column stops being one overloaded card. The column becomes three short cards: Cases, Integrity and Sharing. Students see which of their cases an item is in and can add it to a draft case from here. Technical detail (hash, source, checks, notes) moves behind one "Details" disclosure. No server rule about who may view, attach, rename or delete changes.

## Decisions already made

- Student first; the reviewer's view of the same page must still work.
- Two columns stay: capture on the left, cards on the right. No full-width capture, no tabs.
- Students can see and add to cases from this page. Removing stays on the case page.
- Details start **open for reviewers**, closed for students.
- When the owner has no draft case, "Add to a case" is disabled and says there are no cases. It does not offer to create one.
- Reviewers never see a reporter's draft cases in the list.

## Architecture decisions

- **One Cases card for both roles.** Students get cases they own or collaborate on that hold this item on the reporter side. Reviewers keep today's list (never drafts, both sides). The viewer's role picks the query; the card is the same component.
- **A new read query for students**, in the cases service: the cases holding this evidence that the viewer can open, plus the viewer's draft cases it is not in yet. It reports nothing about cases the viewer cannot open, and never reviewer attachments.
- **"Add to a case" reuses the existing dialog and the existing attach route** (`POST /api/cases/:id/evidence`). `AttachToCase` takes its endpoint and wording as inputs instead of being reviewer-only.
- **The button lives in the Cases card, not the page header.** The one-pager put it in the header, but the reviewer's button is already in the card and two copies would be clutter. The card is first in the column, so it is still the first action on the page. Say if you want it in the header instead.
- **Integrity card = badge, one summary line, Verify now, one disclosure.** The summary is built from the stored report ("5 checks passed · 2 notes"). Notes can number up to 32 at 500 characters each, so they are deduplicated and shown only inside Details.
- **Sharing card = who has access, plus a "More" menu** for Share by email, Create a password link, Rename and Delete, reusing the menu and dialogs built for the vault.
- **Header gets one line of facts** (kind, captured time, owner when it is not you). The strip above the frame is removed because it repeats the card.
- **Below 1024px the page becomes one column**: capture, then Cases, Integrity, Sharing.

## Dependency graph

```
Task 1  cases-for-evidence query (student)
   └── Task 2  Cases card with Add to a case
Task 3  Integrity card and header facts      (independent)
Task 4  Sharing card with actions menu       (independent)
Task 5  one column below 1024px              (after 2, 3, 4)
Task 6  verification and cleanup             (last)
```

Tasks 3 and 4 do not depend on 1 or 2.

## Task list

See [todo.md](todo.md) for acceptance criteria and verification per task.

### Phase 1: Cases
- Task 1: Cases-for-evidence query
- Task 2: Cases card with Add to a case

### Phase 2: Declutter
- Task 3: Integrity card and header facts
- Task 4: Sharing card with actions menu

### Phase 3: Finish
- Task 5: One column below 1024px
- Task 6: Verification pass and cleanup

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The case list leaks a case the viewer should not know about (a reviewer attachment, or the owner's other cases shown to someone the item was shared with) | High | The query joins on the viewer's own ownership or collaboration and on the reporter side only. Smoke checks cover a recipient, a collaborator and a reviewer attachment. |
| An item is locked but the viewer's case list is empty (locked by a reviewer attachment, or by a case they cannot open) | Medium | The lock line states the reason on its own, without depending on the list. |
| Hiding the hash and checks weakens trust for students | Medium | The badge, the summary line and Verify now stay visible; Details is one click and keeps its state while on the page. |
| Changing `AttachToCase` and `EvidenceOwnerActions` breaks the reviewer flow or the vault row menu | Medium | Re-run the reviewer and vault browser checks after Tasks 2 and 4. |
| The capture frame sizes its height from its width; a one-column layout changes that width | Low | The frame already picks its height from measured widths; check captures at 375, 768 and 1280. |
| No browser tests live in the repo | Low | Verification uses a throwaway headless-Chrome script, as before; say so in the summary. |

## Not doing

- Full-width capture with an info panel, and tabs.
- Verifying the file automatically on load.
- A printable record sheet, private notes on evidence, a full-screen view.
- Removing evidence from a case from this page.
- Creating a case from the "Add to a case" dialog.
- Any change to stored captures or to the capture frame itself.

## Open questions

1. Is the Cases card the right home for "Add to a case", or do you want it in the page header as the one-pager said?
2. Notes inside Details: show all of them once expanded (recommended), or cap at a few with "Show all"?
