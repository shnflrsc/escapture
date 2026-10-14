import { requireUser } from "@/server/auth";
import { STAFF } from "@/server/authz";
import { handle, json } from "@/server/http";
import { listArchives } from "@/server/services/review";

export const GET = handle(async (req) => {
  const user = await requireUser({ roles: STAFF });
  const params = new URL(req.url).searchParams;
  const days = Number(params.get("days"));
  return json({
    items: await listArchives(user, {
      q: params.get("q")?.slice(0, 200),
      mine: params.get("mine") === "1",
      rev: params.get("rev") === "1",
      days: days === 30 || days === 90 ? days : undefined,
    }),
  });
});
