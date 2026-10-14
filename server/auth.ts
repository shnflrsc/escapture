import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { bearer } from "better-auth/plugins";
import { AsyncLocalStorage } from "node:async_hooks";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { allowedEmailDomain } from "@/lib/email-domain";
import { isAllowedSignupEmail } from "@/lib/email-gate";
import { db, schema } from "./db";
import { forbidden, unauthorized } from "./errors";

export type Role = "student" | "reviewer" | "admin";
export type Actor = { id: string; email: string; name: string; role: Role };

// Lets server/services/admin.ts create reviewer and admin accounts past the
// email-domain gate. It applies only to the call it wraps, so a public sign-up
// that happens at the same moment is still gated. No request input can set it.
export const signupBypass = new AsyncLocalStorage<boolean>();

const appUrl =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  user: {
    additionalFields: {
      // input: false means clients can never set the role.
      role: { type: "string", required: false, defaultValue: "student", input: false },
    },
  },
  trustedOrigins: [appUrl, process.env.NEXT_PUBLIC_APP_URL, process.env.EXTENSION_ORIGIN].filter(
    (o): o is string => Boolean(o),
  ),
  rateLimit: {
    enabled: true,
    window: 60,
    max: 300,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 20 },
    },
  },
  advanced: { defaultCookieAttributes: { httpOnly: true, sameSite: "lax" } },
  databaseHooks: {
    session: {
      create: {
        // An administrator can deactivate a reviewer: no new sessions for that account.
        before: async (newSession) => {
          const [owner] = await db
            .select({ deactivatedAt: schema.user.deactivatedAt })
            .from(schema.user)
            .where(eq(schema.user.id, newSession.userId))
            .limit(1);
          if (owner?.deactivatedAt) {
            throw new APIError("FORBIDDEN", {
              code: "ACCOUNT_DEACTIVATED",
              message: "This account has been deactivated. Ask your administrator if you think this is a mistake.",
            });
          }
          return { data: newSession };
        },
      },
    },
    user: {
      create: {
        before: async (newUser) => {
          if (signupBypass.getStore()) return { data: newUser };
          const domain = allowedEmailDomain();
          if (!isAllowedSignupEmail(newUser.email, domain, process.env.DEV_ALLOWED_EMAILS)) {
            throw new APIError("FORBIDDEN", {
              code: "EMAIL_DOMAIN_NOT_ALLOWED",
              message: `Please use an email that ends in @${domain}.`,
            });
          }
          // Public sign-up always creates a student.
          return { data: { ...newUser, role: "student" } };
        },
      },
    },
  },
  plugins: [bearer()],
});

/** Session from cookie or bearer token, or null. */
export async function getUser(): Promise<Actor | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: Role };
  return { id: u.id, email: u.email, name: u.name, role: u.role ?? "student" };
}

/** Every handler and server component that touches data calls this first. */
export async function requireUser(opts?: { roles?: Role[] }): Promise<Actor> {
  const user = await getUser();
  if (!user) throw unauthorized();
  if (opts?.roles && !opts.roles.includes(user.role)) throw forbidden();
  return user;
}

export const homeFor = (role: Role) =>
  role === "reviewer" ? "/review" : role === "admin" ? "/admin/reviewers" : "/vault";
