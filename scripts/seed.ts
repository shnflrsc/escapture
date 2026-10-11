// pnpm db:seed — idempotent demo data (INSTRUCTIONS.md section 12).
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { sha256Hex } from "@/lib/hash";
import type { Actor } from "@/server/auth";
import { db, pg } from "@/server/db";
import { cases, evidence } from "@/server/db/schema";
import { addCollaborator, attachEvidence, createCase, escalate, escalationPreview } from "@/server/services/cases";
import { createEvidence } from "@/server/services/evidence";
import { ensureBucket, storageDriver } from "@/server/storage";
import { ensureUser } from "./lib/users";

const PASSWORD = process.env.SEED_PASSWORD ?? "SafeTrail-demo-2026";
const DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "bulsu.edu.ph";

const report = {
  checks: [
    { id: "design-mode", passed: true },
    { id: "contenteditable", passed: true },
    { id: "userscript-markers", passed: true },
    { id: "injected-elements", passed: true },
  ],
  allPassed: true,
  extensionVersion: "seed",
};

async function capture(actor: Actor, fixture: string, kind: "facebook_post" | "facebook_message", sourceUrl: string) {
  // Same code path as a real upload: real bytes, real SHA-256, same storage.
  const bytes = new Uint8Array(await readFile(`fixtures/${fixture}`));
  return createEvidence(actor, {
    bytes,
    sha256: sha256Hex(bytes),
    kind,
    sourceUrl,
    clientCapturedAt: new Date().toISOString(),
    tamperReport: report,
    extensionVersion: "seed",
  });
}

async function main() {
  await ensureBucket();
  console.log(`Storage: ${storageDriver()}`);

  const accounts = {
    admin: await ensureUser({ email: "admin@safetrail.test", name: "Demo Admin", password: PASSWORD, role: "admin" }),
    reviewer1: await ensureUser({ email: "reviewer1@safetrail.test", name: "Reviewer One", password: PASSWORD, role: "reviewer" }),
    reviewer2: await ensureUser({ email: "reviewer2@safetrail.test", name: "Reviewer Two", password: PASSWORD, role: "reviewer" }),
    maya: await ensureUser({ email: `maya.demo@${DOMAIN}`, name: "Maya Santos", password: PASSWORD, role: "student" }),
    jules: await ensureUser({ email: `jules.demo@${DOMAIN}`, name: "Jules Reyes", password: PASSWORD, role: "student" }),
    alex: await ensureUser({ email: `alex.demo@${DOMAIN}`, name: "Alex Cruz", password: PASSWORD, role: "student" }),
  };
  const maya: Actor = accounts.maya;
  const jules: Actor = accounts.jules;
  const alex: Actor = accounts.alex;

  const [existing] = await db.select({ id: evidence.id }).from(evidence).where(eq(evidence.ownerId, maya.id)).limit(1);
  const [existingCase] = await db.select({ id: cases.id }).from(cases).where(eq(cases.ownerId, maya.id)).limit(1);
  if (existing || existingCase) {
    console.log("Demo evidence and cases already exist. Skipping them.");
  } else {
    const post = await capture(maya, "fake-facebook-post.html", "facebook_post", "https://www.facebook.com/sample.classmate/posts/1000001");
    const chat = await capture(maya, "fake-messenger.html", "facebook_message", "https://www.messenger.com/t/1000002");
    const julesChat = await capture(jules, "fake-messenger.html", "facebook_message", "https://www.messenger.com/t/1000003");
    await capture(alex, "fake-facebook-post.html", "facebook_post", "https://www.facebook.com/sample.classmate/posts/1000004");

    // One escalated case: Maya owns it, Jules is a collaborator.
    const escalated = await createCase(maya, {
      title: "Posts and messages about the group project",
      description:
        "A classmate posted about me after our quiz and then messaged me about the group project. Jules was in the same group and saw the messages too.",
    });
    await attachEvidence(maya, escalated.id, post.id);
    await addCollaborator(maya, escalated.id, jules.email);
    await attachEvidence(jules, escalated.id, julesChat.id);
    const preview = await escalationPreview(maya, escalated.id);
    await escalate(maya, escalated.id, preview.digest);

    // One private draft.
    const draft = await createCase(maya, {
      title: "Messages from last night",
      description: "Still deciding whether to report this.",
    });
    await attachEvidence(maya, draft.id, chat.id);
    console.log("Created demo evidence, one escalated case and one draft.");
  }

  console.log("\nDemo accounts (password for all: " + PASSWORD + ")");
  for (const a of Object.values(accounts)) console.log(`  ${a.role.padEnd(8)} ${a.email}`);
  await pg.end();
}

main().catch(async (e) => {
  console.error(e);
  await pg.end().catch(() => {});
  process.exit(1);
});
