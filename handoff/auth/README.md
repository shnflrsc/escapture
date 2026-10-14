# Handoff: Sign in and register redesign

This folder is a handoff for Claude Code. It turns the "Escapture Sign in & Register" design canvas into an implementation plan for this repo.

## What's here

| File | What it is |
|---|---|
| `plan.md` | The plan: what changes, the layout, each page's anatomy and copy, behaviour, and decisions. Read it first. |
| `todo.md` | Tasks in order, with acceptance criteria and verification. Same format as `tasks/todo.md`. |
| `reference/SignIn.dc.html`, `reference/Register.dc.html` | The two screens as designed: layout, copy and states. |
| `reference/auth.css` | The styles the mockups use. The tokens match `DESIGN.md`. |
| `reference/illustrations/trail-sign-in.svg`, `trail-register.svg` | The two left-panel illustrations as plain SVG. Turn them into React components. |

## How to start (paste this into Claude Code)

```
Read handoff/auth/README.md, then plan.md and todo.md. Also read DESIGN.md
(§8 now allows the sign-in/register illustration) and AGENTS.md.
If tasks/todo.md has unfinished work, finish or park it first and ask me.
Then work through handoff/auth/todo.md one task at a time, run the standing
checks after each task, tick the boxes, and commit after each task.
Stop and ask me before any schema change or anything marked "Ask first".
```

## Ground rules

- The `.dc.html` files are **mockups, not code**. They use a canvas runtime (`support.js`, `<x-dc>`, `<x-import>`, `<sc-if>`) that this repo doesn't have. Rebuild the screens with `components/ui` (Input, Button, Banner), Tailwind tokens and `lucide-react`.
- `DESIGN.md` stays the source of truth.
- Keep the behaviour of `components/safetrail/auth-form.tsx`:
  - the `next` redirect through `safeNext`
  - `method="post"`
  - the email typed on the home page carried over with `takeSignupEmail`
  - the error-code mapping (wrong password, rate limit, domain, existing account)
- Only `/sign-in` and `/sign-up` get the new split layout. `/s/[token]` and `/setup` keep today's centred layout in `app/(public)/layout.tsx`.
