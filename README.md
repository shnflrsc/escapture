# Escapture

**Keep a record of what happened.**

Escapture helps university students who are being cyberbullied on Facebook keep evidence of what happened, build a case from it, and bring it to their school's case reviewers when they are ready.

Live app: **https://escapture.vercel.app**

<!-- DEMO VIDEO: add the link here, e.g. [Watch the 3-minute demo](https://...) -->

![The Escapture home page](docs/screenshots/home.png)

## Project description

A post can be edited or deleted within minutes, and a screenshot is easy to fake, so even a genuine one gets doubted. Students end up keeping evidence in a camera roll, retelling the story to everyone who asks, and reporting with material the school can't easily check.

Escapture gives each side what it needs:

- **Students** capture a Facebook post or Messenger conversation with the Escapture Chrome extension. Before saving, the extension checks whether the page was edited in the browser and refuses to capture if it was. The capture is saved as a frozen, script-free copy in the student's private vault, with a SHA-256 hash and a capture time recorded by the server.
- **The student stays in control.** Nothing reaches the school until the student escalates a case. They choose what goes in it, who helps build it, and when to send it.
- **Reviewers** (for example, a student affairs office) get an organized case: a title, a description, and evidence they can open, each item labelled *Captured with tamper checks*, with its hash and capture time. They review the case, add the other side's evidence when it arrives, and record how the case ended.

Escapture supports the university's own process and doesn't replace it. It doesn't decide who is right.

The pilot is built for Bulacan State University: students sign up with their `@ms.bulsu.edu.ph` email.

## Features

### For students

- **Tamper-checked capture (Chrome extension).** Pick a post, or pick the messages you want from a conversation, then capture. The extension refuses a page that was edited through browser developer tools, page editing mode, userscripts or another extension. Every capture is hashed and uploaded straight to your vault.
- **Private vault.** Your evidence, readable as the original post or conversation, shown in a sandboxed viewer that runs no scripts. Each item shows its hash and capture time, and can be re-checked against the stored file at any time.
- **Sharing you control.** Share an item with another Escapture user by email, or through a password-protected link. You can see who has access, remove anyone, and list and revoke your links.
- **Cases.** Gather evidence into a case with a title and description. Invite people you trust to add evidence from their own vaults. Everyone on a draft sees who else is there and edits it together, live.
- **Deliberate escalation.** Before escalating, you see a preview of exactly what reviewers will see: every person and every item. Once escalated, the case is locked, so it can't be edited or withdrawn, and its evidence can't be deleted while the case is open.
- **Status and notifications.** Follow your case from Escalated to Under Review to Closed, read the reviewer's closing note, and get notified in the app when anything changes.
- **Your evidence after a case closes.** Reviewers lose access when a case closes, and the case keeps only a record of each item (title, kind, capture time, owner and hash). You can rename or delete your evidence again.

### For reviewers

- **Dashboard.** Counts of open cases by status and a weekly chart of escalations.
- **Review Board.** Every escalated case in one table, with search, filters (assigned to me, unassigned, has collaborators, has flagged words, time period) and the latest activity.
- **Flagged words.** A case whose title or description contains a word from the word bank (for example self-harm or threat terms, in English and Filipino) shows those words on the board and the case page. Flags help reviewers notice a case. They never rank cases and never decide anything, and students never see them.
- **Case review.** Open the evidence the student attached, start the review, and close the case with a note of the actions taken. The student and their collaborators can see the note.
- **The other side.** Attach evidence other people shared with you, such as the accused student's own capture of the full conversation. Those attachments stay separate from the reporter's evidence, and the reporter doesn't see them.
- **Case Archives.** Look up closed cases and their records.

### For administrators

- **Reviewer accounts.** Create a reviewer and get a one-time setup link to pass on, so only the reviewer ever knows their password. Deactivate and reactivate accounts.
- **Assignment.** Assign one or more reviewers to a case. They're notified, but any reviewer can still act on any case.
- **Word bank.** Add or remove flagged words. Cases are re-checked straight away.
- **Full review access.** Administrators can do everything a reviewer can.

### Built-in safeguards

- Every permission is checked on the server, never only in the interface.
- Uploads are re-hashed by the server, and a mismatch is rejected.
- Captured pages are treated as untrusted. They are served with a sandbox policy and shown only in a sandboxed frame.
- Row-level security is on for every database table, and sign-in and the API are rate-limited.
- Escapture describes captures as *tamper-checked*, never *tamper-proof* or *verified*.

<!-- SCREENSHOT: vault with captured items -->
<!-- SCREENSHOT: extension popup and element picker on a Facebook post -->
<!-- SCREENSHOT: Review Board with flagged words -->

## Setup

These steps run Escapture on your own computer with demo accounts and data. No Supabase or Vercel account is needed: evidence files are stored on local disk.

### Requirements

- **Node.js** 20.9 or newer
- **pnpm** 11 (`npm install -g pnpm`)
- **Docker Desktop**, running, for the local Postgres database
- **Google Chrome**, for the extension

### 1. Install and configure

```bash
git clone https://github.com/shnflrsc/escapture.git
cd escapture
pnpm install
```

Copy the example settings file:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` and set these three lines. Leave the rest as they are.

```
DATABASE_URL=postgres://postgres:postgres@localhost:54329/safetrail
DIRECT_URL=postgres://postgres:postgres@localhost:54329/safetrail
BETTER_AUTH_SECRET=<a long random string>
```

To generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 2. Start the database and the app

```bash
pnpm db:local     # starts Postgres in Docker on port 54329
pnpm db:migrate   # creates the tables
pnpm db:seed      # adds demo accounts, evidence and cases
pnpm dev          # http://localhost:3000
```

`pnpm db:seed` prints the demo accounts and their shared password:

| Role | Email |
|---|---|
| Administrator | `admin@safetrail.test` |
| Reviewer | `reviewer1@safetrail.test`, `reviewer2@safetrail.test` |
| Student (reporter) | `maya.demo@ms.bulsu.edu.ph` |
| Student (collaborator) | `jules.demo@ms.bulsu.edu.ph` |
| Student (the other party) | `alex.demo@ms.bulsu.edu.ph` |

Open http://localhost:3000 and sign in as any of them.

### 3. Build and load the extension

```bash
pnpm ext:build
```

The build points the extension at the app address in `.env.local` (http://localhost:3000 by default). It prints the extension's ID, `idlfmehfilgnnlgpiokgpanpjdfnejnd`, which is fixed by `extension/key.json`. `.env.example` already trusts that ID.

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose the `extension/dist` folder.
3. Pin **Escapture** to the toolbar, open it, and sign in with a student account, for example Maya.

### 4. Capture something

The extension works on `facebook.com` and `messenger.com`.

1. **Reload the Facebook tab** after installing or reloading the extension. The tamper guard only watches pages loaded after the extension starts.
2. Open a post or a Messenger conversation, open the extension and click **Capture this page**.
3. **For a post:** click anywhere in it. The whole post is outlined. Use **Wider** or **Narrower** if needed, then **Capture this post**.
4. **For messages:** click each message you want (Shift-click selects a range), or use **Select all loaded messages**, then **Capture**. Only messages loaded on screen can be captured, so scroll up first to include earlier ones.
5. The capture appears in your vault at http://localhost:3000/vault.

**Without a Facebook account:** run `pnpm fixtures:serve` and capture from the fake pages at http://localhost:4100/fake-facebook-post.html or http://localhost:4100/fake-messenger.html.

**To see the tamper check refuse a capture:** on one of those pages, right-click the post text, choose **Inspect**, edit the text in the Elements panel, then try to capture it.

### Try the full journey

1. As **Maya**, create a case from the vault, attach evidence, and add a description.
2. Click **Escalate**, read the preview and confirm.
3. Sign in as **reviewer1** in another browser profile. The case is on the Review Board.
4. Open it, click **Start review**, then **Close case** and write a note.
5. Back as Maya, the case shows *Closed* with the reviewer's note, and a notification.

### Creating more accounts

Students can register at `/sign-up` with an `@ms.bulsu.edu.ph` email. Reviewers can't sign up. An administrator creates them on the **Reviewer accounts** page, or from the command line:

```bash
pnpm admin:create-user --email someone@example.com --name "Full Name" --password "at-least-8-chars" --role reviewer
```

## Tech stack

- **Web app:** Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS v4.
- **Data:** Postgres with Drizzle ORM. Supabase hosts the database and evidence storage in production; Docker runs the database in development.
- **Sign-in:** Better Auth, with email and password, and bearer tokens for the extension.
- **Validation:** Zod.
- **Extension:** Chrome Manifest V3, bundled with esbuild.
- **Hosting:** Vercel.
- **Tests:** Vitest, plus an end-to-end API smoke test.

## Testing

```bash
pnpm typecheck
pnpm lint
pnpm test        # unit tests
pnpm smoke       # end-to-end walkthrough through the API; needs `pnpm dev` running
```

- **Unit tests** cover:
  - who may do what, for every role and case status;
  - the escalation preview check;
  - hashing and link passwords;
  - the email-domain rule and request validation;
  - flagged-word matching;
  - a guard that fails if any API route skips the sign-in check.
- **The smoke test** creates fresh accounts and walks the whole product: sign-up, uploads with hash checking, sharing and links, cases and collaborators, escalation and locking, reviewer-only access, reviewer attachments staying hidden from the reporter, closing, notifications and flagged words.

## Project structure

```
app/
  (marketing)/     home, Terms of Service, Privacy Policy, Contact
  (auth)/          sign in, register
  (public)/        shared links, reviewer account setup
  (app)/           vault, cases, notifications, review, admin
  api/             route handlers: validate, call a service, return
server/
  authz.ts         every permission decision
  services/        evidence, sharing, cases, review, flags, notifications
  db/              database schema and client
  storage.ts       evidence file storage (Supabase, or local disk)
components/        interface components
extension/         the Escapture Chrome extension
drizzle/           database migrations
fixtures/          fake Facebook pages for testing capture
scripts/           seed, create-user, smoke test
```

## Team

**Team Echelon**

- **Hezekiah Christal Dionisio**, Team Lead: project direction, coordination and the core concept.
- **Darl Shanen Floresca**, Lead Developer: full-stack implementation and system architecture.
- **Kyle Acuña**, Front-End and UI/UX Designer: interface and experience design, and pitch video.
