// End-to-end API walkthrough (INSTRUCTIONS.md section 15). Runs against a
// running dev server and asserts the product invariants. Uses fresh accounts
// on every run, so it is safe to repeat.
//   pnpm dev   (in one terminal)
//   pnpm smoke
import { readFile } from "node:fs/promises";
import { sha256Hex } from "@/lib/hash";
import { pg } from "@/server/db";
import { ensureUser } from "./lib/users";

const BASE = process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "bulsu.edu.ph";
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
  console.log(`SafeTrail smoke test against ${BASE} (run ${run})`);
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
  check("add collaborator -> 409", (await call(M, "POST", `/api/cases/${caseId}/collaborators`, { email: `alex.${run}@${DOMAIN}`, acknowledge: true })).status === 409);
  check("escalate again -> 409", (await call(M, "POST", `/api/cases/${caseId}/escalate`, { digest: preview2.body.digest, confirm: true })).status === 409);
  check("unattached evidence can still be deleted", (await call(M, "DELETE", `/api/evidence/${mayaEv2}`)).status === 200);

  step("7. Review Board");
  const board = await call(R, "GET", "/api/review/cases?status=escalated");
  check("a reviewer sees the case on the board", board.body.items?.some((c: { id: string }) => c.id === caseId));
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

  step("11. Drafts stay private (I1)");
  const draft2 = await call(M, "POST", "/api/cases", { title: `Private draft ${run}`, description: "" });
  check("a reviewer cannot see a draft case", (await call(R, "GET", `/api/review/cases/${draft2.body.id}`)).status === 404);
  check("escalating with no evidence is refused", await (async () => {
    const p = await call(M, "GET", `/api/cases/${draft2.body.id}/escalation-preview`);
    return (await call(M, "POST", `/api/cases/${draft2.body.id}/escalate`, { digest: p.body.digest, confirm: true })).status === 400;
  })());

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
