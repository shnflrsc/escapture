import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { listArchives } from "@/server/services/review";

export const GET = handle(async (req) => {
  const user = await requireUser({ roles: ["reviewer"] });
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 200);
  return json({ items: await listArchives(user, q) });
});
