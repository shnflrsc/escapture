import { boardQuery, boardStatus } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { STAFF } from "@/server/authz";
import { handle, json } from "@/server/http";
import { boardPage, listBoard, RANGE_DAYS } from "@/server/services/review";

export const GET = handle(async (req) => {
  const user = await requireUser({ roles: STAFF });
  const params = new URL(req.url).searchParams;
  const pick = (key: string) => params.get(key) ?? undefined;
  // With a search, an order or a page this is the board's table; otherwise the plain list.
  if (["q", "sort", "page", "collab", "rev", "mine", "unassigned", "flagged", "range"].some((key) => params.has(key))) {
    const query = boardQuery.parse({
      status: pick("status"),
      q: pick("q"),
      sort: pick("sort"),
      page: pick("page"),
      collab: pick("collab"),
      rev: pick("rev"),
      mine: pick("mine"),
      unassigned: pick("unassigned"),
      flagged: pick("flagged"),
      range: pick("range"),
    });
    return json(
      await boardPage(user, {
        ...query,
        collab: Boolean(query.collab),
        rev: Boolean(query.rev),
        mine: Boolean(query.mine),
        unassigned: Boolean(query.unassigned),
        flagged: Boolean(query.flagged),
        days: (query.range && RANGE_DAYS[query.range]) || undefined,
      }),
    );
  }
  return json({ items: await listBoard(user, boardStatus.parse(pick("status"))) });
});
