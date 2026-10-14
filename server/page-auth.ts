import { notFound, redirect } from "next/navigation";
import { getUser, homeFor, type Actor, type Role } from "./auth";
import { AppError } from "./errors";

/** Session check for pages: redirects instead of throwing. */
export async function pageUser(roles?: Role[]): Promise<Actor> {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/** Pages show the not-found screen for anything the user may not see. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof AppError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }
}

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
