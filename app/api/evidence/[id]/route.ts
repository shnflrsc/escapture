import { renameEvidence as renameSchema, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { deleteEvidence, getEvidence, renameEvidence } from "@/server/services/evidence";

type P = { id: string };

export const GET = handle<P>(async (_req, { id }) => {
  const user = await requireUser();
  return json(await getEvidence(user, uuid.parse(id)));
});

export const PATCH = handle<P>(async (req, { id }) => {
  const user = await requireUser();
  const { label } = renameSchema.parse(await req.json());
  return json(await renameEvidence(user, uuid.parse(id), label));
});

export const DELETE = handle<P>(async (_req, { id }) => {
  const user = await requireUser();
  await deleteEvidence(user, uuid.parse(id));
  return json({ ok: true });
});
