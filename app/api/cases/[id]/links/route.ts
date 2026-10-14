import { createLink, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { createCaseLink, listCaseLinks } from "@/server/services/links";

export const GET = handle<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  return json({ items: await listCaseLinks(user, uuid.parse(id)) });
});

export const POST = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const { password } = createLink.parse(await req.json());
  return json(await createCaseLink(user, uuid.parse(id), password), 201);
});
