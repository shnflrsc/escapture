import { uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { removeWord } from "@/server/services/flags";

export const DELETE = handle<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser({ roles: ["admin"] });
  return json(await removeWord(user, uuid.parse(id)));
});
