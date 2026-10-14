import { flaggedWord } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { addWord, listWords } from "@/server/services/flags";

export const GET = handle(async () => {
  const user = await requireUser({ roles: ["admin"] });
  return json({ items: await listWords(user) });
});

export const POST = handle(async (req) => {
  const user = await requireUser({ roles: ["admin"] });
  const { word } = flaggedWord.parse(await req.json());
  return json(await addWord(user, word), 201);
});
