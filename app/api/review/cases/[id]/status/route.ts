import { reviewStatus, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { setUnderReview } from "@/server/services/review";

export const POST = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser({ roles: ["reviewer"] });
  reviewStatus.parse(await req.json());
  return json(await setUnderReview(user, uuid.parse(id)));
});
