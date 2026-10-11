import { escalate as escalateSchema, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { escalate } from "@/server/services/cases";

export const POST = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const { digest } = escalateSchema.parse(await req.json());
  return json(await escalate(user, uuid.parse(id), digest));
});
