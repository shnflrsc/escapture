import { uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { badRequest } from "@/server/errors";
import { handle, json } from "@/server/http";
import { revokeEvidenceShare } from "@/server/services/shares";

export const DELETE = handle<{ id: string; userId: string }>(async (_req, { id, userId }) => {
  const user = await requireUser();
  // User ids are not uuids; anything unreasonable is refused before it reaches a query.
  if (userId.length > 64) throw badRequest("That id isn't valid.");
  return json(await revokeEvidenceShare(user, uuid.parse(id), userId));
});
