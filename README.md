# SafeTrail

SafeTrail helps students who are being cyberbullied keep evidence of what happened, build a case from it, and escalate it to university case reviewers. The MVP covers Facebook posts and Messenger conversations and pilots at Bulacan State University. It supplements the university's existing process; it does not replace it.

It has four connected parts:

1. **Escrow Capture** (Chrome extension): saves a frozen, script-free copy of a post or conversation, after running tamper checks, straight into the student's vault.
2. **Escrow Vault**: private storage. Every item records the SHA-256 of the exact stored bytes and a server-side capture time, and can be re-verified at any time.
3. **Cases**: a student gathers evidence, invites people they trust, previews exactly what reviewers will see, and escalates. Escalation locks the case.
4. **Review Board**: reviewers work through escalated cases, attach evidence shared with them (kept separate from the reporter's), and close cases with a note.

Product source of truth: *SafeTrail - Final MVP Proposal*. Build spec: [INSTRUCTIONS.md](INSTRUCTIONS.md). Visual rules: [DESIGN.md](DESIGN.md).

## Stack

Next.js 16 (App Router, Cache Components), React 19, Tailwind v4, TypeScript, Drizzle ORM on Postgres, Better Auth (email + password, bearer tokens for the extension), Zod, Supabase Storage, Vitest, and an MV3 Chrome extension bundled with esbuild.

## Quick start (no external services needed)

Requirements: Node 20.9 or newer and pnpm 11.

```bash
pnpm install
cp .env.example .env.local   # then fill in the values below
pnpm db:local                # terminal 1: local Postgres (keep it running)
pnpm db:push                 # create the tables
pnpm db:seed                 # demo accounts, evidence and cases
pnpm dev                     # terminal 2: http://localhost:3000
```

For local development set these in `.env.local`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:54329/safetrail
DIRECT_URL=postgres://postgres:postgres@localhost:54329/safetrail
BETTER_AUTH_SECRET=<32+ random bytes, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`>
```

Keep the `pnpm db:local` terminal open while you work, and stop it with Ctrl+C or `pnpm db:stop`. Leave `SUPABASE_URL` empty and evidence files are stored on local disk under `.data/storage`. `pnpm db:local` runs a real Postgres from the `embedded-postgres` package, with its data in `.data/pg`.

`pnpm db:seed` prints the demo accounts and their shared password: an admin, two reviewers, and the students Maya (reporter), Jules (collaborator) and Alex (the other person).

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection used by the app. Supabase pooled (port 6543) works; the client uses `prepare: false`. |
| `DIRECT_URL` | Direct connection (5432) used by drizzle-kit. |
| `BETTER_AUTH_SECRET` | 32+ random bytes. Server only. |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | The app's origin. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Storage. Server only; the browser never talks to Supabase. Required in production. |
| `SUPABASE_STORAGE_BUCKET` | Private bucket name (default `evidence`). The seed creates it if missing. |
| `ALLOWED_EMAIL_DOMAIN` | Students must sign up with this domain (default `bulsu.edu.ph`). |
| `DEV_ALLOWED_EMAILS` | Optional comma list of exact addresses that bypass the domain check. |
| `EXTENSION_ORIGIN` | `chrome-extension://<id>`, trusted by Better Auth. `pnpm ext:build` prints it; the ID is pinned by `extension/key.json`. |

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm typecheck` / `lint` / `test` | TypeScript, ESLint, Vitest unit tests |
| `pnpm smoke` | End-to-end API walkthrough against a running dev server (see Testing) |
| `pnpm db:local` / `db:stop` | Start or stop the local Postgres for development. It is an ordinary background process (`postgres.exe`), not a container. If one was left behind by a closed terminal and no longer answers, `db:local` replaces it. |
| `pnpm db:push` / `db:generate` / `db:migrate` / `db:studio` | Drizzle schema tools. Use `db:migrate` for production. |
| `pnpm db:seed` | Idempotent demo data |
| `pnpm admin:create-user --email <e> --name "<n>" --password <p> --role reviewer\|admin` | Reviewer and admin accounts. There is no public sign-up for these roles. |
| `pnpm ext:build` / `ext:watch` | Build the extension into `extension/dist` |
| `pnpm fixtures:serve` | Fake Facebook-like pages on http://localhost:4100 for testing capture |

## The Escrow Capture extension

```bash
pnpm ext:build                                   # for http://localhost:3000
APP_URL=https://your-deployment.example pnpm ext:build   # for a deployed app
```

1. Open `chrome://extensions`, turn on Developer mode, choose **Load unpacked** and select `extension/dist`.
2. Make sure `EXTENSION_ORIGIN` in the app's environment matches the ID printed by the build, then restart the app.
3. Open the extension, sign in with a SafeTrail student account, open a Facebook post or Messenger conversation and choose **Capture this page**.
4. **Posts:** click anywhere in the post. The whole post is outlined, even if you clicked a comment. If the outline is too small or too large, use **Wider** / **Narrower**, then **Capture this post** (or press Enter).
5. **Messages:** click each message you want. One click takes the whole message: picture, name and bubble. Shift-click selects everything in between, and clicking a selected message removes it. Then **Capture N messages**. **Use whole conversation pane** is still there for short conversations.

To try it without Facebook, run `pnpm fixtures:serve` and capture from http://localhost:4100/fake-facebook-post.html or http://localhost:4100/fake-messenger.html (local builds only).

What the capture does: runs the tamper checks and clones the selection in the same task, records computed styles as shared classes (one per distinct declaration, or one per repeated element shape, so size barely grows with the number of elements), leaves out anything not rendered or taking no space, removes wrappers that carry nothing, embeds images as data URIs at the size they are shown (each repeated image is stored once; animated images become their first frame; everything is shrunk further if the capture still does not fit), strips scripts, event handlers, forms and anything that could load remotely, wraps the result in a minimal HTML document, hashes the exact bytes and uploads them. The server recomputes the hash and rejects a mismatch.

Tamper checks (capture is refused if any fails): page editing mode (`designMode`) is on or was switched on earlier on this page; the selected area, an ancestor or a descendant is `contenteditable` (the message composer is exempt and its text is left out of the capture); userscript-manager markers are present; a `<script>` or `<style>` element sits inside the selected area.

## Testing

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm dev          # in another terminal, with the database running
pnpm smoke
pnpm build
```

- **Unit tests** cover the authorization matrix, the escalation digest, hashing and link-password helpers, the email-domain gate, request validation, and a guard that fails if any route handler lacks a session check.
- **`pnpm smoke`** creates fresh accounts and walks the whole product through the API, asserting the invariants: the sign-up gate, hash checking on upload, sharing and link lockout, collaborator limits, the digest check and the lock on escalation, reviewer-only routes, reviewer attachments staying invisible to the reporter, status changes, closing notes and notifications.
- **Viewer safety by hand:** the seeded "Facebook post" item is the raw fixture, which contains a `<script>` and an `onerror` image. Open it in the vault; nothing runs.

## How it is put together

```
app/(public)   sign-in, sign-up, s/[token] (shared links)
app/(app)      vault, cases, notifications, review (pages check the role on the server)
app/api        thin route handlers: validate, call a service, map errors
server/authz.ts        every permission decision, as pure functions
server/services        evidence, shares, links, cases, review, notifications
server/storage.ts      Supabase Storage, or local disk in development
server/db              Drizzle schema and client
extension/             Escrow Capture (background, content, page-guard, popup)
fixtures/              fake pages for testing capture
scripts/               local database, seed, create-user, smoke test
```

Rules the code holds to:

- Authorization is enforced in services on the server. The UI hiding a button is not security, and `proxy.ts` is only an optimistic redirect.
- Resources a user shouldn't know about answer 404, not 403.
- Escalate, edit, attach, add-collaborator and delete-evidence each lock the case row and re-check its status, so nothing can slip in while a case is being escalated.
- Student-side views read case evidence through one helper that always filters to the reporter's side.
- Captured HTML is untrusted. It is served only from `/api/evidence/:id/file` with a `sandbox` Content-Security-Policy and shown only in an `<iframe sandbox="">`.

## Deploying

1. Create a Supabase project. Set `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
2. Run `pnpm db:migrate` against the production database, then `pnpm db:seed` if you want the demo accounts.
3. Deploy the Next.js app with the environment variables above, with `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` set to the deployed origin.
4. Rebuild the extension with `APP_URL` set to the deployed origin and reload it.

A stored capture can be up to 12 MB. It is uploaded gzip-compressed, and the compressed upload must stay under 4 MB, which fits Vercel's request-body limit. The hash is always of the unpacked HTML, which is what is stored. One thing to check when you deploy: serverless hosts also limit response size (about 4.5 MB on Vercel for non-streamed responses), so confirm that a capture larger than that still opens in the viewer there. If it does not, lower `MAX_EVIDENCE_BYTES` in `lib/validators.ts` and `MAX_BYTES` in `extension/src/shared/types.ts` back to 4 MB.

## Known limitations

These match the Risks section of the proposal. Say them out loud in a demo.

- **Tamper-checked, not tamper-proof.** The checks catch edits made by hand through page editing mode, editable content and common userscripts. They do not catch modified Facebook code (local overrides, a proxy), rewriting in transit, or edits made through the DevTools Elements panel that leave no trace in the page. The page guard that reports editing history runs in the page's own JavaScript world, so a hostile page could forge it.
- **Mutation-provenance checking is not included.** The experimental check that attributes DOM changes to page scripts was cut (it is on the spec's cut list) because it could not be validated against real Facebook pages.
- **Captured is not the same as complete.** The hash shows the stored file hasn't changed since it was saved. It does not show the page was genuine or that nothing was left out. Messenger captures include only the messages loaded on screen.
- **No email verification.** The only sign-up gate is the email domain, so someone could claim a BulSU address they don't own.
- **Sharing can leak, and can't be undone.** People who receive evidence or a case can pass it on. Shares and links can't be revoked in this version.
- **Dependence on Facebook.** Capture reads Facebook's pages with a generic element picker, so layout changes are less likely to break it, but it has only been exercised on the local fixture pages so far. Fonts are not embedded, so captured text may use a fallback typeface.
- **Rate limiting is per server instance** (in memory), which is weak on serverless hosting.
- **Reviewer attachments lock the shared evidence.** Once a reviewer attaches evidence someone shared with them, its owner can no longer delete it, like any evidence on an escalated case.
- **Desktop only**, per DESIGN.md. Nothing is designed for phones.
- **Out of scope:** other platforms, the university's own investigation and sanctions, accused persons who are not BulSU students, judging whether a report is true, email or SMS notifications, case assignment, outcome categories, account deletion, reopening cases, an admin UI, legal pages.
