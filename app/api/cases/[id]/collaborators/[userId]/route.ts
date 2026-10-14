import { uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { badRequest } from "@/server/errors";
import { handle, json } from "@/server/http";
import { removeCollaborator } from "@/server/services/cases";

/** The owner removes a collaborator, or a collaborator leaves ("me"). */
export const DELETE = handle<{ id: string; userId: string }>(async (_req, { id, userId }) => {
  const user = await requireUser();
  // User ids are not uuids; anything unreasonable is refused before it reaches a query.
  if (userId.length > 64) throw badRequest("That id isn't valid.");
  return json(await removeCollaborator(user, uuid.parse(id), userId === "me" ? user.id : userId));
});
