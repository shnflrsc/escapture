import { redirect } from "next/navigation";
import { getUser, homeFor } from "@/server/auth";

/** Sign in and register have nothing to offer someone already signed in: send them to their own home. */
export async function RedirectIfSignedIn() {
  const user = await getUser();
  if (user) redirect(homeFor(user.role));
  return null;
}
