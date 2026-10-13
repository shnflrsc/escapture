import { createReviewer as createSchema } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { createReviewer, listReviewers } from "@/server/services/admin";

export const GET = handle(async (req) => {
  const user = await requireUser({ roles: ["admin"] });
  return json({ items: await listReviewers(user, new URL(req.url).searchParams.get("q") ?? undefined) });
});

export const POST = handle(async (req) => {
  const user = await requireUser({ roles: ["admin"] });
  const input = createSchema.parse(await req.json());
  return json(await createReviewer(user, input), 201);
});
