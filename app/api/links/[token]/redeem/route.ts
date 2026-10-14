import { redeemLink as redeemSchema } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { redeemLink } from "@/server/services/links";

export const POST = handle<{ token: string }>(async (req, { token }) => {
  const user = await requireUser();
  const { password } = redeemSchema.parse(await req.json());
  return json(await redeemLink(user, token, password));
});
