// End-to-end API walkthrough (INSTRUCTIONS.md section 15). Runs against a
// running dev server and asserts the product invariants. Uses fresh accounts
// on every run, so it is safe to repeat.
//   pnpm dev   (in one terminal)
//   pnpm smoke
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { allowedEmailDomain } from "@/lib/email-domain";
import { sha256Hex } from "@/lib/hash";
import { pg } from "@/server/db";
import { ensureUser } from "./lib/users";

const BASE = process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const DOMAIN = allowedEmailDomain();
const run = Date.now().toString(36);
const PASSWORD = "smoke-test-password";

let passed = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name}${detail === undefined ? "" : ` -> ${JSON.stringify(detail)}`}`);
  }
}
const step = (title: string) => console.log(`\n${title}`);

type Res = { status: number; body: any; headers: Headers }; // eslint-disable-line @typescript-eslint/no-explicit-any

async function call(token: string | null, method: string, path: string, body?: unknown): Promise<Res> {
  const headers: Record<string, string> = { Origin: BASE };
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload, redirect: "manual" });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: res.status, body: parsed, headers: res.headers };
}

async function signUp(name: string, email: string) {
  const res = await call(null, "POST", "/api/auth/sign-up/email", { name, email, password: PASSWORD });
  return { res, token: res.headers.get("set-auth-token") };
}
async function signIn(email: string, password: string) {
  const res = await call(null, "POST", "/api/auth/sign-in/email", { email, password });
  return res.headers.get("set-auth-token");
}

const report = {
  checks: [
    { id: "design-mode", passed: true },
    { id: "contenteditable", passed: true },
    { id: "userscript-markers", passed: true },
    { id: "injected-elements", passed: true },
  ],
  allPassed: true,
};

function uploadForm(bytes: Uint8Array, sha256: string, kind: string) {
  const form = new FormData();
  form.set("file", new File([bytes as BlobPart], "capture.html", { type: "text/html" }));
  form.set("sha256", sha256);
  form.set("kind", kind);
  form.set("sourceUrl", "https://www.facebook.com/sample/posts/1");
  form.set("clientCapturedAt", new Date().toISOString());
  form.set("tamperReport", JSON.stringify(report));
  form.set("extensionVersion", "smoke");
  return form;
}

async function main() {
  console.log(`Escapture smoke test against ${BASE} (run ${run})`);
  const post = new Uint8Array(await readFile("fixtures/fake-facebook-post.html"));
  const chat = new Uint8Array(await readFile("fixtures/fake-messenger.html"));
  // Unique bytes per run so storage paths and hashes never collide with old runs.
  const tag = (b: Uint8Array) => new Uint8Array([...b, ...new TextEncoder().encode(`\n<!-- ${run} ${Math.random()} -->`)]);

  step("1. Sign-up gate");
  const maya = await signUp("Maya Smoke", `maya.${run}@${DOMAIN}`);
  const jules = await signUp("Jules Smoke", `jules.${run}@${DOMAIN}`);
  const alex = await signUp("Alex Smoke", `alex.${run}@${DOMAIN}`);
  check("Maya, Jules and Alex sign up with BulSU emails", Boolean(maya.token && jules.token && alex.token), [
    maya.res.status,
    maya.res.body,
  ]);
  const outsider = await signUp("Outsider", `outsider.${run}@gmail.com`);
  check("a non-BulSU sign-up is rejected", outsider.res.status >= 400 && !outsider.token, outsider.res.status);
  const roleGrab = await call(null, "POST", "/api/auth/sign-up/email", {
    name: "Role Grab",
    email: `rolegrab.${run}@${DOMAIN}`,
    password: PASSWORD,
    role: "reviewer",
  });
  const grabToken = roleGrab.headers.get("set-auth-token");
  const grabBoard = grabToken ? await call(grabToken, "GET", "/api/review/cases") : { status: roleGrab.status };
  check("role cannot be set by client input", roleGrab.status >= 400 || grabBoard.status === 403, [
    roleGrab.status,
    grabBoard.status,
  ]);
  const promote = await call(maya.token, "POST", "/api/auth/update-user", { role: "reviewer" });
  check("role cannot be changed through the profile-update endpoint", (await call(maya.token, "GET", "/api/review/cases")).status === 403, promote.status);
  check("unauthenticated API calls get 401", (await call(null, "GET", "/api/evidence")).status === 401);
  const M = maya.token!, J = jules.token!, A = alex.token!;

  const reviewerEmail = `reviewer.${run}@safetrail.test`;
  await ensureUser({ email: reviewerEmail, name: "Reviewer Smoke", password: PASSWORD, role: "reviewer" });
  const R = (await signIn(reviewerEmail, PASSWORD))!;
  check("a script-created reviewer can sign in", Boolean(R));

  step("2. Evidence upload");
  const mayaBytes = tag(post);
  const wrong = await call(M, "POST", "/api/evidence", uploadForm(mayaBytes, "0".repeat(64), "facebook_post"));
  check("wrong hash -> 422", wrong.status === 422, wrong.body);
  const up1 = await call(M, "POST", "/api/evidence", uploadForm(mayaBytes, sha256Hex(mayaBytes), "facebook_post"));
  check("right hash -> 201", up1.status === 201, up1.body);
  const mayaEv = up1.body.id as string;
  check("server records the hash and its own capture time", up1.body.sha256 === sha256Hex(mayaBytes) && Boolean(up1.body.capturedAt));
  const mayaBytes2 = tag(chat);
  const up2 = await call(M, "POST", "/api/evidence", uploadForm(mayaBytes2, sha256Hex(mayaBytes2), "facebook_message"));
  const mayaEv2 = up2.body.id as string;
  const julesBytes = tag(chat);
  const up3 = await call(J, "POST", "/api/evidence", uploadForm(julesBytes, sha256Hex(julesBytes), "facebook_message"));
  check("Jules uploads his own", up3.status === 201, up3.body);
  const julesEv = up3.body.id as string;
  const alexBytes = tag(post);
  const up4 = await call(A, "POST", "/api/evidence", uploadForm(alexBytes, sha256Hex(alexBytes), "facebook_post"));
  const alexEv = up4.body.id as string;
  check("reviewers cannot upload evidence", (await call(R, "POST", "/api/evidence", uploadForm(mayaBytes, sha256Hex(mayaBytes), "facebook_post"))).status === 403);
  const big = new Uint8Array(4 * 1024 * 1024 + 1024).fill(32);
  check("oversized capture -> 413", (await call(M, "POST", "/api/evidence", uploadForm(big, sha256Hex(big), "facebook_post"))).status === 413);

  // Compressed uploads: the hash is still of the unpacked HTML, which is what gets stored.
  const gzForm = (bytes: Uint8Array, sha256: string) => {
    const form = uploadForm(bytes, sha256, "facebook_post");
    form.set("file", new File([gzipSync(bytes) as BlobPart], "capture.html.gz", { type: "application/gzip" }));
    form.set("encoding", "gzip");
    return form;
  };
  const gzBytes = tag(post);
  const gzUp = await call(M, "POST", "/api/evidence", gzForm(gzBytes, sha256Hex(gzBytes)));
  check("gzip upload -> 201, hashed over the unpacked file", gzUp.status === 201 && gzUp.body.sha256 === sha256Hex(gzBytes) && gzUp.body.byteSize === gzBytes.byteLength, gzUp.body);
  check("the unpacked file is what is stored", sha256Hex(await (await fetch(`${BASE}/api/evidence/${gzUp.body.id}/file`, { headers: { Authorization: `Bearer ${M}` } })).bytes()) === sha256Hex(gzBytes));
  check("gzip upload with a wrong hash -> 422", (await call(M, "POST", "/api/evidence", gzForm(gzBytes, "0".repeat(64)))).status === 422);
  const bomb = new Uint8Array(13 * 1024 * 1024).fill(32);
  check("a small upload that unpacks past the limit -> 413", (await call(M, "POST", "/api/evidence", gzForm(bomb, sha256Hex(bomb)))).status === 413);
  const notGz = uploadForm(gzBytes, sha256Hex(gzBytes), "facebook_post");
  notGz.set("file", new File([gzBytes as BlobPart], "capture.html.gz", { type: "application/gzip" }));
  notGz.set("encoding", "gzip");
  check("a corrupt gzip upload -> 400", (await call(M, "POST", "/api/evidence", notGz)).status === 400);
  await call(M, "DELETE", `/api/evidence/${gzUp.body.id}`);

  const file = await call(M, "GET", `/api/evidence/${mayaEv}/file`);
  const csp = file.headers.get("content-security-policy") ?? "";
  check("file is served with the sandbox CSP and nosniff", file.status === 200 && csp.startsWith("sandbox;") && !csp.includes("allow-scripts") && file.headers.get("x-content-type-options") === "nosniff", csp);
  check("stored bytes are exactly the uploaded bytes", sha256Hex(await (await fetch(`${BASE}/api/evidence/${mayaEv}/file`, { headers: { Authorization: `Bearer ${M}` } })).bytes()) === sha256Hex(mayaBytes));
  const verify = await call(M, "GET", `/api/evidence/${mayaEv}/verify`);
  check("verify recomputes and matches", verify.status === 200 && verify.body.match === true, verify.body);

  step("3. Sharing by email");
  check("sharing without acknowledgment is refused", (await call(M, "POST", `/api/evidence/${mayaEv}/shares`, { email: `jules.${run}@${DOMAIN}` })).status === 400);
  const share = await call(M, "POST", `/api/evidence/${mayaEv}/shares`, { email: `jules.${run}@${DOMAIN}`, acknowledge: true });
  check("Maya shares an item with Jules", share.status === 201, share.body);
  check("Jules can open it", (await call(J, "GET", `/api/evidence/${mayaEv}`)).status === 200);
  const julesShared = await call(J, "GET", "/api/evidence?scope=shared");
  check("it appears in Jules's shared list", julesShared.body.items?.some((i: { id: string }) => i.id === mayaEv));

  // The vault list: search, filter and sort happen on the server.
  type Listed = { id: string; kind: string; label: string; caseCount?: number; locked?: boolean };
  const list = async (token: string, query: string) => (await call(token, "GET", `/api/evidence?${query}`)).body.items as Listed[];
  const allMine = await list(M, "scope=mine");
  const onlyMessages = await list(M, "scope=mine&kind=facebook_message");
  check("the kind filter narrows the list", onlyMessages.length > 0 && onlyMessages.length < allMine.length && onlyMessages.every((i) => i.kind === "facebook_message"), onlyMessages);
  check("search matches the name, ignoring case", (await list(M, "scope=mine&q=FACEBOOK%20POST")).every((i) => i.label.toLowerCase().includes("facebook post")) && (await list(M, "scope=mine&q=facebook%20post")).length > 0);
  check("a search that matches nothing returns nothing", (await list(M, "scope=mine&q=no-such-name-" + run)).length === 0);
  check("% in a search is a character, not a wildcard", (await list(M, "scope=mine&q=%25")).length === 0);
  const oldest = await list(M, "scope=mine&sort=oldest");
  check("oldest first reverses newest first", oldest.map((i) => i.id).join() === [...allMine].reverse().map((i) => i.id).join(), oldest.map((i) => i.id));
  check("an unknown kind -> 400", (await call(M, "GET", "/api/evidence?kind=tweet")).status === 400);
  check("an unknown sort -> 400", (await call(M, "GET", "/api/evidence?sort=random")).status === 400);
  check("your own list says whether each item is in a case or locked", allMine.every((i) => i.caseCount === 0 && i.locked === false), allMine);
  check("a shared list carries no case information", julesShared.body.items.every((i: Listed) => !("caseCount" in i) && !("locked" in i)));
  check("the shared list can be searched by who shared it", (await list(J, "scope=shared&q=maya")).some((i) => i.id === mayaEv) && (await list(J, "scope=shared&q=no-such-person")).length === 0);
  check("a stranger gets 404 on the item", (await call(A, "GET", `/api/evidence/${mayaEv}`)).status === 404);
  check("a stranger gets 404 on the file", (await call(A, "GET", `/api/evidence/${mayaEv}/file`)).status === 404);
  check("recipients cannot re-share", (await call(J, "POST", `/api/evidence/${mayaEv}/shares`, { email: `alex.${run}@${DOMAIN}`, acknowledge: true })).status === 403);
  check("sharing to an unknown email -> 404", (await call(M, "POST", `/api/evidence/${mayaEv}/shares`, { email: `nobody.${run}@${DOMAIN}`, acknowledge: true })).status === 404);

  step("3b. Password-protected links");
  const link = await call(M, "POST", `/api/evidence/${mayaEv2}/links`, { password: "link-password-1", acknowledge: true });
  check("Maya creates a link", link.status === 201 && typeof link.body.url === "string", link.body);
  const token = String(link.body.url).split("/s/")[1];
  const meta = await call(null, "GET", `/api/links/${token}`);
  check("public link metadata reveals only validity and type", meta.status === 200 && JSON.stringify(Object.keys(meta.body).sort()) === '["resourceType","valid"]', meta.body);
  check("redeeming requires a session", (await call(null, "POST", `/api/links/${token}/redeem`, { password: "link-password-1" })).status === 401);
  check("wrong link password is rejected", (await call(J, "POST", `/api/links/${token}/redeem`, { password: "nope" })).status === 403);
  check("Jules still cannot see the item", (await call(J, "GET", `/api/evidence/${mayaEv2}`)).status === 404);
  const redeemed = await call(J, "POST", `/api/links/${token}/redeem`, { password: "link-password-1" });
  check("right password grants access", redeemed.status === 200 && (await call(J, "GET", `/api/evidence/${mayaEv2}`)).status === 200, redeemed.body);
  const lockLink = await call(M, "POST", `/api/evidence/${mayaEv2}/links`, { password: "link-password-2", acknowledge: true });
  const lockToken = String(lockLink.body.url).split("/s/")[1];
  let last = 0;
  for (let i = 0; i < 10; i++) last = (await call(A, "POST", `/api/links/${lockToken}/redeem`, { password: `guess-${i}` })).status;
  check("the 10th wrong password locks the link (429)", last === 429, last);
  check("a locked link refuses even the right password", (await call(A, "POST", `/api/links/${lockToken}/redeem`, { password: "link-password-2" })).status === 429);

  step("4. Cases and collaborators");
  const created = await call(M, "POST", "/api/cases", { title: `Group project messages ${run}`, description: "What happened last week." });
  check("Maya creates a draft case", created.status === 201 && created.body.status === "draft", created.body);
  const caseId = created.body.id as string;
  check("Maya attaches her item", (await call(M, "POST", `/api/cases/${caseId}/evidence`, { evidenceId: mayaEv })).status === 201);
  check("Jules gets 404 before being added", (await call(J, "GET", `/api/cases/${caseId}`)).status === 404);
  check("adding a collaborator requires acknowledgment", (await call(M, "POST", `/api/cases/${caseId}/collaborators`, { email: `jules.${run}@${DOMAIN}` })).status === 400);
  check("Maya adds Jules", (await call(M, "POST", `/api/cases/${caseId}/collaborators`, { email: `jules.${run}@${DOMAIN}`, acknowledge: true })).status === 201);
  check("Jules can edit the description", (await call(J, "PATCH", `/api/cases/${caseId}`, { description: "What happened last week. Jules saw it too." })).status === 200);
  check("Jules attaches his own item", (await call(J, "POST", `/api/cases/${caseId}/evidence`, { evidenceId: julesEv })).status === 201);
  check("Jules cannot attach Maya's item", (await call(J, "POST", `/api/cases/${caseId}/evidence`, { evidenceId: mayaEv2 })).status === 403);

  // The evidence page's case list: only cases the viewer is part of.
  type InCases = { attached: { id: string; status: string }[]; available: { id: string }[] };
  const inCases = async (token: string, ev: string) => (await call(token, "GET", `/api/evidence/${ev}/cases`)).body as InCases;
  const ownerView = await inCases(M, mayaEv);
  check("the owner sees the case her evidence is in, and it is no longer offered", ownerView.attached.some((c) => c.id === caseId && c.status === "draft") && !ownerView.available.some((c) => c.id === caseId), ownerView);
  check("evidence not in the case is offered the draft", (await inCases(M, mayaEv2)).available.some((c) => c.id === caseId) && (await inCases(M, mayaEv2)).attached.length === 0);
  const collabView = await inCases(J, mayaEv);
  check("a collaborator it was shared with sees the case, but cannot add someone else's evidence", collabView.attached.some((c) => c.id === caseId) && collabView.available.length === 0, collabView);
  check("a stranger gets 404 on the case list", (await call(A, "GET", `/api/evidence/${mayaEv}/cases`)).status === 404);
  check("Jules shares his attached item with Alex", (await call(J, "POST", `/api/evidence/${julesEv}/shares`, { email: `alex.${run}@${DOMAIN}`, acknowledge: true })).status === 201);
  const sharedOnly = await inCases(A, julesEv);
  check("someone it was only shared with learns nothing about the case", sharedOnly.attached.length === 0 && sharedOnly.available.length === 0, sharedOnly);
  check("Jules cannot add collaborators", (await call(J, "POST", `/api/cases/${caseId}/collaborators`, { email: `alex.${run}@${DOMAIN}`, acknowledge: true })).status === 403);
  check("Maya can open Jules's attached item", (await call(M, "GET", `/api/evidence/${julesEv}`)).status === 200);
  check("Alex gets 404 on the case (I6)", (await call(A, "GET", `/api/cases/${caseId}`)).status === 404);
  check("Alex gets 404 editing the case", (await call(A, "PATCH", `/api/cases/${caseId}`, { title: "x" })).status === 404);
  check("a reviewer cannot see the draft case (I1)", (await call(R, "GET", `/api/review/cases/${caseId}`)).status === 404);
  check("a reviewer cannot see draft-case evidence (I1)", (await call(R, "GET", `/api/evidence/${mayaEv}`)).status === 404);
  const boardBefore = await call(R, "GET", "/api/review/cases");
  check("the draft is not on the Review Board", boardBefore.status === 200 && !boardBefore.body.items.some((c: { id: string }) => c.id === caseId));

  step("5. Escalation with preview digest");
  check("Jules cannot preview or escalate", (await call(J, "GET", `/api/cases/${caseId}/escalation-preview`)).status === 403 && (await call(J, "POST", `/api/cases/${caseId}/escalate`, { digest: "0".repeat(64), confirm: true })).status === 403);
  const preview = await call(M, "GET", `/api/cases/${caseId}/escalation-preview`);
  check("preview lists every collaborator and item", preview.status === 200 && preview.body.collaborators.length === 1 && preview.body.evidence.length === 2, preview.body);
  check("escalating without confirm is refused", (await call(M, "POST", `/api/cases/${caseId}/escalate`, { digest: preview.body.digest })).status === 400);
  await call(J, "PATCH", `/api/cases/${caseId}`, { description: "Edited after Maya opened the preview." });
  const stale = await call(M, "POST", `/api/cases/${caseId}/escalate`, { digest: preview.body.digest, confirm: true });
  check("digest mismatch -> 409", stale.status === 409, stale.body);
  const preview2 = await call(M, "GET", `/api/cases/${caseId}/escalation-preview`);
  const escalated = await call(M, "POST", `/api/cases/${caseId}/escalate`, { digest: preview2.body.digest, confirm: true });
  check("correct digest -> escalated", escalated.status === 200 && escalated.body.status === "escalated", escalated.body);

  step("6. Lock after escalation (I3)");
  check("edit -> 409", (await call(M, "PATCH", `/api/cases/${caseId}`, { title: "New title" })).status === 409);
  check("collaborator edit -> 409", (await call(J, "PATCH", `/api/cases/${caseId}`, { description: "x" })).status === 409);
  check("attach -> 409", (await call(M, "POST", `/api/cases/${caseId}/evidence`, { evidenceId: mayaEv2 })).status === 409);
  check("detach -> 409", (await call(M, "DELETE", `/api/cases/${caseId}/evidence/${mayaEv}`)).status === 409);
  check("delete attached evidence -> 409", (await call(M, "DELETE", `/api/evidence/${mayaEv}`)).status === 409);
  check("rename attached evidence -> 409", (await call(M, "PATCH", `/api/evidence/${mayaEv}`, { label: "Renamed" })).status === 409);
  const lockedRow = (await list(M, "scope=mine")).find((i) => i.id === mayaEv);
  const sharedRow = lockedRow as unknown as { shareCount: number; linkCount: number; caseTitle: string | null };
  check("the owner's list says how widely each item is shared and which case it is in", sharedRow.shareCount === 1 && sharedRow.linkCount === 0 && typeof sharedRow.caseTitle === "string", sharedRow);
  check("the owner's list shows it as in a case and locked", lockedRow?.caseCount === 1 && lockedRow.locked === true, lockedRow);
  check("add collaborator -> 409", (await call(M, "POST", `/api/cases/${caseId}/collaborators`, { email: `alex.${run}@${DOMAIN}`, acknowledge: true })).status === 409);
  check("escalate again -> 409", (await call(M, "POST", `/api/cases/${caseId}/escalate`, { digest: preview2.body.digest, confirm: true })).status === 409);
  check("unattached evidence can still be deleted", (await call(M, "DELETE", `/api/evidence/${mayaEv2}`)).status === 200);

  step("7. Review Board");
  const board = await call(R, "GET", "/api/review/cases?status=escalated");
  check("a reviewer sees the case on the board", board.body.items?.some((c: { id: string }) => c.id === caseId));
  type BoardRow = { id: string; status: string; reporterName: string; escalatedAt: string };
  const table = async (query: string) => (await call(R, "GET", `/api/review/cases?${query}`)).body as { items: BoardRow[]; counts: { all: number; escalated: number; under_review: number }; total: number; pages: number };
  const byReporter = await table(`q=${encodeURIComponent("maya smoke")}`);
  check("the board searches by reporter, ignoring case", byReporter.items.some((c) => c.id === caseId) && byReporter.items.every((c) => c.reporterName.toLowerCase().includes("maya smoke")));
  check("the board searches by title", (await table(`q=${encodeURIComponent(run)}&status=escalated`)).items.some((c) => c.id === caseId) && (await table("q=no-such-case-" + run)).items.length === 0);
  const newest = await table("sort=-escalated");
  check("newest escalated first reverses the default order", newest.items.length > 0 && newest.items.every((c, i, all) => i === 0 || all[i - 1].escalatedAt >= c.escalatedAt) && newest.pages >= 1);
  check("the status tab narrows the table and the counts add up", (await table("status=under_review&sort=escalated")).items.every((c) => c.status === "under_review") && newest.counts.all === newest.counts.escalated + newest.counts.under_review && newest.total === newest.counts.all);
  check("drafts and closed cases are never on the board", newest.items.every((c) => c.status === "escalated" || c.status === "under_review"));
  check("an unknown sort or status -> 400", (await call(R, "GET", "/api/review/cases?sort=random")).status === 400 && (await call(R, "GET", "/api/review/cases?status=closed&q=x")).status === 400);
  const withPeople = await call(R, "GET", "/api/review/cases?collab=1&sort=escalated");
  check("the collaborators filter keeps only cases that have one, and each row says what last happened", withPeople.status === 200 && withPeople.body.items.some((c: { id: string }) => c.id === caseId) && withPeople.body.items.every((c: { collaboratorCount: number; lastEvent: { type: string } | null }) => c.collaboratorCount > 0 && c.lastEvent), withPeople.body.items?.[0]);
  check("the reviewer-attachments filter is empty before anything is attached to this case", !(await call(R, "GET", "/api/review/cases?rev=1")).body.items.some((c: { id: string }) => c.id === caseId));
  const summary = await call(R, "GET", "/api/review/summary");
  check("the summary counts match the board", summary.status === 200 && summary.body.escalated === newest.counts.escalated && summary.body.underReview === newest.counts.under_review && summary.body.newThisWeek >= 1 && typeof summary.body.closedThisMonth === "number", summary.body);
  check("students cannot read the board table or its summary", (await call(M, "GET", "/api/review/cases?q=x")).status === 403 && (await call(M, "GET", "/api/review/summary")).status === 403);
  const rc = await call(R, "GET", `/api/review/cases/${caseId}`);
  check("reviewer sees both items", rc.status === 200 && rc.body.reporterEvidence.length === 2, rc.body);
  check("reviewer sees collaborator identities", rc.body.collaborators?.[0]?.email === `jules.${run}@${DOMAIN}` && rc.body.owner?.email === `maya.${run}@${DOMAIN}`);
  check("reviewer can open attached evidence and its file", (await call(R, "GET", `/api/evidence/${mayaEv}`)).status === 200 && (await call(R, "GET", `/api/evidence/${julesEv}/file`)).status === 200);
  const reviewRoutes: [string, string, unknown?][] = [
    ["GET", "/api/review/cases"],
    ["GET", `/api/review/cases/${caseId}`],
    ["POST", `/api/review/cases/${caseId}/status`, { status: "under_review" }],
    ["POST", `/api/review/cases/${caseId}/close`, { note: "x" }],
    ["POST", `/api/review/cases/${caseId}/evidence`, { evidenceId: mayaEv }],
    ["GET", "/api/review/archives"],
  ];
  const mayaReview = await Promise.all(reviewRoutes.map(([m, p, b]) => call(M, m, p, b)));
  check("Maya cannot call any /api/review/* route", mayaReview.every((r) => r.status === 403), mayaReview.map((r) => r.status));
  check("reviewers cannot use the student case view", (await call(R, "GET", `/api/cases/${caseId}`)).status === 404);

  step("8. Reviewer attachments stay separate (I5)");
  check("reviewer cannot attach evidence not shared with them", (await call(R, "POST", `/api/review/cases/${caseId}/evidence`, { evidenceId: alexEv })).status === 404);
  check("Alex shares his evidence with the reviewer", (await call(A, "POST", `/api/evidence/${alexEv}/shares`, { email: reviewerEmail, acknowledge: true })).status === 201);
  const rAttach = await call(R, "POST", `/api/review/cases/${caseId}/evidence`, { evidenceId: alexEv });
  check("the reviewer attaches it with side=reviewer", rAttach.status === 201 && rAttach.body.side === "reviewer", rAttach.body);
  const alexView = await inCases(A, alexEv);
  check("a reviewer's attachment is not listed for the owner", alexView.attached.length === 0, alexView);
  check("reviewers cannot use the student case list", (await call(R, "GET", `/api/evidence/${alexEv}/cases`)).status === 403);
  const rc2 = await call(R, "GET", `/api/review/cases/${caseId}`);
  check("reviewer sees it under reviewer attachments only", rc2.body.reviewerEvidence.some((e: { id: string }) => e.id === alexEv) && !rc2.body.reporterEvidence.some((e: { id: string }) => e.id === alexEv));
  const mayaCase = await call(M, "GET", `/api/cases/${caseId}`);
  check("Maya's case view does not include it", mayaCase.status === 200 && !JSON.stringify(mayaCase.body).includes(alexEv));
  check("Maya's preview-style listing has only reporter evidence", mayaCase.body.evidence.length === 2);
  check("Maya and Jules cannot open Alex's evidence", (await call(M, "GET", `/api/evidence/${alexEv}`)).status === 404 && (await call(J, "GET", `/api/evidence/${alexEv}/file`)).status === 404);
  check("Alex still cannot see the case (I6)", (await call(A, "GET", `/api/cases/${caseId}`)).status === 404);

  step("9. Status changes and closing");
  const ur = await call(R, "POST", `/api/review/cases/${caseId}/status`, { status: "under_review" });
  check("reviewer sets under_review", ur.status === 200 && ur.body.status === "under_review", ur.body);
  check("closing with an empty note fails", (await call(R, "POST", `/api/review/cases/${caseId}/close`, { note: "   " })).status === 400);
  const closingNote = `Reviewed and referred to the Office of Student Affairs (${run}).`;
  const closedRes = await call(R, "POST", `/api/review/cases/${caseId}/close`, { note: closingNote });
  check("reviewer closes with a note", closedRes.status === 200 && closedRes.body.status === "closed", closedRes.body);
  check("no reopening", (await call(R, "POST", `/api/review/cases/${caseId}/status`, { status: "under_review" })).status === 409);
  check("no attachments after closing", (await call(R, "POST", `/api/review/cases/${caseId}/evidence`, { evidenceId: alexEv })).status === 409);
  const archives = await call(R, "GET", `/api/review/archives?q=${encodeURIComponent(run)}`);
  check("the closed case is in the searchable archives", archives.body.items?.some((c: { id: string }) => c.id === caseId));
  check("closed cases leave the board", !(await call(R, "GET", "/api/review/cases")).body.items.some((c: { id: string }) => c.id === caseId));

  const archive = await call(R, "GET", `/api/review/archives?q=${encodeURIComponent("maya smoke")}`);
  const archived = archive.body.items?.find((c: { id: string }) => c.id === caseId);
  check("the archives find a closed case by its reporter, with who closed it and its evidence count", archive.status === 200 && archived?.closedBy === "Reviewer Smoke" && archived.evidenceCount === 2, archived);

  step("10. Notifications and outcome");
  for (const [name, t] of [["Maya", M], ["Jules", J]] as const) {
    const n = await call(t, "GET", "/api/notifications");
    const types = new Set((n.body.items ?? []).filter((i: { caseId: string }) => i.caseId === caseId).map((i: { type: string }) => i.type));
    check(`${name} is notified of escalation, status change and closure`, ["case_escalated", "case_status_changed", "case_closed"].every((x) => types.has(x)), [...types]);
    const view = await call(t, "GET", `/api/cases/${caseId}`);
    check(`${name} can read the closing note`, view.body.closingNote === closingNote && view.body.events.some((e: { type: string; note: string }) => e.type === "closed" && e.note === closingNote));
  }
  const rn = await call(R, "GET", "/api/notifications");
  check("the reviewer was notified of the escalation", rn.body.items?.some((i: { caseId: string; type: string }) => i.caseId === caseId && i.type === "case_escalated"));
  const an = await call(A, "GET", "/api/notifications");
  check("Alex has no notification about the case", !an.body.items?.some((i: { caseId: string }) => i.caseId === caseId));
  const read = await call(M, "POST", "/api/notifications/read", {});
  check("mark all read", read.status === 200 && read.body.unreadCount === 0, read.body);

  step("10b. After closure: the record stays, the evidence is its owner's again");
  type Rec = { evidenceId: string | null; label: string; sha256: string; ownerName: string };
  const closedView = (await call(R, "GET", `/api/review/cases/${caseId}`)).body as { reporterEvidence: unknown[]; reviewerEvidence: unknown[]; reporterRecord: Rec[]; reviewerRecord: Rec[] };
  const mayaRec = closedView.reporterRecord?.find((r) => r.evidenceId === mayaEv);
  check("a closed case gives reviewers the record, not the evidence", closedView.reporterEvidence.length === 0 && closedView.reviewerEvidence.length === 0 && closedView.reporterRecord.length === 2 && closedView.reviewerRecord.length === 1, closedView);
  check("the record has each item's title, owner and SHA-256", Boolean(mayaRec) && mayaRec!.sha256 === sha256Hex(mayaBytes) && mayaRec!.label.length > 0 && mayaRec!.ownerName === "Maya Smoke" && closedView.reviewerRecord[0].sha256 === sha256Hex(alexBytes), mayaRec);
  check("reviewers can no longer open the student's evidence or its file", (await call(R, "GET", `/api/evidence/${mayaEv}`)).status === 404 && (await call(R, "GET", `/api/evidence/${mayaEv}/file`)).status === 404 && (await call(R, "GET", `/api/evidence/${julesEv}`)).status === 404 && (await call(R, "GET", `/api/evidence/${mayaEv}/verify`)).status === 404);
  check("evidence shared with a reviewer directly stays shared after closure", (await call(R, "GET", `/api/evidence/${alexEv}`)).status === 200);
  check("the student and collaborator still open their case's evidence", (await call(M, "GET", `/api/evidence/${julesEv}`)).status === 200 && (await call(J, "GET", `/api/evidence/${mayaEv}`)).status === 200);

  const sharedWith = (await call(A, "GET", `/api/evidence/${alexEv}/shares`)).body.items as { id: string; email: string; via: string }[];
  const reviewerUser = sharedWith.find((p) => p.email === reviewerEmail);
  check("the owner sees who it is shared with and how", Boolean(reviewerUser) && reviewerUser!.via === "email", sharedWith);
  check("only the owner stops sharing", (await call(R, "DELETE", `/api/evidence/${alexEv}/shares/${reviewerUser!.id}`)).status === 403 && (await call(M, "DELETE", `/api/evidence/${alexEv}/shares/${reviewerUser!.id}`)).status === 404 && (await call(null, "DELETE", `/api/evidence/${alexEv}/shares/${reviewerUser!.id}`)).status === 401);
  check("the owner stops sharing: the reviewer loses it at once", (await call(A, "DELETE", `/api/evidence/${alexEv}/shares/${reviewerUser!.id}`)).status === 200 && (await call(R, "GET", `/api/evidence/${alexEv}`)).status === 404 && (await call(R, "GET", `/api/evidence/${alexEv}/file`)).status === 404 && (await call(A, "DELETE", `/api/evidence/${alexEv}/shares/${reviewerUser!.id}`)).status === 404);

  const newLink = await call(M, "POST", `/api/evidence/${mayaEv}/links`, { password: "link-password-9", acknowledge: true });
  const linkToken = String(newLink.body.url).split("/s/")[1];
  type LinkRow = { id: string; createdAt: string; locked: boolean };
  const linksOf = async () => (await call(M, "GET", `/api/evidence/${mayaEv}/links`)).body.items as LinkRow[];
  const madeLinks = await linksOf();
  check("the owner lists an item's password links with when each was madeLinks; no token or password comes back", newLink.status === 201 && madeLinks.length === 1 && !Number.isNaN(Date.parse(madeLinks[0].createdAt)) && madeLinks[0].locked === false && Object.keys(madeLinks[0]).sort().join() === "createdAt,id,locked", madeLinks);
  check("nobody else lists or revokes them", (await call(J, "GET", `/api/evidence/${mayaEv}/links`)).status === 403 && (await call(A, "GET", `/api/evidence/${mayaEv}/links`)).status === 404 && (await call(J, "DELETE", `/api/evidence/${mayaEv}/links/${madeLinks[0].id}`)).status === 403);
  check("a revoked link stops opening and leaves the list", (await call(M, "DELETE", `/api/evidence/${mayaEv}/links/${madeLinks[0].id}`)).status === 200 && (await linksOf()).length === 0 && (await call(A, "POST", `/api/links/${linkToken}/redeem`, { password: "link-password-9" })).status === 404 && (await call(null, "GET", `/api/links/${linkToken}`)).body.valid === false && (await call(M, "DELETE", `/api/evidence/${mayaEv}/links/${madeLinks[0].id}`)).status === 404);

  const oldLabel = mayaRec!.label;
  check("after closure the owner can rename the evidence again", (await call(M, "PATCH", `/api/evidence/${mayaEv}`, { label: "Renamed after closure" })).status === 200 && (await call(J, "PATCH", `/api/evidence/${mayaEv}`, { label: "x" })).status === 403);
  const afterRename = (await call(R, "GET", `/api/review/cases/${caseId}`)).body.reporterRecord as Rec[];
  check("the record keeps the title it had at closure", afterRename.find((r) => r.evidenceId === mayaEv)?.label === oldLabel && !JSON.stringify(afterRename).includes("Renamed after closure"), afterRename);
  check("after closure the owner can delete the evidence again", (await call(M, "DELETE", `/api/evidence/${mayaEv}`)).status === 200 && (await call(M, "GET", `/api/evidence/${mayaEv}`)).status === 404);
  const recAfterDelete = (await call(M, "GET", `/api/cases/${caseId}`)).body.record as Rec[];
  const gone = recAfterDelete?.find((r) => r.label === oldLabel);
  check("the case still records the deleted item's title and hash", recAfterDelete?.length === 2 && Boolean(gone) && gone!.evidenceId === null && gone!.sha256 === sha256Hex(mayaBytes), recAfterDelete);
  check("the archive still counts it", ((await call(R, "GET", `/api/review/archives?q=${encodeURIComponent(run)}`)).body.items as { id: string; evidenceCount: number }[]).find((c) => c.id === caseId)?.evidenceCount === 2);

  step("11. Drafts stay private (I1)");
  const draft2 = await call(M, "POST", "/api/cases", { title: `Private draft ${run}`, description: "" });
  check("a reviewer cannot see a draft case", (await call(R, "GET", `/api/review/cases/${draft2.body.id}`)).status === 404);
  check("escalating with no evidence is refused", await (async () => {
    const p = await call(M, "GET", `/api/cases/${draft2.body.id}/escalation-preview`);
    return (await call(M, "POST", `/api/cases/${draft2.body.id}/escalate`, { digest: p.body.digest, confirm: true })).status === 400;
  })());

  step("12. Working on a draft together: adding several items, edits, removing, leaving, deleting");
  const upM = async () => {
    const b = tag(post);
    return (await call(M, "POST", "/api/evidence", uploadForm(b, sha256Hex(b), "facebook_post"))).body.id as string;
  };
  const [m1, m2, m3] = [await upM(), await upM(), await upM()];
  const d = (await call(M, "POST", "/api/cases", { title: `Shared draft ${run}`, description: "" })).body.id as string;
  const dCase = async (t: string = M) => (await call(t, "GET", `/api/cases/${d}`)).body;
  const dEvidence = async () => ((await dCase()).evidence as { id: string }[]).map((e) => e.id);

  check("several items are added in one request", (await call(M, "POST", `/api/cases/${d}/evidence`, { evidenceIds: [m1, m2] })).status === 201 && (await dEvidence()).length === 2);
  check("one item that isn't yours refuses the whole request", (await call(M, "POST", `/api/cases/${d}/evidence`, { evidenceIds: [m3, alexEv] })).status === 403 && !(await dEvidence()).includes(m3));
  check("one item already in the case refuses the whole request", (await call(M, "POST", `/api/cases/${d}/evidence`, { evidenceIds: [m3, m1] })).status === 409 && !(await dEvidence()).includes(m3));
  check("an empty list is refused", (await call(M, "POST", `/api/cases/${d}/evidence`, { evidenceIds: [] })).status === 400);
  check("several items cannot be added to an escalated case", (await call(M, "POST", `/api/cases/${caseId}/evidence`, { evidenceIds: [m3] })).status === 409);

  await call(M, "POST", `/api/cases/${d}/collaborators`, { email: `jules.${run}@${DOMAIN}`, acknowledge: true });
  await call(M, "POST", `/api/cases/${d}/collaborators`, { email: `alex.${run}@${DOMAIN}`, acknowledge: true });
  const people = (await dCase()).collaborators as { id: string; name: string }[];
  const julesId = people.find((p) => p.name === "Jules Smoke")!.id;
  const alexId = people.find((p) => p.name === "Alex Smoke")!.id;
  const mayaId = (await dCase()).owner.id as string;

  check("Maya saves the description from empty", (await call(M, "PATCH", `/api/cases/${d}`, { description: "Maya's account.", base: { description: "" } })).status === 200);
  const staleEdit = await call(J, "PATCH", `/api/cases/${d}`, { description: "Jules's account.", base: { description: "" } });
  check("Jules's edit from the old text is refused, with the current text", staleEdit.status === 409 && staleEdit.body.error.code === "edit_conflict" && staleEdit.body.error.current.description === "Maya's account.", staleEdit.body);
  check("nothing was overwritten", (await dCase()).description === "Maya's account.");
  check("a different field saves alongside", (await call(J, "PATCH", `/api/cases/${d}`, { title: `Shared draft ${run} b`, base: { title: `Shared draft ${run}` } })).status === 200 && (await dCase()).description === "Maya's account.");
  check("starting from the current text saves", (await call(J, "PATCH", `/api/cases/${d}`, { description: "Both accounts.", base: { description: "Maya's account." } })).status === 200);
  check("an empty title is refused", (await call(M, "PATCH", `/api/cases/${d}`, { title: "  ", base: { title: `Shared draft ${run} b` } })).status === 400);
  const v1 = await call(J, "GET", `/api/cases/${d}?only=version`);
  check("the change check returns only a time and a status", v1.status === 200 && JSON.stringify(Object.keys(v1.body).sort()) === '["status","updatedAt"]', v1.body);

  check("Jules adds his own item", (await call(J, "POST", `/api/cases/${d}/evidence`, { evidenceIds: [julesEv] })).status === 201);
  check("a collaborator cannot remove someone else", (await call(J, "DELETE", `/api/cases/${d}/collaborators/${alexId}`)).status === 403);
  check("the owner cannot be removed", (await call(M, "DELETE", `/api/cases/${d}/collaborators/${mayaId}`)).status === 403 && (await call(J, "DELETE", `/api/cases/${d}/collaborators/${mayaId}`)).status === 403);
  const leave = await call(A, "DELETE", `/api/cases/${d}/collaborators/me`);
  check("a collaborator can leave", leave.status === 200 && leave.body.left === true, leave.body);
  check("after leaving, the case is gone for them", (await call(A, "GET", `/api/cases/${d}`)).status === 404 && (await call(A, "GET", `/api/cases/${d}?only=version`)).status === 404);
  check("the owner is told", (await call(M, "GET", "/api/notifications")).body.items.some((n: { title: string }) => n.title === "Alex Smoke left your case"));
  const removed = await call(M, "DELETE", `/api/cases/${d}/collaborators/${julesId}`);
  check("the owner removes a collaborator, and their evidence leaves the case", removed.status === 200 && removed.body.evidenceRemoved === 1 && !(await dEvidence()).includes(julesEv), removed.body);
  check("the removed person can no longer open the case or Maya's evidence in it", (await call(J, "GET", `/api/cases/${d}`)).status === 404 && (await call(J, "GET", `/api/evidence/${m1}`)).status === 404);
  check("their evidence is still in their vault, and they are told", (await call(J, "GET", `/api/evidence/${julesEv}`)).status === 200 && (await call(J, "GET", "/api/notifications")).body.items.some((n: { title: string }) => n.title === "Maya Smoke removed you from a case"));
  check("removing someone who is not on the case -> 404", (await call(M, "DELETE", `/api/cases/${d}/collaborators/${julesId}`)).status === 404);
  check("nobody can be removed after escalation", (await call(M, "DELETE", `/api/cases/${caseId}/collaborators/${julesId}`)).status === 409 && (await call(J, "DELETE", `/api/cases/${caseId}/collaborators/me`)).status === 409);

  check("a stranger cannot delete the draft", (await call(J, "DELETE", `/api/cases/${d}`)).status === 404);
  await call(M, "POST", `/api/cases/${d}/collaborators`, { email: `jules.${run}@${DOMAIN}`, acknowledge: true });
  check("a collaborator cannot delete the draft", (await call(J, "DELETE", `/api/cases/${d}`)).status === 403);
  check("an escalated case cannot be deleted", (await call(M, "DELETE", `/api/cases/${caseId}`)).status === 409 && (await call(R, "DELETE", `/api/cases/${caseId}`)).status === 404);
  check("the owner deletes the draft", (await call(M, "DELETE", `/api/cases/${d}`)).status === 200 && (await call(M, "GET", `/api/cases/${d}`)).status === 404);
  const afterDelete = await call(M, "GET", `/api/evidence/${m1}/cases`);
  check("its evidence is still in the vault and no longer in a case", (await call(M, "GET", `/api/evidence/${m1}/file`)).status === 200 && afterDelete.body.attached.length === 0, afterDelete.body);
  check("the collaborator is told the case was deleted", (await call(J, "GET", "/api/notifications")).body.items.some((n: { title: string }) => n.title === "Maya Smoke deleted a case you were on"));

  step("13. An administrator creates reviewer accounts");
  const adminEmail = `admin.${run}@safetrail.test`;
  await ensureUser({ email: adminEmail, name: "Admin Smoke", password: PASSWORD, role: "admin" });
  const AD = (await signIn(adminEmail, PASSWORD))!;
  const newReviewer = `new.reviewer.${run}@safetrail.test`;
  const made = await call(AD, "POST", "/api/admin/reviewers", { name: "New Reviewer", email: newReviewer.toUpperCase(), office: "Office of Student Affairs" });
  check("the administrator creates a reviewer and gets a one-time setup link, never a password", made.status === 201 && made.body.email === newReviewer && /\/setup\/[A-Za-z0-9_-]{40,}$/.test(made.body.setupUrl) && !("password" in made.body), made.body);
  const setupToken = String(made.body.setupUrl).split("/setup/")[1];
  type AdminRow = { id: string; email: string; status: string; office: string | null; lastSignInAt: string | null };
  const reviewerRow = async () => ((await call(AD, "GET", `/api/admin/reviewers?q=${encodeURIComponent("new reviewer")}`)).body.items as AdminRow[]).find((r) => r.email === newReviewer)!;
  check("the account is listed as pending setup, with its office and no sign-in yet", (await reviewerRow()).status === "pending" && (await reviewerRow()).office === "Office of Student Affairs" && (await reviewerRow()).lastSignInAt === null, await reviewerRow());
  check("nobody can sign in to it before setup", !(await signIn(newReviewer, "temporary-pass-1")));
  check("a wrong setup link is refused, and a short password too", (await call(null, "POST", `/api/setup/${"x".repeat(43)}`, { password: "long-enough-pass" })).status === 404 && (await call(null, "POST", `/api/setup/${setupToken}`, { password: "short" })).status === 400);
  const firstLink = setupToken;
  const reviewerId = (await reviewerRow()).id;
  const again = await call(AD, "POST", `/api/admin/reviewers/${reviewerId}/setup-link`, {});
  const secondToken = String(again.body.setupUrl).split("/setup/")[1];
  check("a new setup link replaces the old one", again.status === 201 && secondToken !== firstLink && (await call(null, "POST", `/api/setup/${firstLink}`, { password: "chosen-by-reviewer-1" })).status === 404);
  check("the reviewer sets their own password with the link", (await call(null, "POST", `/api/setup/${secondToken}`, { password: "chosen-by-reviewer-1" })).status === 200);
  check("the link works only once", (await call(null, "POST", `/api/setup/${secondToken}`, { password: "another-password-2" })).status === 404);
  const NR = await signIn(newReviewer, "chosen-by-reviewer-1");
  check("the new reviewer signs in and reaches the Review Board", Boolean(NR) && (await call(NR!, "GET", "/api/review/cases")).status === 200);
  check("the list now shows them as active, with a last sign-in", (await reviewerRow()).status === "active" && Boolean((await reviewerRow()).lastSignInAt), await reviewerRow());
  check("no new setup link once the password is set", (await call(AD, "POST", `/api/admin/reviewers/${reviewerId}/setup-link`, {})).status === 409);

  check("deactivating signs the reviewer out and blocks signing in", (await call(AD, "PATCH", `/api/admin/reviewers/${reviewerId}`, { active: false })).status === 200 && (await call(NR!, "GET", "/api/review/cases")).status === 401 && !(await signIn(newReviewer, "chosen-by-reviewer-1")) && (await reviewerRow()).status === "deactivated");
  const reactivated = await call(AD, "PATCH", `/api/admin/reviewers/${reviewerId}`, { active: true });
  const NR2 = await signIn(newReviewer, "chosen-by-reviewer-1");
  check("reactivating lets them sign in again", reactivated.status === 200 && Boolean(NR2) && (await reviewerRow()).status === "active");
  const mayaUserId = (await call(M, "GET", `/api/cases/${caseId}`)).body.owner.id as string;
  check("only reviewer accounts can be deactivated: a student is not found", (await call(AD, "PATCH", `/api/admin/reviewers/${mayaUserId}`, { active: false })).status === 404 && (await call(M, "GET", "/api/evidence")).status === 200);

  const student = await call(AD, "POST", "/api/admin/reviewers", { name: "Maya", email: `maya.${run}@${DOMAIN}` });
  check("a student's email is refused, and the student stays a student", student.status === 409 && student.body.error.message === "That email already belongs to a student account." && (await call(M, "GET", "/api/review/cases")).status === 403, student.body);
  check("an email that is already a reviewer is refused", (await call(AD, "POST", "/api/admin/reviewers", { name: "Again", email: newReviewer })).status === 409);
  check("a bad email or an unknown office is a 400", (await call(AD, "POST", "/api/admin/reviewers", { name: "X", email: "not-an-email" })).status === 400 && (await call(AD, "POST", "/api/admin/reviewers", { name: "X", email: `x.${run}@safetrail.test`, office: "Somewhere else" })).status === 400);
  const body = { name: "Nope", email: `nope.${run}@safetrail.test` };
  check("students, reviewers and signed-out callers cannot create, list, deactivate or relink reviewers", (await call(M, "POST", "/api/admin/reviewers", body)).status === 403 && (await call(R, "POST", "/api/admin/reviewers", body)).status === 403 && (await call(null, "POST", "/api/admin/reviewers", body)).status === 401 && (await call(R, "GET", "/api/admin/reviewers")).status === 403 && (await call(R, "PATCH", `/api/admin/reviewers/${reviewerId}`, { active: false })).status === 403 && (await call(M, "POST", `/api/admin/reviewers/${reviewerId}/setup-link`, {})).status === 403);

  step("14. An administrator reviews cases and assigns reviewers");
  const assignBytes = tag(chat);
  const assignEv = (await call(M, "POST", "/api/evidence", uploadForm(assignBytes, sha256Hex(assignBytes), "facebook_message"))).body.id as string;
  const open2 = (await call(M, "POST", "/api/cases", { title: `Assignment case ${run}`, description: "For the assignment checks." })).body.id as string;
  await call(M, "POST", `/api/cases/${open2}/evidence`, { evidenceId: assignEv });
  const adminDraft = (await call(M, "POST", "/api/cases", { title: `Admin draft ${run}` })).body.id as string;
  check("an administrator cannot see a draft, or open a case as its student would (I1)", (await call(AD, "GET", `/api/review/cases/${open2}`)).status === 404 && (await call(AD, "GET", `/api/evidence/${assignEv}`)).status === 404 && (await call(AD, "GET", `/api/review/cases/${adminDraft}`)).status === 404 && (await call(AD, "GET", `/api/cases/${adminDraft}`)).status === 404 && (await call(AD, "PATCH", `/api/cases/${adminDraft}`, { title: "x" })).status === 404);
  check("nobody is assigned to a draft", (await call(AD, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId })).status === 404);
  const pv = await call(M, "GET", `/api/cases/${open2}/escalation-preview`);
  check("Maya escalates the second case", (await call(M, "POST", `/api/cases/${open2}/escalate`, { digest: pv.body.digest, confirm: true })).status === 200);
  type Assigned = { id: string; assignees: { id: string; name: string }[] };
  const adminBoard = await call(AD, "GET", `/api/review/cases?q=${encodeURIComponent(run)}`);
  const adminCase = await call(AD, "GET", `/api/review/cases/${open2}`);
  check("an administrator sees the board, the case and its evidence, like a reviewer", adminBoard.status === 200 && (adminBoard.body.items as Assigned[]).some((c) => c.id === open2 && c.assignees.length === 0) && adminCase.status === 200 && adminCase.body.assignees.length === 0 && (await call(AD, "GET", `/api/evidence/${assignEv}`)).status === 200 && (await call(AD, "GET", "/api/review/summary")).status === 200 && (await call(AD, "GET", "/api/review/archives")).status === 200);
  check("an administrator still cannot change the student's evidence", (await call(AD, "PATCH", `/api/evidence/${assignEv}`, { label: "x" })).status === 403);
  check("the administrator is told about the escalation", ((await call(AD, "GET", "/api/notifications")).body.items as { type: string; caseId: string }[]).some((n) => n.type === "case_escalated" && n.caseId === open2));

  check("reviewers, students and signed-out callers cannot assign", (await call(R, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId })).status === 403 && (await call(NR2!, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId })).status === 403 && (await call(M, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId })).status === 403 && (await call(null, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId })).status === 401);
  const assigned = await call(AD, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId });
  check("the administrator assigns a reviewer", assigned.status === 201 && assigned.body.reviewer.id === reviewerId, assigned.body);
  check("assigning the same reviewer twice is a 409", (await call(AD, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId })).status === 409);
  check("only reviewer accounts can be assigned", (await call(AD, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId: mayaUserId })).status === 404 && (await call(AD, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId: "no-such-user" })).status === 404 && (await call(AD, "POST", `/api/review/cases/${open2}/assignees`, {})).status === 400);
  const rows = async (token: string, query: string) => ((await call(token, "GET", `/api/review/cases?${query}`)).body.items ?? []) as Assigned[];
  check("the board names who is assigned", (await rows(R, `q=${encodeURIComponent(run)}`)).some((c) => c.id === open2 && c.assignees.length === 1 && c.assignees[0].name === "New Reviewer"));
  check("Assigned to me lists it for that reviewer only; Unassigned leaves it out", (await rows(NR2!, "mine=1")).some((c) => c.id === open2) && !(await rows(R, "mine=1")).some((c) => c.id === open2) && !(await rows(R, "unassigned=1")).some((c) => c.id === open2) && (await rows(R, "unassigned=1")).every((c) => c.assignees.length === 0));
  check("the assigned reviewer is notified", ((await call(NR2!, "GET", "/api/notifications")).body.items as { type: string; caseId: string }[]).some((n) => n.type === "case_assigned" && n.caseId === open2));
  check("assigning does not restrict: another reviewer still opens the case and starts the review", (await call(R, "GET", `/api/review/cases/${open2}`)).status === 200 && (await call(R, "POST", `/api/review/cases/${open2}/status`, { status: "under_review" })).status === 200);
  const studentView = await call(M, "GET", `/api/cases/${open2}`);
  check("the student never learns who was assigned", studentView.status === 200 && !JSON.stringify(studentView.body).includes("New Reviewer") && !(studentView.body.events as { type: string }[]).some((e) => e.type === "assigned" || e.type === "unassigned") && !("assignees" in studentView.body), studentView.body.events);
  check("only an administrator takes a reviewer off", (await call(R, "DELETE", `/api/review/cases/${open2}/assignees/${reviewerId}`)).status === 403 && (await call(AD, "DELETE", `/api/review/cases/${open2}/assignees/${reviewerId}`)).status === 200 && (await call(AD, "DELETE", `/api/review/cases/${open2}/assignees/${reviewerId}`)).status === 404);
  const history = ((await call(AD, "GET", `/api/review/cases/${open2}`)).body.events as { type: string; note: string | null }[]).filter((e) => e.type === "assigned" || e.type === "unassigned");
  check("the case history records both, with the reviewer's name", history.map((e) => e.type).join() === "assigned,unassigned" && history.every((e) => e.note === "New Reviewer"), history);
  check("the reviewer is told they were taken off", ((await call(NR2!, "GET", "/api/notifications")).body.items as { type: string; caseId: string }[]).some((n) => n.type === "case_unassigned" && n.caseId === open2));
  await call(AD, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId });
  await call(AD, "PATCH", `/api/admin/reviewers/${reviewerId}`, { active: false });
  check("deactivating a reviewer takes them off open cases, and they can't be assigned", (await call(AD, "GET", `/api/review/cases/${open2}`)).body.assignees.length === 0 && (await call(AD, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId })).status === 400);
  await call(AD, "PATCH", `/api/admin/reviewers/${reviewerId}`, { active: true });
  check("an administrator closes the case; a closed case's reviewers can't be changed", (await call(AD, "POST", `/api/review/cases/${open2}/close`, { note: "Closed by the administrator in the smoke run." })).status === 200 && (await call(AD, "POST", `/api/review/cases/${open2}/assignees`, { reviewerId })).status === 409);
  await call(M, "DELETE", `/api/cases/${adminDraft}`);
  step("15. Flagged words");
  type Word = { id: string; word: string; cases: number };
  const bankList = async () => (await call(AD, "GET", "/api/admin/word-bank")).body.items as Word[];
  const startBank = await bankList();
  check("the word bank starts with a list, in English and Filipino", startBank.length >= 20 && startBank.some((w) => w.word === "suicide") && startBank.some((w) => w.word === "magpakamatay"));
  check("only administrators can see or change the word bank", (await call(R, "GET", "/api/admin/word-bank")).status === 403 && (await call(M, "POST", "/api/admin/word-bank", { word: "zzz" })).status === 403 && (await call(null, "GET", "/api/admin/word-bank")).status === 401);
  const flagBytes = tag(chat);
  const flagEv = (await call(M, "POST", "/api/evidence", uploadForm(flagBytes, sha256Hex(flagBytes), "facebook_message"))).body.id as string;
  const flagCase = (await call(M, "POST", "/api/cases", { title: `Group chat ${run}`, description: `They kept threatening me in the groupchat${run} and said I should kill   myself.` })).body.id as string;
  await call(M, "POST", `/api/cases/${flagCase}/evidence`, { evidenceId: flagEv });
  type Flagged = { id: string; flaggedWords: string[] };
  const rowOf = async (id: string, query = `q=${encodeURIComponent(run)}`) => ((await call(R, "GET", `/api/review/cases?${query}`)).body.items as Flagged[]).find((c) => c.id === id);
  check("a draft is not flagged before escalation", !(await call(M, "GET", `/api/cases/${flagCase}`)).body.flaggedWords);
  const fpv = await call(M, "GET", `/api/cases/${flagCase}/escalation-preview`);
  await call(M, "POST", `/api/cases/${flagCase}/escalate`, { digest: fpv.body.digest, confirm: true });
  const flaggedRow = await rowOf(flagCase);
  check("escalation flags the words the title and description contain", JSON.stringify(flaggedRow?.flaggedWords) === JSON.stringify(["kill myself", "threaten"]), flaggedRow);
  check("Has flagged words keeps flagged cases and drops the rest", Boolean(await rowOf(flagCase, `q=${encodeURIComponent(run)}&flagged=1`)) && ((await call(R, "GET", "/api/review/cases?flagged=1")).body.items as Flagged[]).every((c) => c.flaggedWords.length > 0));
  check("the reviewer's case page has the same words", JSON.stringify((await call(R, "GET", `/api/review/cases/${flagCase}`)).body.flaggedWords) === JSON.stringify(["kill myself", "threaten"]));
  const studentFlagView = await call(M, "GET", `/api/cases/${flagCase}`);
  check("the student never sees the flags", studentFlagView.status === 200 && !("flaggedWords" in studentFlagView.body) && !JSON.stringify(studentFlagView.body).includes("kill myself\""));
  const added = await call(AD, "POST", "/api/admin/word-bank", { word: `  GroupChat${run} ` });
  check("adding a word stores it normalized and checks escalated cases again", added.status === 201 && added.body.word === `groupchat${run}` && (await rowOf(flagCase))?.flaggedWords.includes(`groupchat${run}`) === true, added.body);
  check("a word already in the bank, or too short, is refused", (await call(AD, "POST", "/api/admin/word-bank", { word: `GROUPCHAT${run}` })).status === 409 && (await call(AD, "POST", "/api/admin/word-bank", { word: "x" })).status === 400);
  check("the bank counts how many cases each word flags", (await bankList()).find((w) => w.word === `groupchat${run}`)?.cases === 1);
  check("removing a word removes its flags", (await call(AD, "DELETE", `/api/admin/word-bank/${added.body.id}`)).status === 200 && !(await rowOf(flagCase))?.flaggedWords.includes(`groupchat${run}`) && (await call(AD, "DELETE", `/api/admin/word-bank/${added.body.id}`)).status === 404);

  const gateStillOn = await signUp("Outsider Two", `outsider2.${run}@gmail.com`);
  check("the public sign-up gate is unaffected", gateStillOn.res.status >= 400 && !gateStillOn.token);

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) failures.forEach((f) => console.log(`  - ${f}`));
  await pg.end();
  process.exit(failures.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await pg.end().catch(() => {});
  process.exit(1);
});
