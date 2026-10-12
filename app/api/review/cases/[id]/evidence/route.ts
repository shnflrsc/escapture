import { attachOneEvidence as attachSchema, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { attachReviewerEvidence } from "@/server/services/review";

export const POST = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser({ roles: ["reviewer"] });
  const { evidenceId } = attachSchema.parse(await req.json());
  return json(await attachReviewerEvidence(user, uuid.parse(id), evidenceId), 201);
});
