import { createLink, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { createEvidenceLink } from "@/server/services/links";

export const POST = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const { password } = createLink.parse(await req.json());
  return json(await createEvidenceLink(user, uuid.parse(id), password), 201);
});
