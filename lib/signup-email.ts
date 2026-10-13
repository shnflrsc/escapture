// Carries the email typed on the home page to the sign-up form. It stays in this
// browser tab: it is never put in an address, where it would end up in history and logs.
const KEY = "safetrail.signup-email";

export function keepSignupEmail(email: string) {
  try {
    if (email) sessionStorage.setItem(KEY, email);
  } catch {}
}

/** Reads it once and forgets it. */
export function takeSignupEmail(): string | null {
  try {
    const email = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return email;
  } catch {
    return null;
  }
}
