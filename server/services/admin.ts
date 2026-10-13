import { and, desc, eq, ilike, like, max, or, sql } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";
import { randomToken, sha256Hex } from "@/lib/hash";
import { auth, signupBypass, type Actor, type Role } from "../auth";
import { canProvisionReviewer, enforce } from "../authz";
import { db } from "../db";
import { session, user, verification } from "../db/schema";
import { AppError, badRequest, conflict, notFound } from "../errors";

export const SETUP_LINK_DAYS = 7;
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
// A reviewer's pending setup link lives in Better Auth's verification table under this name.
const setupKey = (userId: string) => `reviewer-setup:${userId}`;

/**
 * Creates an account through Better Auth's server API (so the password is
 * hashed properly), bypassing the email-domain gate, then sets the role.
 * Idempotent: an existing account just gets the role applied. Used by the
 * scripts; requests go through createReviewer, which never changes a role.
 */
export async function ensureUser(input: { email: string; name: string; password: string; role: Role }) {
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  let id = existing?.id;
  if (!id) {
    // Only this call skips the gate: another sign-up running at the same moment does not.
    const res = await signupBypass.run(true, () =>
      auth.api.signUpEmail({ body: { email, name: input.name, password: input.password } }),
    );
    id = res.user.id;
    // Signing up also signs in. Nobody asked for that session, and it would show as a first sign-in.
    await db.delete(session).where(eq(session.userId, id));
  }
  await db.update(user).set({ role: input.role }).where(eq(user.id, id));
  return { id, email, name: input.name, role: input.role, created: !existing };
}

/** A fresh one-time link for setting the password. Any earlier link for this account stops working. */
async function issueSetupLink(userId: string) {
  const token = randomToken();
  await db.delete(verification).where(eq(verification.identifier, setupKey(userId)));
  const expiresAt = new Date(Date.now() + SETUP_LINK_DAYS * 24 * 60 * 60 * 1000);
  // Only the token's hash is stored, as with password links.
  await db.insert(verification).values({ id: randomUUID(), identifier: setupKey(userId), value: sha256Hex(token), expiresAt });
  return { setupUrl: `${appUrl()}/setup/${token}`, expiresAt };
}

/**
 * An administrator creates a reviewer account and gets a one-time setup link to
 * pass on. Nobody but the reviewer ever knows the password. An address that
 * already has an account is refused: this never turns a student into a reviewer.
 */
export async function createReviewer(actor: Actor, input: { name: string; email: string; office?: string }) {
  enforce(canProvisionReviewer(actor), "Only an administrator can create reviewer accounts.");
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select({ role: user.role }).from(user).where(eq(user.email, email)).limit(1);
  if (existing) {
    throw conflict(
      existing.role === "student"
        ? "That email already belongs to a student account."
        : "There is already an account with that email.",
      "email_taken",
    );
  }
  // A password nobody is told: the setup link replaces it.
  const created = await ensureUser({
    email,
    name: input.name.trim(),
    password: randomBytes(32).toString("base64url"),
    role: "reviewer",
  });
  await db.update(user).set({ office: input.office?.trim() || null }).where(eq(user.id, created.id));
  return { id: created.id, name: created.name, email: created.email, ...(await issueSetupLink(created.id)) };
}

async function loadReviewer(userId: string) {
  const [row] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  // Students and administrators are not managed here.
  if (!row || row.role !== "reviewer") throw notFound();
  return row;
}

/** A new setup link for a reviewer who hasn't set their password yet. The old link stops working. */
export async function resendSetupLink(actor: Actor, userId: string) {
  enforce(canProvisionReviewer(actor));
  const reviewer = await loadReviewer(userId);
  if (reviewer.deactivatedAt) throw conflict("This account is deactivated. Reactivate it first.", "deactivated");
  const [pending] = await db.select().from(verification).where(eq(verification.identifier, setupKey(userId))).limit(1);
  if (!pending) throw conflict("This reviewer has already set their password.", "already_set_up");
  return issueSetupLink(userId);
}

/**
 * Deactivating signs the reviewer out everywhere and stops them signing in.
 * Cases and closing notes they wrote stay on record. Reactivating undoes it.
 */
export async function setReviewerActive(actor: Actor, userId: string, active: boolean) {
  enforce(canProvisionReviewer(actor));
  const reviewer = await loadReviewer(userId);
  await db.transaction(async (tx) => {
    await tx.update(user).set({ deactivatedAt: active ? null : (reviewer.deactivatedAt ?? new Date()) }).where(eq(user.id, userId));
    if (!active) await tx.delete(session).where(eq(session.userId, userId));
  });
  return { id: userId, active };
}

export type ReviewerStatus = "active" | "pending" | "expired" | "deactivated";

/** Reviewer accounts, newest first, each with its status and the time of its last sign-in. */
export async function listReviewers(actor: Actor, opts: { q?: string; status?: ReviewerStatus } = {}) {
  enforce(canProvisionReviewer(actor));
  const term = opts.q?.trim();
  const pattern = term ? `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%` : null;
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      office: user.office,
      createdAt: user.createdAt,
      deactivatedAt: user.deactivatedAt,
      lastSignInAt: max(session.createdAt),
      setupExpiresAt: max(verification.expiresAt),
    })
    .from(user)
    .leftJoin(session, eq(session.userId, user.id))
    .leftJoin(verification, eq(verification.identifier, sql`'reviewer-setup:' || ${user.id}`))
    .where(
      and(
        eq(user.role, "reviewer"),
        pattern ? or(ilike(user.name, pattern), ilike(user.email, pattern), ilike(user.office, pattern)) : undefined,
      ),
    )
    .groupBy(user.id)
    .orderBy(desc(user.createdAt), sql`lower(${user.name})`);
  const now = Date.now();
  const all = rows.map((r) => {
    const status: ReviewerStatus = r.deactivatedAt
      ? "deactivated"
      : r.setupExpiresAt
        ? new Date(r.setupExpiresAt).getTime() > now
          ? "pending"
          : "expired"
        : "active";
    return { ...r, status };
  });
  return opts.status ? all.filter((r) => r.status === opts.status) : all;
}

async function findSetup(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const [row] = await db
    .select({ id: verification.id, identifier: verification.identifier, expiresAt: verification.expiresAt })
    .from(verification)
    .where(and(eq(verification.value, sha256Hex(token)), like(verification.identifier, "reviewer-setup:%")))
    .limit(1);
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  const [account] = await db.select().from(user).where(eq(user.id, row.identifier.slice("reviewer-setup:".length))).limit(1);
  if (!account || account.role !== "reviewer" || account.deactivatedAt) return null;
  return { verificationId: row.id, account };
}

/** What the setup page may show for a link: whose account it is, or nothing if the link is no good. */
export async function setupInfo(token: string) {
  const found = await findSetup(token);
  return found ? { name: found.account.name, email: found.account.email } : null;
}

/** The reviewer chooses their password. The link works once. */
export async function completeSetup(token: string, password: string) {
  const found = await findSetup(token);
  if (!found) throw new AppError("link_invalid", 404, "This setup link isn't valid any more. Ask your administrator for a new one.");
  if (password.length < 8) throw badRequest("Use at least 8 characters.");
  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(found.account.id, await ctx.password.hash(password));
  await db.delete(verification).where(eq(verification.id, found.verificationId));
  // Anything signed in with the unknown first password (there shouldn't be) is signed out.
  await db.delete(session).where(eq(session.userId, found.account.id));
  return { email: found.account.email };
}
