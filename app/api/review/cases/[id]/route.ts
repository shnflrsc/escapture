import { uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { STAFF } from "@/server/authz";
import { handle, json } from "@/server/http";
import { getReviewCase } from "@/server/services/review";

export const GET = handle<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser({ roles: STAFF });
  return json(await getReviewCase(user, uuid.parse(id)));
});
