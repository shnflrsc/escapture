// public-route: returns only { valid, resourceType }. No titles or counts
// before the password.
import { handle, json } from "@/server/http";
import { linkMeta } from "@/server/services/links";

export const GET = handle<{ token: string }>(async (_req, { token }) => {
  return json(await linkMeta(token));
});
