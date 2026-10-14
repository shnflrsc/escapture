import { liveCase as liveSchema, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { liveCase } from "@/server/services/live";

/** An open case page checks in here a couple of times a second. See liveCase. */
export const POST = handle<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const input = liveSchema.parse(await req.json());
  return json(await liveCase(user, uuid.parse(id), input));
});
