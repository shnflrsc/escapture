# Handoff: Escapture dashboard redesign

This folder is a handoff for Claude Code. It turns the "Escapture Dashboard" design canvas into an implementation plan for this repo.

## What's here

| File | What it is |
|---|---|
| `plan.md` | The plan: decisions, the shell, each page, data each page needs, and what is new on the server. Read it first. |
| `todo.md` | Tasks in order, each with acceptance criteria, verification and files likely touched. Same format as `tasks/todo.md`. |
| `design-md-changes.md` | Exact edits to make in `DESIGN.md` so the guidelines match the new shell (header, notifications popover, reviewer dashboard). |
| `reference/` | The design source: one `.dc.html` file per screen, the shared `app.css`, and the Escapture design-system bundle. Use them for layout, copy and tokens. See `reference/README.md`. |

## How to start (paste this into Claude Code)

```
Read handoff/dashboard/README.md, then plan.md, design-md-changes.md and todo.md.
Also read DESIGN.md, AGENTS.md and tasks/plan.md (the case-page decisions there still stand).
Copy handoff/dashboard/plan.md and todo.md over tasks/plan.md and tasks/todo.md
(the case-page plan is finished and committed). Then work through todo.md one task
at a time: P0 tasks first, run the standing checks after each task, tick the boxes,
and commit after each task. Stop and ask me before any schema change or anything
the plan marks "Ask first".
```

## Priorities

The prototype is due Wednesday 14 October 2026. Tasks are tagged:

- **P0**: needed for the demo. The shell with header and notifications, the Review Board table, the admin page, and the DESIGN.md update.
- **P1**: polish that matches the design more closely (chart, activity feed, extra columns, tabs, counts). Do these only after every P0 task passes.

## Ground rules for the implementer

- `DESIGN.md` stays the source of truth for tokens, wording and accessibility. Make the edits in `design-md-changes.md` first, so the guidelines and the code agree.
- The reference files are **design mockups, not code to copy**. They use a canvas runtime (`support.js`, `<x-dc>`, `<x-import>`) that does not exist in this repo. Rebuild each screen with the repo's components (`components/ui`, `components/safetrail`), Tailwind tokens and `lucide-react`.
- Sample names, dates and counts in the mockups are fictional. Use real data from the services. Never hard-code mockup data.
- Keep existing behaviour that the design does not show: autosave, conflict handling, picker, delete, leave, sharing dialogs, the sandboxed evidence frame, and the extension flows.
- No schema change unless a task says "Ask first" and the user agrees.
