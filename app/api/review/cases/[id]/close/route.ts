import { closeCase as closeSchema, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { STAFF } from "@/server/authz";
import { handle, json } from "@/server/http";
import { closeCase } from "@/server/services/review";

export const POST = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser({ roles: STAFF });
  const { note } = closeSchema.parse(await req.json());
  return json(await closeCase(user, uuid.parse(id), note));
});
