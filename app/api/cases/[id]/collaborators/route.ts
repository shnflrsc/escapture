import { shareByEmail, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { addCollaborator } from "@/server/services/cases";

export const POST = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const { email } = shareByEmail.parse(await req.json());
  return json(await addCollaborator(user, uuid.parse(id), email), 201);
});
