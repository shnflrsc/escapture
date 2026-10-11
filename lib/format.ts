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
