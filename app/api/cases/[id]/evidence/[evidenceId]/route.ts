import { uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { detachEvidence } from "@/server/services/cases";

export const DELETE = handle<{ id: string; evidenceId: string }>(async (_req, { id, evidenceId }) => {
  const user = await requireUser();
  await detachEvidence(user, uuid.parse(id), uuid.parse(evidenceId));
  return json({ ok: true });
});
