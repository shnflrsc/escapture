/** Sign-up gate (I9): BulSU addresses, plus an explicit demo allow-list. */
export function isAllowedSignupEmail(
  email: string,
  allowedDomain: string,
  devAllowedEmails: string = "",
): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return false;
  const domain = allowedDomain.trim().toLowerCase();
  if (domain && normalized.slice(at + 1) === domain) return true;
  return devAllowedEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}
