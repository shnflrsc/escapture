import { uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { verifyEvidence } from "@/server/services/evidence";

export const GET = handle<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  return json(await verifyEvidence(user, uuid.parse(id)));
});
