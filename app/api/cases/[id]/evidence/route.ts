import { attachEvidence as attachSchema, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { attachEvidence } from "@/server/services/cases";

export const POST = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const input = attachSchema.parse(await req.json());
  const one = "evidenceId" in input;
  const result = await attachEvidence(user, uuid.parse(id), one ? [input.evidenceId] : input.evidenceIds);
  return json(one ? { caseId: result.caseId, evidenceId: input.evidenceId } : result, 201);
});
