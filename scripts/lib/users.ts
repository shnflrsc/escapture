import { eq } from "drizzle-orm";
import { auth, signupGate, type Role } from "@/server/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

/**
 * Creates an account through Better Auth's server API (so the password is
 * hashed properly), bypassing the email-domain gate, then sets the role.
 * Idempotent: an existing account just gets the role applied.
 */
export async function ensureUser(input: { email: string; name: string; password: string; role: Role }) {
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  let id = existing?.id;
  if (!id) {
    signupGate.bypass = true;
    try {
      const res = await auth.api.signUpEmail({
        body: { email, name: input.name, password: input.password },
      });
      id = res.user.id;
    } finally {
      signupGate.bypass = false;
    }
  }
  await db.update(user).set({ role: input.role }).where(eq(user.id, id));
  return { id, email, name: input.name, role: input.role, created: !existing };
}
