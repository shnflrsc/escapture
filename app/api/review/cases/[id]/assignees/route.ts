import { assignReviewer as body, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { assignReviewer } from "@/server/services/review";

// Signed-in staff reach the service, which lets only an administrator through.
export const POST = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser({ roles: ["reviewer", "admin"] });
  const { reviewerId } = body.parse(await req.json());
  return json(await assignReviewer(user, uuid.parse(id), reviewerId), 201);
});
