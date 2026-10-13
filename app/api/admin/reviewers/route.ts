import { createReviewer as createSchema, reviewerStatus } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { createReviewer, listReviewers } from "@/server/services/admin";

export const GET = handle(async (req) => {
  const user = await requireUser({ roles: ["admin"] });
  const params = new URL(req.url).searchParams;
  const status = reviewerStatus.parse(params.get("status") ?? undefined);
  return json({ items: await listReviewers(user, { q: params.get("q") ?? undefined, status }) });
});

export const POST = handle(async (req) => {
  const user = await requireUser({ roles: ["admin"] });
  const input = createSchema.parse(await req.json());
  return json(await createReviewer(user, input), 201);
});
