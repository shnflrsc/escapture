import { and, desc, eq, ilike, max, or, sql } from "drizzle-orm";
import { auth, signupBypass, type Actor, type Role } from "../auth";
import { canProvisionReviewer, enforce } from "../authz";
import { db } from "../db";
import { session, user } from "../db/schema";
import { conflict } from "../errors";

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

/**
 * An administrator creates a reviewer account with a temporary password. An
 * address that already has an account is refused: this never turns a student
 * (or anyone else) into a reviewer.
 */
export async function createReviewer(actor: Actor, input: { name: string; email: string; password: string }) {
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
  const created = await ensureUser({ email, name: input.name.trim(), password: input.password, role: "reviewer" });
  return { id: created.id, name: created.name, email: created.email };
}

/** Reviewer accounts, newest first, each with the time of its last sign-in. */
export async function listReviewers(actor: Actor, q?: string) {
  enforce(canProvisionReviewer(actor));
  const term = q?.trim();
  const like = term ? `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%` : null;
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      lastSignInAt: max(session.createdAt),
    })
    .from(user)
    .leftJoin(session, eq(session.userId, user.id))
    .where(and(eq(user.role, "reviewer"), like ? or(ilike(user.name, like), ilike(user.email, like)) : undefined))
    .groupBy(user.id)
    .orderBy(desc(user.createdAt), sql`lower(${user.name})`);
}
