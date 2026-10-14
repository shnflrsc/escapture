import { markRead as markReadSchema } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { markRead } from "@/server/services/notifications";

export const POST = handle(async (req) => {
  const user = await requireUser();
  const { ids } = markReadSchema.parse(await req.json().catch(() => ({})));
  return json(await markRead(user, ids));
});
