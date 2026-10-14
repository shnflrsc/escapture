import { shareByEmail, uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { listEvidenceShares, shareEvidenceByEmail } from "@/server/services/shares";

type P = { id: string };

export const GET = handle<P>(async (_req, { id }) => {
  const user = await requireUser();
  return json({ items: await listEvidenceShares(user, uuid.parse(id)) });
});

export const POST = handle<P>(async (req, { id }) => {
  const user = await requireUser();
  const { email } = shareByEmail.parse(await req.json());
  return json(await shareEvidenceByEmail(user, uuid.parse(id), email), 201);
});
