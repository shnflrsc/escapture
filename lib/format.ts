const TZ = "Asia/Manila";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dateOnly = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Stored as UTC, displayed in Asia/Manila. */
export function formatDateTime(d: Date | string): string {
  return dateTime.format(new Date(d)).replace(",", "");
}
export function formatDate(d: Date | string): string {
  return dateOnly.format(new Date(d));
}
export function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}
export function age(d: Date | string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.floor((now.getTime() - new Date(d).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
export const kindLabel = (kind: "facebook_post" | "facebook_message") =>
  kind === "facebook_post" ? "Facebook post" : "Facebook messages";

const dayOnly = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
/** The calendar day in Manila, as YYYY-MM-DD: for grouping things by day. */
export const dayKey = (d: Date | string) => dayOnly.format(new Date(d));

/** "Just now", "5 min ago", "3 hr ago", "Yesterday", "4 days ago", then the date. */
export function timeAgo(d: Date | string, now: Date = new Date()): string {
  const then = new Date(d);
  const mins = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(then);
}
