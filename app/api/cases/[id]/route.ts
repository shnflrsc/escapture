import { updateCase as updateSchema, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { caseVersion, deleteCase, getCase, updateCase } from "@/server/services/cases";

type P = { id: string };

export const GET = handle<P>(async (req, { id }) => {
  const user = await requireUser();
  // An open draft asks this every few seconds; it only needs to know whether to reload.
  if (new URL(req.url).searchParams.get("only") === "version") return json(await caseVersion(user, uuid.parse(id)));
  return json(await getCase(user, uuid.parse(id)));
});

export const PATCH = handle<P>(async (req, { id }) => {
  const user = await requireUser();
  const input = updateSchema.parse(await req.json());
  return json(await updateCase(user, uuid.parse(id), input));
});

export const DELETE = handle<P>(async (_req, { id }) => {
  const user = await requireUser();
  await deleteCase(user, uuid.parse(id));
  return json({ deleted: true });
});
