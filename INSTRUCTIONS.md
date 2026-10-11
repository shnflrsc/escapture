# INSTRUCTIONS.md: Building the SafeTrail MVP

This is the working spec for taking this repo from the empty Next.js scaffold to a working, demoable MVP. **Hackathon prototype is due Wednesday 2026-10-14.** Product source of truth: *SafeTrail - Final MVP Proposal* (Google Doc in the project). If this file and the proposal disagree, the proposal wins. Raise the conflict rather than silently choosing.

---

## 0. Rules for whoever executes this file

1. **Read the Next.js docs first.** `AGENTS.md` says this Next.js (16.4) has breaking changes. Before writing any route, page or config, read the relevant guides in `node_modules/next/dist/docs/` (if the folder is unreadable, run `pnpm install` first). Things I expect but have *not* verified: `middleware.ts` is now `proxy.ts`; `params`, `searchParams`, `cookies()` and `headers()` are async; with `cacheComponents: true`, runtime data access must sit under `<Suspense>`. Check each against the docs. Leave `next.config.ts` alone unless it blocks you, and if you change it, say so in the commit message.
2. **Work in the milestone order in section 14.** Commit after each milestone with a clear message. Never commit `.env*`.
3. **Every milestone ends with its acceptance check.** Do not move on while it fails. `pnpm typecheck` and `pnpm lint` must pass at every commit.
4. **Authorization lives in the server, always.** The UI hiding a button is not security. Every route handler and service function re-checks the session and the resource permission (section 7).
5. **Keep the frontend minimal.** Only the pages in section 10. No extra pages, no marketing site, no settings screens.
6. **Don't over-claim in the UI.** The label is *Captured with tamper checks*, never "verified", "authentic" or "tamper-proof". See the proposal's Risks section.
7. **Stay inside scope** (section 16). When tempted to add something, check the cut list first.
8. **Unrelated working-tree noise:** `design.md` and `package.json` currently show whole-file diffs (probably line endings). Don't commit them as-is by accident. Normalize line endings or leave them out of unrelated commits.
9. Prefer boring, well-known libraries. Avoid native-build dependencies (this repo uses pnpm 11 with `allowBuilds` in `pnpm-workspace.yaml`; a blocked postinstall means add it there deliberately or pick a different package).

---

## 1. Product invariants (never violate)

These come straight from the proposal and are the things tests must prove.

| # | Invariant |
|---|-----------|
| I1 | Nothing reaches reviewers until the case **owner** escalates. Reviewers cannot see draft cases or un-attached evidence. |
| I2 | Reviewers see **only** evidence attached to the case, plus their own attachments. |
| I3 | Escalation is irreversible. After it, the case can't be edited or withdrawn, attached evidence can't be deleted, and shares of that evidence can't be undone. |
| I4 | Escalation requires a preview of exactly what reviewers will see (every collaborator, every attached item) and explicit confirmation. The confirmed preview must equal what is submitted (section 8, digest). |
| I5 | Reviewer attachments are kept separate from the reporter's evidence. The reporter and collaborators never see them. |
| I6 | The accused never sees the case and never interacts with the reporter. They only ever *share their own evidence* with reviewers. |
| I7 | Every vault item records a SHA-256 of the **exact stored bytes** and a **server-side** capture time. Any later change is detectable by recomputing. |
| I8 | Captured HTML is untrusted. It is rendered only in a script-less sandbox, never inline in the app origin. |
| I9 | Students sign up with a BulSU email. Reviewer accounts are created by an administrator only. |
| I10 | Sharing (evidence or case) requires the sharer to acknowledge the risk. Reviewers can see every collaborator's identity. |

---

## 2. Decisions and assumptions (change these early or not at all)

I made these calls so you aren't blocked. Each is cheap to reverse **only if reversed before M1**.

- **Auth: Better Auth** (email + password, Drizzle adapter, bearer plugin for the extension), not Supabase Auth. Reason: one Drizzle schema owns all tables, and the extension gets a plain bearer token.
- **Supabase is used for two things:** hosted Postgres (via Drizzle) and **Supabase Storage** (private bucket, accessed only server-side with the service-role key). The browser never talks to Supabase.
- **Upload path:** a single multipart `POST /api/evidence` carrying the HTML file. Cap **4 MB** (this fits Vercel's ~4.5 MB request limit; the extension downscales images to stay under it). If a larger limit is needed later, switch to signed upload URLs plus a finalize call.
- **No email verification** in the MVP; the only gate is the email-domain check. This is a known gap (anyone could claim a BulSU address). State it in the demo and Risks, don't hide it.
- **Reviewer/admin accounts are made by a CLI script** (`pnpm admin:create-user`), not an admin UI. The `admin` role has no case access in the MVP.
- **Share links** are login-required. Redeeming a link (token + password) grants the logged-in user access exactly as an email share would. The token is shown once at creation and only its hash is stored.
- **Statuses:** `draft` (student-side only) -> `escalated` -> `under_review` -> `closed`. Reviewers may close from `escalated` or `under_review`. No reopening.
- **Time:** store UTC, display `Asia/Manila`.

---

## 3. Stack and repo layout

- Next.js 16 (App Router), React 19, Tailwind v4, TypeScript strict, pnpm.
- Drizzle ORM + `postgres` (postgres-js) driver, drizzle-kit for schema.
- Better Auth, Zod for all request validation.
- `@supabase/supabase-js` (server-only, Storage).
- Vitest (unit), a `tsx` smoke script (end-to-end API walkthrough).
- Chrome extension: MV3, TypeScript, bundled with esbuild (fall back to plain JS if tooling fights you).

```
app/                      # pages + route handlers
  (public)/ sign-in, sign-up, s/[token]
  (student)/ vault, vault/[id], cases, cases/[id], notifications
  (reviewer)/ review, review/[id], review/archives
  api/                    # route handlers (thin)
components/               # ui/ (Button, Card, Input, Badge, Dialog, ...) + feature components
server/
  db/ index.ts, schema/*.ts          # Drizzle
  auth.ts                            # Better Auth config
  authz.ts                           # ALL permission checks
  services/ evidence.ts, shares.ts, links.ts, cases.ts, review.ts, notifications.ts
  storage.ts                         # Supabase Storage wrapper
  errors.ts, http.ts                 # AppError + route helpers
lib/ validators.ts (Zod), hash.ts, format.ts
scripts/ seed.ts, create-user.ts, smoke.ts
extension/ manifest.json, src/{background,content,popup,shared}, build.mjs
fixtures/ fake-facebook-post.html, fake-messenger.html
drizzle.config.ts
```

Route handlers stay thin: parse + validate, call a service, map errors. **Server components call the same services directly** (no HTTP hop to your own API). Services enforce authorization by taking the acting `user` and calling `authz`.

---

## 4. Environment and setup

`.env.local` (also commit a value-less `.env.example`):

```
DATABASE_URL=            # Supabase pooled (transaction, port 6543) or direct
DIRECT_URL=              # direct connection (5432), used by drizzle-kit
BETTER_AUTH_SECRET=      # 32+ random bytes
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=    # server only. Never import in client code
SUPABASE_STORAGE_BUCKET=evidence
ALLOWED_EMAIL_DOMAIN=bulsu.edu.ph
DEV_ALLOWED_EMAILS=      # optional comma list that bypasses the domain check (demo accounts)
EXTENSION_ORIGIN=        # chrome-extension://<id>, added to Better Auth trustedOrigins
```

Install: `drizzle-orm postgres better-auth zod @supabase/supabase-js`; dev: `drizzle-kit tsx vitest esbuild @types/chrome`.

Add scripts: `typecheck` (`tsc --noEmit`), `db:generate`, `db:push`, `db:migrate`, `db:studio`, `db:seed`, `admin:create-user`, `ext:build`, `ext:watch`, `test`, `smoke`. Run scripts with `tsx --env-file=.env.local ...`.

Drizzle/Supabase notes: with the pooled (6543) URL, create the client with `prepare: false`. `drizzle-kit` uses `DIRECT_URL`. Use `db:push` while iterating, but run `db:generate` and commit the migration before the final demo. Create the private `evidence` bucket manually in Supabase (or in the seed script).

---

## 5. Database schema (Drizzle, `server/db/schema/`)

Use `uuid` primary keys (`defaultRandom()`), `timestamptz` timestamps with `defaultNow()`, and Postgres enums. Better Auth ids are `text`, so foreign keys to users are `text`.

### Auth tables (generated by Better Auth CLI, then kept in `schema/auth.ts`)
`user`, `session`, `account`, `verification`. Extend `user` with `role` enum `user_role('student','reviewer','admin')`, default `student`, declared as a Better Auth `additionalField` with `input: false` (clients must never set it).

### Domain tables

**`evidence`**
`id`, `owner_id -> user`, `kind` enum(`facebook_post`,`facebook_message`), `label` text (default e.g. "Facebook post, 12 Oct 2026 14:03"), `source_url` text, `storage_path` text unique, `sha256` char(64), `byte_size` int, `captured_at` timestamptz **default now(): the server-side time**, `client_captured_at` timestamptz, `tamper_report` jsonb (checks run, all passing, extension version), `created_at`. Index on `owner_id`.

**`evidence_shares`**: `evidence_id`, `user_id` (recipient), `shared_by`, `acknowledged_at`, `created_at`. PK (`evidence_id`,`user_id`).

**`share_links`**: `id`, `token_hash` unique (SHA-256 of a 32-byte random token), `resource_type` enum(`evidence`,`case`), `evidence_id` null, `case_id` null (CHECK: exactly one set and it matches the type), `password_hash` (scrypt, `salt:hash`), `failed_attempts` int default 0 (lock at 10), `created_by`, `acknowledged_at`, `revoked_at` null, `created_at`.

**`cases`**: `id`, `owner_id`, `title`, `description`, `status` enum(`draft`,`escalated`,`under_review`,`closed`) default `draft`, `escalated_at`, `closed_at`, `closed_by`, `closing_note`, `created_at`, `updated_at`. Indexes on `owner_id`, `status`.

**`case_collaborators`**: `case_id`, `user_id`, `added_by`, `via` enum(`email`,`link`), `acknowledged_at`, `created_at`. PK (`case_id`,`user_id`). The owner is **not** in this table.

**`case_evidence`**: `id`, `case_id`, `evidence_id`, `attached_by`, `side` enum(`reporter`,`reviewer`), `created_at`. UNIQUE (`case_id`,`evidence_id`).

**`case_events`**: `id`, `case_id`, `actor_id`, `type` enum(`created`,`escalated`,`status_changed`,`closed`), `from_status`, `to_status`, `note`, `created_at`. This is the status timeline reporters see.

**`notifications`**: `id`, `user_id`, `type` text, `title`, `body`, `case_id` null, `evidence_id` null, `read_at` null, `created_at`. Index (`user_id`,`read_at`).

Cascades: deleting an evidence row removes its `evidence_shares` and its `case_evidence` rows **only when the case is draft** (the service guarantees this; see I3).

---

## 6. Authentication

- Better Auth with `emailAndPassword` enabled, Drizzle adapter (`provider: "pg"`), and the **bearer** plugin so the extension can use `Authorization: Bearer <token>` (token returned in the `set-auth-token` response header on sign-in).
- Mount at `app/api/auth/[...all]/route.ts`.
- **Sign-up gate:** in a `databaseHooks.user.create.before` (or the sign-up `before` hook) reject unless the email ends in `@${ALLOWED_EMAIL_DOMAIN}` or is in `DEV_ALLOWED_EMAILS`. Public sign-up always creates `role = student`.
- `trustedOrigins`: app URL + `EXTENSION_ORIGIN`.
- `proxy.ts` (see rule 1): only an *optimistic* redirect of unauthenticated users to `/sign-in` and of role mismatches to the right home (`/vault` for students, `/review` for reviewers). **It is not the security boundary.**
- Helper `requireUser({ roles? })` in `server/auth.ts`: reads the session from cookie *or* bearer token, throws `AppError(401)` / `AppError(403)`. Every handler and server component that touches data calls it first.
- Reviewer/admin creation: `pnpm admin:create-user --email --name --password --role reviewer|admin`. It bypasses the domain check, creates the user through Better Auth's server API (so the password is hashed properly), then sets `role`.

---

## 7. Authorization

All checks live in `server/authz.ts` as small pure-ish functions that take `(user, resource)` and are unit-tested. Return **404 instead of 403** for resources the user shouldn't know exist.

| Action | Allowed when |
|---|---|
| Capture / upload evidence | `role = student` |
| View evidence metadata + file | owner, **or** direct share recipient, **or** owner/collaborator of a case containing it on the `reporter` side, **or** a reviewer when it is attached (either side) to a **non-draft** case |
| Delete evidence | owner only, and **not** attached to any non-draft case. If only in draft cases it is removed from them first |
| Share evidence (email / link) | owner only, with `acknowledge: true`. Recipients cannot re-share |
| Create case | student |
| View case (student side) | owner or collaborator. Sees only `reporter`-side evidence and status/closing events |
| Edit title/description | owner or collaborator, **only while `draft`** |
| Attach evidence (reporter side) | owner or collaborator, **only while `draft`**, and the evidence must be **owned by the actor** |
| Detach evidence | the attacher or case owner, only while `draft` |
| Add collaborator (email / link) | case owner only, only while `draft`, with `acknowledge: true` |
| Escalate | case owner only, `draft` only, at least 1 evidence item, matching preview digest |
| Review Board / archives / case detail | `role = reviewer`, case status ≠ `draft` |
| Change status / close | reviewer; `escalated -> under_review`, `escalated|under_review -> closed`; closing requires a non-empty note |
| Reviewer attachment | reviewer; the evidence must be owned by or shared with that reviewer; goes in with `side = reviewer` |
| Notifications | own only |

**Race safety:** `escalate`, edit/attach/collaborator-add, and evidence delete each run in a transaction that does `SELECT ... FOR UPDATE` on the case row and re-checks `status`. This stops "attach evidence while someone escalates" and "delete evidence while escalating".

**Visibility filter:** when a *student-side* user loads a case, always filter `case_evidence.side = 'reporter'`. Put this in one query helper so no endpoint can forget it (I5).

---

## 8. API design

Conventions: JSON in/out, Zod-validated, errors as `{ "error": { "code": "...", "message": "..." } }` with correct HTTP statuses (400 validation, 401, 403, 404, 409 locked/conflict, 413 too large, 422 hash mismatch, 429 lockout). Dates are ISO-8601. All routes except auth and link-meta require a session (cookie or bearer).

### Evidence
| Method + path | Purpose |
|---|---|
| `POST /api/evidence` | multipart: `file` (text/html, max 4 MB), `sha256`, `kind`, `sourceUrl`, `clientCapturedAt`, `tamperReport` (JSON), `extensionVersion`. Server recomputes SHA-256 of the received bytes; **mismatch -> 422**. Stores to `evidence/{ownerId}/{evidenceId}.html`, inserts the row with server `captured_at`. Returns the evidence item. |
| `GET /api/evidence?scope=mine\|shared` | List. `shared` = shared with me (this is how reviewers find evidence to attach). |
| `GET /api/evidence/:id` | Metadata (+ whether the file is intact is *not* computed here) |
| `GET /api/evidence/:id/file` | Streams the HTML with `Content-Type: text/html; charset=utf-8`, `Content-Security-Policy: sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store` |
| `GET /api/evidence/:id/verify` | Re-reads stored bytes, recomputes SHA-256, returns `{ stored, recomputed, match, checkedAt }` |
| `PATCH /api/evidence/:id` | Rename `label` (owner) |
| `DELETE /api/evidence/:id` | See authz table; 409 if attached to an escalated case |
| `POST /api/evidence/:id/shares` | `{ email, acknowledge: true }`. Recipient must be an existing user (404-style "no SafeTrail account with that email"). Notifies recipient |
| `POST /api/evidence/:id/links` | `{ password, acknowledge: true }` -> `{ url }` (token shown once) |

### Share links (shared by evidence and cases)
| Method + path | Purpose |
|---|---|
| `GET /api/links/:token` | Public. Returns only `{ valid, resourceType }`. **No titles or counts** before the password |
| `POST /api/links/:token/redeem` | Auth required. `{ password }`. Verifies (constant-time), counts failures, locks at 10 (429). On success creates the share/collaborator row (`via='link'`) and returns where to go |

### Cases (student side)
| Method + path | Purpose |
|---|---|
| `POST /api/cases` | `{ title, description }` -> draft |
| `GET /api/cases` | Mine + ones I collaborate on |
| `GET /api/cases/:id` | Case, collaborators, `reporter`-side evidence, status events |
| `PATCH /api/cases/:id` | `{ title?, description? }` (draft only, else 409) |
| `POST /api/cases/:id/evidence` | `{ evidenceId }` (reporter side; actor must own it) |
| `DELETE /api/cases/:id/evidence/:evidenceId` | Detach (draft only) |
| `POST /api/cases/:id/collaborators` | `{ email, acknowledge: true }` (owner only) |
| `POST /api/cases/:id/links` | `{ password, acknowledge: true }` -> `{ url }` (owner only) |
| `GET /api/cases/:id/escalation-preview` | Exactly what reviewers will see: title, description, every collaborator (name + email), every attached item (label, captured_at, sha256). Includes `digest` = SHA-256 of the canonical JSON of that content |
| `POST /api/cases/:id/escalate` | `{ digest, confirm: true }`. Owner only. Recomputes the digest inside the locked transaction; **mismatch -> 409** ("the case changed, review the preview again"). On success: status `escalated`, event row, notify all reviewers |

### Review (reviewer role only)
| Method + path | Purpose |
|---|---|
| `GET /api/review/cases?status=escalated\|under_review` | Board data (excludes `closed` and `draft`) |
| `GET /api/review/cases/:id` | Case + collaborators (with identities) + reporter evidence + reviewer attachments (clearly separated) + events |
| `POST /api/review/cases/:id/status` | `{ status: "under_review" }` |
| `POST /api/review/cases/:id/close` | `{ note }` required. Sets `closed`, event row, notifies owner + collaborators |
| `POST /api/review/cases/:id/evidence` | `{ evidenceId }` -> `side='reviewer'` |
| `GET /api/review/archives?q=` | Closed cases, search over title/description/closing note |

### Notifications
`GET /api/notifications` (own, newest first, with unread count) and `POST /api/notifications/read` (`{ ids? }`, empty = all).

Notification triggers: evidence shared with me; added to a case; case escalated (-> all reviewers); status changed (-> owner + collaborators); case closed (-> owner + collaborators, includes the note excerpt).

---

## 9. Escrow Capture extension (`extension/`)

**Goal:** from a Facebook post or Messenger conversation the student has open, produce a frozen HTML snapshot, hash it, and upload it to their vault, refusing if tamper checks fail.

**Structure (MV3):**
- `background` (service worker): login, token storage (`chrome.storage.local`), all network calls to the SafeTrail app (it has host permission, so no CORS issue; the app origin `chrome-extension://<id>` must be in `trustedOrigins`), image fetching, hashing, upload.
- `content` (isolated world): element picker UI, tamper checks, snapshot building.
- `page-guard` (registered with `world: "MAIN"` at `document_start`): watches for tampering signals in the page's own JS world (see below). Talks to the content script via `window.postMessage` with a per-session nonce. Acknowledge in the code comment that a hostile page can forge this channel; it's a speed bump, not a guarantee.
- `popup`: sign-in form (SafeTrail email + password), signed-in state, "Capture" button, last-capture result with a link to the vault item.
- `manifest.json`: `permissions: ["storage","activeTab","scripting"]`; `host_permissions`: `https://www.facebook.com/*`, `https://web.facebook.com/*`, `https://www.messenger.com/*`, `https://*.fbcdn.net/*`, plus the SafeTrail app origin (localhost and the deployed URL). Pin a stable extension ID via the manifest `key` so `EXTENSION_ORIGIN` doesn't change.
- `fixtures/` contains local fake Facebook-like pages so capture and tamper checks can be tested without touching real Facebook.

**Target selection:** an element picker (hover-highlight, click to choose; Esc cancels) for both posts and messages. For Messenger, offer "Use whole conversation pane" as a shortcut (`[role="main"]`). A picker keeps us independent of Facebook's brittle class names. Tell the user: *"Only messages currently loaded on screen are captured. Scroll up to load more before capturing."*

**Tamper checks** (run immediately before cloning, in the same task as the clone; all must pass, else refuse with a plain explanation):
1. `document.designMode !== "on"`.
2. No `contenteditable="true"` on the target, its ancestors, or any descendant (exclude the legitimate message-composer textbox).
3. No userscript-manager markers (`GM_info`, `GM`, `unsafeWindow`, Tampermonkey/Violentmonkey/Greasemonkey globals or injected DOM attributes), best effort.
4. No injected `<script>` or `<style>` elements inside the target subtree.
5. *(should-have, experimental)* **mutation provenance:** the MAIN-world guard records DOM mutations inside the target that did *not* coincide with a page-JS setter call it observed (DevTools' Elements-panel edits go through the debugger protocol, not page JS setters). Ship as a hard refusal only if it doesn't false-positive on the fixture pages and on a real Facebook page; otherwise ship as a warning in the `tamperReport` only. Whatever happens, record the list of checks that ran in `tamperReport`.

These checks do **not** stop modified Facebook code, local overrides, proxies or in-transit rewriting. That is documented, accepted scope. Never describe results as tamper-proof.

**Snapshot builder** (SingleFile-style, simplified):
1. Clone the target subtree.
2. Copy computed styles onto the clone as inline `style` (walk original and clone in parallel).
3. Embed images: `<img>` and CSS `background-image` -> data URIs, fetched by the background worker. Downscale anything over ~1280 px wide via `OffscreenCanvas` (JPEG q≈0.8). If a fetch fails, replace with a visible "image unavailable" placeholder.
4. Strip `<script>`, `on*` attributes, `javascript:` URLs, iframes, forms' actions. Replace `<a href>` with inert text-preserving links (`href` kept as text, `rel="noopener"`, `target="_blank"` is fine because the viewer sandbox blocks navigation anyway).
5. Wrap in a minimal HTML document with `<meta name="safetrail:source-url">` and `<meta name="safetrail:client-captured-at">`.
6. Serialize to a UTF-8 `Blob`. If > 4 MB, refuse: "This capture is too large. Select a smaller area."
7. `sha256 = crypto.subtle.digest("SHA-256", <exact bytes>)` hex.
8. `POST /api/evidence` (multipart). Show success + vault link, or the server's error.

**Build:** `pnpm ext:build` bundles into `extension/dist/`; load unpacked from there. `APP_URL` is injected at build time.

---

## 10. Frontend (only these pages)

Follow `DESIGN.md` strictly: palette tokens declared once in `app/globals.css` via Tailwind v4 `@theme` (primary 100-700, background `#F7FAFC`, surface `#FFFFFF`, border `#D9E4EA`, text `#1F2A33`, muted `#5B6973`, disabled `#C2DCE7`); **Lora** for headings (via `next/font/google`), **Quicksand** for everything else; rounded cards, subtle shadows, generous spacing, accessible focus states and contrast, responsive. Build a small reusable kit (`Button`, `Input`, `Textarea`, `Card`, `Badge`, `Dialog` using `<dialog>`, `EmptyState`, `Spinner`, toast) rather than pulling a component library. Mutations: `fetch` to the API then `router.refresh()`. Every page needs loading, empty and error states.

| Route | Who | Contents |
|---|---|---|
| `/sign-in`, `/sign-up` | public | Forms; sign-up explains the BulSU email requirement; errors from the domain gate shown clearly |
| `/s/[token]` | any signed-in user | Password prompt -> redeem -> redirect to the resource. Redirects to sign-in first if needed |
| `/vault` | student | Tabs **My evidence** / **Shared with me**; cards with label, kind, captured time, short hash, the *Captured with tamper checks* badge. Short "How to capture" panel linking to the extension install steps |
| `/vault/[id]` | student (reviewers via link from a case) | **Evidence viewer:** sandboxed iframe (`sandbox=""`, `src=/api/evidence/:id/file`), side panel with capture time, source URL, full SHA-256, **Verify now** button (calls verify, shows match/mismatch), the badge with an info popover ("passed the extension's checks and the stored file hasn't changed; this does not prove the capture is complete"). Owner actions: rename, share by email, create password link (show the URL once with Copy), delete (disabled with explanation if on an escalated case) |
| `/cases` | student | List (mine + collaborating) with status badges; "New case" |
| `/cases/[id]` | student | Edit title/description (draft only); attach-from-my-vault picker; evidence list (reporter side only); collaborators + invite by email / password link (acknowledgment checkbox); status timeline + closing note; **Escalate** button for the owner, opening the preview dialog (title, description, every collaborator, every item) with an "I understand this can't be undone" checkbox before Confirm. Locked state is obvious after escalation |
| `/notifications` | all | List + mark read; unread count in the header |
| `/review` | reviewer | Board: Escalated and Under Review columns (or tabs on mobile), card shows title, age, evidence count |
| `/review/[id]` | reviewer | Description, collaborators with identities, reporter evidence, a visually separate **Reviewer attachments** section with an attach-from-"shared with me" picker, status control, **Close case** dialog requiring a note |
| `/review/archives` | reviewer | Closed cases, search box, closing note preview |

Shell: a simple top bar (logo, role-aware nav, notifications bell with unread count, sign out). Home `/` just redirects by role.

---

## 11. Services, errors and conventions

- `AppError(code, status, message)`; one `handle(routeFn)` wrapper that converts `AppError`, `ZodError` and unknown errors into the JSON error shape (never leak stack traces or SQL).
- Services take `(actor, input)`; never read the session themselves. Wrap multi-step writes in `db.transaction`.
- Always create `case_events` rows and `notifications` inside the same transaction as the state change.
- Log structured server-side errors; never log tokens, passwords, or evidence contents.
- Hash helpers in `lib/hash.ts` (`sha256Hex(bytes)`, `scryptHash/verify`, `randomToken`). Use `timingSafeEqual` for comparisons.

---

## 12. Seed and demo data

`pnpm db:seed` (idempotent):
- admin, 2 reviewers (`reviewer1@...`, `reviewer2@...`), students **Maya** (reporter), **Jules** (witness collaborator), **Alex** (the accused). Use `DEV_ALLOWED_EMAILS`-compatible demo addresses and a known demo password printed to the console.
- 2 evidence items for Maya and 1 for Jules, created from `fixtures/*.html` (real SHA-256, uploaded via the same storage code), plus 1 for Alex.
- One `escalated` case with Maya as owner and Jules as collaborator; one `draft` case; a few notifications.
- Create the Storage bucket if missing.

---

## 13. Security checklist (verify before the demo)

- [ ] Service-role key and auth secret never reach client bundles (`grep` the build output).
- [ ] The evidence file route always sends the sandbox CSP and `nosniff`; the viewer iframe has `sandbox=""` (no `allow-scripts`, no `allow-same-origin`).
- [ ] Captured HTML is never injected with `dangerouslySetInnerHTML` or fetched-and-inlined.
- [ ] Every route calls `requireUser` and the right authz function. Add a unit test that enumerates route files and fails if one lacks a guard marker, or at minimum review by hand.
- [ ] `role` cannot be set by any client input.
- [ ] Link passwords: scrypt, constant-time compare, lockout after 10 failures; token stored hashed.
- [ ] Upload: size cap, MIME check, server-side hash recompute, storage path built from server ids only (no client-provided filenames).
- [ ] No evidence or case data in notifications beyond titles and short excerpts.
- [ ] Rate-limit (even crudely) sign-in and link redemption.
- [ ] Auth cookies `HttpOnly`, `SameSite=Lax`, `Secure` in production.

---

## 14. Build order (milestones, each with acceptance)

Order follows the critical path: the extension and vault carry the most risk and everything else needs evidence items to exist.

**M0: Foundation.** Install deps, env + `.env.example`, Drizzle client, Tailwind tokens + fonts + UI kit skeleton, `AppError`/`handle`, scripts. *Accept:* `pnpm dev` renders a styled page; `pnpm typecheck` and `lint` pass; DB connection works.

**M1: Schema + auth.** All tables, Better Auth, domain gate, `requireUser`, sign-in/up pages, `create-user` script, `proxy.ts` redirects. *Accept:* a `@bulsu.edu.ph` student can sign up/in; a `@gmail.com` sign-up is rejected; a script-created reviewer lands on `/review` placeholder; a student hitting `/review` is redirected.

**M2: Evidence backend + vault UI.** Storage wrapper, `POST /api/evidence`, list/get/file/verify/patch/delete, `/vault`, `/vault/[id]` with sandboxed viewer + Verify now. Test by uploading a fixture with `curl`. *Accept:* upload with a wrong hash -> 422; viewer shows the fixture without running its scripts; Verify shows match; tampering with the stored file in Storage (manually) shows a mismatch.

**M3: Extension.** Popup login, picker, snapshot, tamper checks, upload. Test on `fixtures/` pages first, then a real Facebook post and a Messenger thread. *Accept:* capture from a fixture lands in the vault with correct hash; enabling `designMode` or adding `contenteditable` via DevTools makes capture **refuse**; oversized target is refused; signed-out state prompts login.

**M4: Sharing.** Email shares, share links + `/s/[token]` redemption, "Shared with me", notifications on share. *Accept:* Jules sees Maya's shared item; wrong link password -> error and lockout after 10; a non-recipient gets 404 on the item.

**M5: Cases.** Create/edit, attach from own vault, collaborators by email/link, case detail page, notifications. *Accept:* collaborators can edit and attach **their own** evidence but cannot attach someone else's; non-participants get 404.

**M6: Escalation + Review Board.** Preview + digest, escalate transaction, lock enforcement, reviewer board/detail, status changes, reviewer attachments, close with note, archives, student-facing timeline + closing note, notification bell. *Accept:* the full smoke test (section 15) passes.

**M7: Seed, polish, deploy, demo rehearsal.** Seed script, empty/error states, responsive pass, README update (replace the create-next-app boilerplate), deploy, run the demo script twice.

### Cut line (drop in this order if time runs out)
1. Archives search (keep the list)
2. Password-protected links (keep email sharing; show "coming soon" in the UI, keep tests honest)
3. Mutation-provenance tamper check (keep the static checks)
4. Notifications bell polish (keep the notifications page)
5. Image downscaling in the extension (keep the 4 MB refusal)

**Never cut:** capture + hash + vault, the sandboxed viewer, case lock on escalation, preview-and-confirm, reviewer/reporter evidence separation, server-side authorization.

---

## 15. Testing and verification

- **Unit (Vitest):** `authz.ts` matrix, digest generation, scrypt/link logic, email-domain gate, hash helpers.
- **Smoke test (`pnpm smoke`, runs against a running dev server and a test DB/schema):** this is the real acceptance test. One script that walks the whole product and asserts the invariants:
  1. Maya, Jules, Alex sign up; a non-BulSU sign-up fails.
  2. Maya uploads evidence (wrong hash -> 422, right hash -> 201); Jules uploads his own.
  3. Maya shares an item with Jules by email; a stranger gets 404.
  4. Maya creates a case, attaches her item; Jules (collaborator) can edit the description and attach **his** item but not hers; Alex gets 404 on the case (I6).
  5. Digest mismatch on escalate -> 409; correct digest -> `escalated`.
  6. After escalation: edit -> 409, attach -> 409, detach -> 409, delete attached evidence -> 409 (I3).
  7. A reviewer sees the case and both items with collaborator identities; Maya cannot call any `/api/review/*` route.
  8. Alex shares his evidence with the reviewer by email; the reviewer attaches it (`side=reviewer`); Maya's case view does **not** include it (I5).
  9. Reviewer sets `under_review`, then closes with a note; closing with an empty note fails.
  10. Maya and Jules get notifications for escalation status, status change and closure; the closing note is visible to them.
  11. A reviewer cannot see a draft case (I1).
- **Manual:** extension on fixtures and on real Facebook; viewer security (open a fixture that contains `<script>alert(1)</script>` and an `onerror` image; nothing executes); mobile-width pass on `/vault`, `/cases/[id]`, `/review`.
- **Before declaring done:** run typecheck, lint, unit tests, smoke, and `pnpm build`.

---

## 16. Out of scope (do not build)

Other platforms; the university's investigation/hearing/sanction process; non-BulSU accused persons; judging whether a report is truthful; email/SMS notifications; case assignment among reviewers; outcome categories on closure; protection against modified Facebook code or in-transit rewriting; legal terms (ToS/Privacy pages are separate); account deletion; reopening cases; revoking shares; an admin UI; TLSNotary; blockchain anchoring; email verification. Mention the ones that matter in the demo as roadmap items.

---

## 17. Deploy and demo

- Deploy the Next.js app (Vercel or similar) with the env vars above. Watch the request-body limit if on Vercel (the 4 MB cap exists for this). Point `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` and the extension's `APP_URL` at the deployed origin and rebuild the extension.
- Run `db:migrate` (not just `push`) against the production database and run the seed for demo accounts.
- **Demo script (about 6 minutes):** (1) Maya captures a post and a Messenger thread with the extension; show a refused capture after `designMode` is turned on. (2) Vault: open the sandboxed viewer, hit Verify now. (3) Share one item with Jules; Jules adds his own. (4) Build the case, open the escalation preview, confirm, show the locked state. (5) Reviewer board: open the case, see collaborators and the hash/time per item. (6) Alex shares context with the reviewer; the reviewer attaches it; show Maya cannot see it. (7) Close with a note; Maya's timeline and notification show the outcome. (8) Be upfront about limits: tamper-checked not tamper-proof, no email verification, loaded-messages-only.

---

## 18. Definition of done

- Every milestone's acceptance check passed and the smoke test is green.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` pass.
- The security checklist (section 13) is fully ticked.
- The extension captures at least one real Facebook post and one Messenger conversation end to end.
- README documents setup, env vars, how to run the app, load the extension, seed data, and run the tests.
- Remaining gaps are listed in the README under "Known limitations", matching the proposal's Risks section.
