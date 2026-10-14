import { uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { revokeCaseLink } from "@/server/services/links";

export const DELETE = handle<{ id: string; linkId: string }>(async (_req, { id, linkId }) => {
  const user = await requireUser();
  return json(await revokeCaseLink(user, uuid.parse(id), uuid.parse(linkId)));
});
