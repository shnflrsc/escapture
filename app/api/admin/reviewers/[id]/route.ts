import { setReviewerActive as activeSchema } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { setReviewerActive } from "@/server/services/admin";

/** Deactivate or reactivate a reviewer account. */
export const PATCH = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser({ roles: ["admin"] });
  const { active } = activeSchema.parse(await req.json());
  return json(await setReviewerActive(user, id.slice(0, 64), active));
});
