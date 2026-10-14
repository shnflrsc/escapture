import { requireUser } from "@/server/auth";
import { STAFF } from "@/server/authz";
import { handle, json } from "@/server/http";
import { boardSummary } from "@/server/services/review";

/** The Review Board's four counts. */
export const GET = handle(async () => {
  const user = await requireUser({ roles: STAFF });
  return json(await boardSummary(user));
});
