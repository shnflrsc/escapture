import { updateCase as updateSchema, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { getCase, updateCase } from "@/server/services/cases";

type P = { id: string };

export const GET = handle<P>(async (_req, { id }) => {
  const user = await requireUser();
  return json(await getCase(user, uuid.parse(id)));
});

export const PATCH = handle<P>(async (req, { id }) => {
  const user = await requireUser();
  const input = updateSchema.parse(await req.json());
  return json(await updateCase(user, uuid.parse(id), input));
});
