// Captured HTML is untrusted (I8). It is only ever served with a sandbox CSP
// and shown in a script-less sandboxed iframe, never inline in the app origin.
export const EVIDENCE_FILE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy":
    "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-ancestors 'self'",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
} as const;
