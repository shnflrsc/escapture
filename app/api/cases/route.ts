import { createCase as createSchema } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { createCase, listCases } from "@/server/services/cases";

export const GET = handle(async () => {
  const user = await requireUser({ roles: ["student"] });
  return json({ items: await listCases(user) });
});

export const POST = handle(async (req) => {
  const user = await requireUser({ roles: ["student"] });
  const input = createSchema.parse(await req.json());
  return json(await createCase(user, input), 201);
});
