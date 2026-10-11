import { boardStatus } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { listBoard } from "@/server/services/review";

export const GET = handle(async (req) => {
  const user = await requireUser({ roles: ["reviewer"] });
  const status = boardStatus.parse(new URL(req.url).searchParams.get("status") ?? undefined);
  return json({ items: await listBoard(user, status) });
});
