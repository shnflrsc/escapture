import { NextResponse } from "next/server";
import { getUser, homeFor } from "@/server/auth";

/**
 * Where to after signing in: each role's own first page. The home address is
 * the public landing page, so it can't do this any more.
 */
export async function GET(request: Request) {
  const user = await getUser();
  return NextResponse.redirect(new URL(user ? homeFor(user.role) : "/sign-in", request.url));
}
