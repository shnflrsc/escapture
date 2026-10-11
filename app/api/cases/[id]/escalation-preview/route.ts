import { uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { escalationPreview } from "@/server/services/cases";

export const GET = handle<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  return json(await escalationPreview(user, uuid.parse(id)));
});
