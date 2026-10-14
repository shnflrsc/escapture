import { uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { unassignReviewer } from "@/server/services/review";

export const DELETE = handle<{ id: string; userId: string }>(async (_req, { id, userId }) => {
  const user = await requireUser({ roles: ["reviewer", "admin"] });
  return json(await unassignReviewer(user, uuid.parse(id), userId.slice(0, 64)));
});
