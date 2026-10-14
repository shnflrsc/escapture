import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { listNotifications } from "@/server/services/notifications";

export const GET = handle(async () => {
  const user = await requireUser();
  return json(await listNotifications(user));
});
