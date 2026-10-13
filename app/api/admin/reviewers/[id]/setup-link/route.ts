import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { resendSetupLink } from "@/server/services/admin";

/** A new one-time setup link for a reviewer who hasn't set a password yet. */
export const POST = handle<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser({ roles: ["admin"] });
  return json(await resendSetupLink(user, id.slice(0, 64)), 201);
});
