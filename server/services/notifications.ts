import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Actor } from "../auth";
import { db, type Db, type Tx } from "../db";
import { notifications } from "../db/schema";

export type NewNotification = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  caseId?: string | null;
  evidenceId?: string | null;
};

/** Call inside the same transaction as the state change it reports. */
export async function notify(dbx: Db | Tx, rows: NewNotification[]) {
  const unique = new Map(rows.map((r) => [`${r.userId}:${r.type}`, r]));
  if (unique.size === 0) return;
  await dbx.insert(notifications).values([...unique.values()]);
}

/** Notifications carry titles and short excerpts only, never evidence contents. */
export const excerpt = (text: string, max = 140) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

export async function listNotifications(actor: Actor) {
  const [items, [unread]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        caseId: notifications.caseId,
        evidenceId: notifications.evidenceId,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, actor.id))
      .orderBy(desc(notifications.createdAt))
      .limit(100),
    db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, actor.id), isNull(notifications.readAt))),
  ]);
  return { items, unreadCount: unread?.n ?? 0 };
}

export async function unreadCount(actor: Actor): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, actor.id), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export async function markRead(actor: Actor, ids?: string[]) {
  const mine = and(eq(notifications.userId, actor.id), isNull(notifications.readAt));
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(ids?.length ? and(mine, inArray(notifications.id, ids)) : mine);
  return { unreadCount: await unreadCount(actor) };
}
