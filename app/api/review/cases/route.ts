import { boardQuery, boardStatus } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { boardPage, listBoard } from "@/server/services/review";

export const GET = handle(async (req) => {
  const user = await requireUser({ roles: ["reviewer"] });
  const params = new URL(req.url).searchParams;
  const pick = (key: string) => params.get(key) ?? undefined;
  // With a search, an order or a page this is the board's table; otherwise the plain list.
  if (["q", "sort", "page", "collab", "rev"].some((key) => params.has(key))) {
    const query = boardQuery.parse({
      status: pick("status"),
      q: pick("q"),
      sort: pick("sort"),
      page: pick("page"),
      collab: pick("collab"),
      rev: pick("rev"),
    });
    return json(await boardPage(user, { ...query, collab: Boolean(query.collab), rev: Boolean(query.rev) }));
  }
  return json({ items: await listBoard(user, boardStatus.parse(pick("status"))) });
});
