import { attachEvidence as attachSchema, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { attachEvidence } from "@/server/services/cases";

export const POST = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const { evidenceId } = attachSchema.parse(await req.json());
  return json(await attachEvidence(user, uuid.parse(id), evidenceId), 201);
});
