import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { bearer } from "better-auth/plugins";
import { headers } from "next/headers";
import { isAllowedSignupEmail } from "@/lib/email-gate";
import { db, schema } from "./db";
import { forbidden, unauthorized } from "./errors";

export type Role = "student" | "reviewer" | "admin";
export type Actor = { id: string; email: string; name: string; role: Role };

// Set only by scripts/lib/users.ts so the CLI can create reviewer/admin
// accounts. Never reachable from a request.
export const signupGate = { bypass: false };

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
    user: {
      create: {
        before: async (newUser) => {
          if (signupGate.bypass) return { data: newUser };
          const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "bulsu.edu.ph";
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
  role === "reviewer" ? "/review" : role === "admin" ? "/notifications" : "/vault";
