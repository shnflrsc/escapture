# SafeTrail

SafeTrail helps students who are being cyberbullied keep evidence of what happened, build a case from it, and escalate it to university case reviewers. The MVP covers Facebook posts and Messenger conversations and pilots at Bulacan State University. It supplements the university's existing process; it does not replace it.

It has four connected parts:

1. **Escrow Capture** (Chrome extension): saves a frozen, script-free copy of a post or conversation, after running tamper checks, straight into the student's vault.
2. **Escrow Vault**: private storage. Every item records the SHA-256 of the exact stored bytes and a server-side capture time, and can be re-verified at any time. The owner can see who an item is shared with, stop sharing with any of them, and list and revoke its password links.
3. **Cases**: a student gathers evidence, invites people they trust, previews exactly what reviewers will see, and escalates. Escalation locks the case. A draft saves itself as it is edited, shows other people's changes within a few seconds, and can be deleted by the person who started it; people can be removed from it or leave it, and their evidence leaves with them.
4. **Dashboard and Review Board**: reviewers see summary counts and charts on the Dashboard, triage escalated cases in the Review Board table, attach evidence shared with them (kept separate from the reporter's), and close cases with a note.
5. **Reviewer accounts**: an administrator creates reviewer accounts and gets a one-time setup link to pass on, so only the reviewer ever knows the password. Accounts can be deactivated and reactivated.
6. **Administrators on the review side**: an administrator can do everything a reviewer can (Review Board, Case Archives, opening evidence on escalated cases, starting a review, attaching evidence, closing a case) and, on an open case, assigns reviewers to it. Assigning routes the work and notifies the reviewer; it does not limit which reviewers can open or act on a case. Drafts stay private from administrators as they do from reviewers, and the student is never shown who was assigned.

Every signed-in page shares one shell: a sidebar, and a header with a breadcrumb, a search of the role's main list, a notification bell and the account menu.

Product source of truth: *SafeTrail - Final MVP Proposal*. Build spec: [INSTRUCTIONS.md](INSTRUCTIONS.md). Visual rules: [DESIGN.md](DESIGN.md).

## Stack

Next.js 16 (App Router, Cache Components), React 19, Tailwind v4, TypeScript, Drizzle ORM on Postgres, Better Auth (email + password, bearer tokens for the extension), Zod, Supabase Storage, Vitest, and an MV3 Chrome extension bundled with esbuild.

## Quick start (no external services needed)

Requirements: Node 20.9 or newer, pnpm 11, and Docker (Docker Desktop on Windows and macOS) for the local database.

```bash
pnpm install
cp .env.example .env.local   # then fill in the values below
pnpm db:local                # local Postgres in Docker; returns once it is ready
pnpm db:migrate              # create the tables
pnpm db:seed                 # demo accounts, evidence and cases
pnpm dev                     # http://localhost:3000
```

For local development set these in `.env.local`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:54329/safetrail
DIRECT_URL=postgres://postgres:postgres@localhost:54329/safetrail
BETTER_AUTH_SECRET=<32+ random bytes, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`>
```

`pnpm db:local` starts Postgres 18 from [docker-compose.yml](docker-compose.yml) in the background, reachable only from this machine on port 54329. `pnpm db:stop` stops it and keeps the data, which lives in the `safetrail-pg` Docker volume; `docker compose down -v` throws the data away for a clean start. Set `LOCAL_DB_PORT` (and the port in `DATABASE_URL`) if 54329 is taken. Leave `SUPABASE_URL` empty and evidence files are stored on local disk under `.data/storage`.

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
| `ALLOWED_EMAIL_DOMAIN` | Students must sign up with this domain (default `ms.bulsu.edu.ph`). |
| `DEV_ALLOWED_EMAILS` | Optional comma list of exact addresses that bypass the domain check. |
| `EXTENSION_ORIGIN` | `chrome-extension://<id>`, trusted by Better Auth. `pnpm ext:build` prints it; the ID is pinned by `extension/key.json`. |

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm typecheck` / `lint` / `test` | TypeScript, ESLint, Vitest unit tests |
| `pnpm smoke` | End-to-end API walkthrough against a running dev server (see Testing) |
| `pnpm db:local` / `db:stop` | Start or stop the local Postgres for development: a Docker container defined in `docker-compose.yml`. Docker must be running. Stopping keeps the data. |
| `pnpm db:push` / `db:generate` / `db:migrate` / `db:studio` | Drizzle schema tools. `db:migrate` applies the migrations under `drizzle/` and is what a new or production database uses. `db:push` syncs the schema directly but asks questions, so it needs an interactive terminal. |
| `pnpm db:seed` | Idempotent demo data |
| `pnpm admin:create-user --email <e> --name "<n>" --password <p> --role reviewer\|admin` | Reviewer and admin accounts from the command line. There is no public sign-up for these roles. An administrator can also create reviewers on the Reviewer accounts page; the first admin account has to come from here or from the seed. |
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
5. **Messages:** click each message you want. One click takes the whole message: picture, name and bubble. Shift-click selects everything in between, and clicking a selected message removes it. Then **Capture N messages**. **Select all N loaded messages** selects every message currently loaded, including the date dividers between them. Messenger only keeps the messages near what is on screen in the page and unloads the rest as you scroll, so each message is copied and tamper-checked at the moment it is selected. A long selection made while scrolling is captured whole, in order, and the tamper report says how many items were copied at selection time.
6. **If a capture looks wrong:** select the same thing again and choose **Save diagnostics**. It saves a file describing how the selection is built and styled (structure, class names, sizes, a few style values and the style rules the capture kept) and none of its content: no text, names, links or image addresses. That file is what is needed to fix a capture problem without anyone sharing their messages.

To try it without Facebook, run `pnpm fixtures:serve` and capture from http://localhost:4100/fake-facebook-post.html or http://localhost:4100/fake-messenger.html (local builds only).

What the capture does, in the style of SingleFile: it runs the tamper checks and clones the selection in the same task, keeping the page's own class names. It then keeps only the page's style rules that apply to the selection (rules for hover and focus states, fonts and animations are left out; media queries are resolved as they were at capture; theme variables are resolved to their values), and renames the classes to short names. A rule that depended on something outside the selection is rewritten so it still applies. Style sheets the page itself may not read (cross-origin, no CORS) are fetched through the extension; if one cannot be read, the capture is saved with a note that it may look different. Anything not rendered or taking no space is left out, wrappers that carry nothing are removed, and images are embedded as data URIs at the size they are shown (each repeated image is stored once; animated images become their first frame; everything is shrunk further if the capture still does not fit). Scripts, event handlers, forms and anything that could load remotely are stripped. Links never leave the capture: their real address is removed, and clicking one opens a small panel at the bottom of the capture that says where it pointed (one click on the address selects it for copying). The panel is plain HTML and CSS, marked as added by SafeTrail; no script is involved, so the viewer still runs none. The result is one minified HTML document, hashed byte for byte and uploaded gzip-compressed. The server unpacks it, recomputes the hash and rejects a mismatch.

Tamper checks (capture is refused if any fails):

1. **Page editing mode** (`designMode`) is on, or was switched on earlier on this page.
2. **Editable content:** the selected area, an ancestor or a descendant is `contenteditable` (the message composer is exempt and its text is left out of the capture).
3. **Userscript managers:** their markers are present.
4. **Injected elements:** a `<script>` or `<style>` element sits inside the selected area.
5. **DOM provenance:** text in the selected area was changed by something other than the page's own scripts. A guard that loads before the page's scripts hooks every function that can change content and reads the real call stack of each call. A change is accepted only if every script on that stack was served by the page itself; a change with no script behind it at all (the DevTools Elements panel, another extension), or made from the console, a userscript or a script from elsewhere, is recorded. Genuine typing in the message composer is allowed. Changes elsewhere on the page do not block a capture; they are noted in its tamper report.

The provenance guard is ported from our DOM Tamper Detector extension (`extension/src/content/page-guard.js`). It only watches pages that were loaded after the extension was installed or reloaded, so after installing, **reload the Facebook tab**; otherwise capture is refused with that instruction.

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
app/(marketing) the public landing page (built to HOME_PAGE.md), and placeholder Terms, Privacy and Contact pages
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
- Escalate, edit, attach, add-collaborator, remove-collaborator, delete-case and delete-evidence each lock the case row and re-check its status, so nothing can slip in while a case is being escalated.
- Two people editing one draft can't silently overwrite each other: a save says what the field held when the edit began, and is refused if it has changed since.
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

- **Tamper-checked, not tamper-proof.** The checks catch edits made by hand: page editing mode, editable content, the DevTools Elements panel and console, userscripts and other extensions. They do not catch modified Facebook code (Local Overrides, a rewriting proxy, a userscript that patches Facebook's own functions so that Facebook itself writes the fake text), or rewriting in transit. Text that is not in the page as text (CSS-generated content, attributes, images) is not watched. A script that runs before the guard could take over its private channel.
- **The provenance check can refuse a genuine page.** It has been tested on local test pages, not yet on live Facebook. Known causes of a wrong refusal: a browser translation of the page, a password manager or other extension writing text into the selected area, and scripts the site first loads from a new address after the page has settled. The refusal message names the cause.
- **Captured is not the same as complete.** The hash shows the stored file hasn't changed since it was saved. It does not show the page was genuine or that nothing was left out. Messenger captures include only the messages loaded on screen.
- **No email verification.** The only sign-up gate is the email domain, so someone could claim a BulSU address they don't own.
- **Sharing can leak.** People who receive evidence or a case can pass it on. The owner can stop sharing evidence with a person and can revoke a password link, but that doesn't undo what someone has already seen or copied. Revoking a link stops it opening; people who already used it keep their access until they are removed too. A collaborator can be removed from a draft case, but not after it is escalated.
- **Live editing is near-live, by polling.** An open case page checks in about twice a second (every few seconds in a background tab). Edits from everyone are merged; where two edits touch the same characters the newer one wins. Carets and edits can lag up to about half a second, each open page writes to the database on every check-in, and other people's selections show as a caret only, not a highlighted range. Evidence and people changes still arrive within about five seconds.
- **A capture is a restyled copy, not a pixel copy.** It uses the page's own style rules, so it looks like the page, but text reflows to the viewer's width, fonts fall back to system fonts, and hover or animated states are not kept.
- **Dependence on Facebook.** Capture reads Facebook's pages with a generic element picker, so layout changes are less likely to break it, but it has only been exercised on the local fixture pages so far. Fonts are not embedded, so captured text may use a fallback typeface.
- **Rate limiting is per server instance** (in memory), which is weak on serverless hosting.
- **Evidence in an open case is locked; a closed case keeps only a record.** While a case is escalated or under review, attached evidence can't be renamed or deleted, and reviewers and administrators can open it. When the case closes, SafeTrail writes each item's title, kind, capture time, owner and SHA-256 to the case. From then on staff see that record, not the evidence, and the owner can rename or delete the item again; a deleted item stays in the record by title and hash. Evidence a student shared directly with a reviewer stays shared until the student removes that person.
- **Evidence is kept until its owner deletes it.** There is no automatic retention period or purge yet.
- **Desktop first.** Below 1024px the sidebar becomes a drawer and the Vault is laid out for tablets and phones; the other pages stay usable there but are not designed for it.
- **An evidence page lists only the cases you are part of.** An item can be locked by a case you cannot open (for example one a reviewer attached it to); the page says it is locked without naming that case.
- **Public pages.** The Privacy Policy, Terms of Service and Contact details are the team's own text; the Privacy Policy and Terms have a few passages corrected to match what the app does. The landing page's extension links lead to the vault because there is no store listing yet. That needs a real link before students use SafeTrail.
- **Row-level security is on for every table, with no policies.** The app connects as the tables' owner, which RLS does not restrict, so only the app can read or change data. On Supabase this also closes the automatic public Data API; turning that API off in the project settings as well is recommended. Run migrations as the same role that owns the tables (on Supabase, `postgres`).
- **Flagged words are a fact about the text, not a severity rating.** Administrators keep a word bank (a starting list in English and Filipino, editable on the Word bank page). An escalated case is flagged when its title or description contains a bank word; the Review Board shows the words in a column and can filter by them, but never sorts or ranks by them, and students never see them. Only the title and description are checked, not the evidence, and a case with no flags is not a case with nothing serious in it. Matching ignores case and accents and accepts common English endings; other forms (for example Filipino affixes) are added to the bank as their own entries.
- **Assignment is a label, not a lock.** Every reviewer and administrator can still see and act on every escalated case; the assigned reviewers are named on the case and the board and get a notification. Only administrators assign.
- **Setup links are passed on by hand.** There is no email delivery, so the administrator copies a reviewer's one-time setup link (valid for 7 days) and sends it through the office's own channel. There is no "forgot password" yet: a reviewer who loses theirs needs an administrator, and only accounts that have not finished setup can be given a new link.
- **Out of scope:** other platforms, the university's own investigation and sanctions, accused persons who are not BulSU students, judging whether a report is true, email or SMS notifications, case assignment, outcome categories, account deletion, reopening cases, legal pages.
