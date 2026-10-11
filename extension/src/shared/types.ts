declare global {
  const __APP_URL__: string;
  const __EXT_VERSION__: string;
}

export type Kind = "facebook_post" | "facebook_message";

export type TamperCheck = { id: string; passed: boolean; detail?: string };
export type TamperReport = {
  checks: TamperCheck[];
  allPassed: boolean;
  warnings?: string[];
  extensionVersion?: string;
};

export type LastCapture =
  | { ok: true; id: string; label: string; url: string; at: string }
  | { ok: false; refused: boolean; message: string; at: string };

export type AuthState = { signedIn: false } | { signedIn: true; name: string; email: string };

export type Message =
  | { type: "auth:status" }
  | { type: "auth:signIn"; email: string; password: string }
  | { type: "auth:signOut" }
  | { type: "capture:start" }
  | { type: "capture:result"; result: LastCapture }
  | { type: "image:fetch"; url: string; maxWidth?: number; quality?: number }
  | {
      type: "capture:upload";
      html: string;
      kind: Kind;
      sourceUrl: string;
      clientCapturedAt: string;
      tamperReport: TamperReport;
    };

export type Reply<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

export const MAX_BYTES = 4 * 1024 * 1024;

/** Pages the extension will capture from. Everything else is refused. */
export function captureHost(url: string): "facebook" | "messenger" | "fixture" | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol === "https:" && (u.hostname === "www.facebook.com" || u.hostname === "web.facebook.com")) return "facebook";
  if (u.protocol === "https:" && u.hostname === "www.messenger.com") return "messenger";
  const appLocal = ["localhost", "127.0.0.1"].includes(new URL(__APP_URL__).hostname);
  if (appLocal && u.protocol === "http:" && u.hostname === "localhost" && u.port === "4100") return "fixture";
  return null;
}
