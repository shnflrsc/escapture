// public-route: the one-time link itself is the credential, as with password links.
import { completeSetup as schema } from "@/lib/validators";
import { handle, json } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { completeSetup } from "@/server/services/admin";

/** A new reviewer sets their password with the setup link their administrator gave them. */
export const POST = handle<{ token: string }>(async (req, { token }) => {
  // Slows guessing at tokens; a real token is 32 random bytes.
  rateLimit(`setup:${req.headers.get("x-forwarded-for") ?? "local"}`, 30, 10 * 60 * 1000);
  const { password } = schema.parse(await req.json());
  return json(await completeSetup(token, password));
});
