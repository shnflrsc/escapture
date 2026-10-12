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
  /**
   * Size of the captured area on the original page, in CSS pixels, and `fit`: how tall the
   * finished capture is when laid out at a few frame widths. The viewer sizes itself from these.
   */
  size?: { width: number; height: number; fit?: { w: number; h: number }[] };
};

/** Frame widths the capture is measured at, covering the SafeTrail viewer on small and large windows. */
export const FIT_WIDTHS = [360, 480, 600];

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
  | { type: "sheet:fetch"; url: string }
  | { type: "capture:measure"; html: string }
  | {
      type: "capture:upload";
      html: string;
      kind: Kind;
      sourceUrl: string;
      clientCapturedAt: string;
      tamperReport: TamperReport;
    };

export type Reply<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

/** Largest capture the server stores (the HTML itself). */
export const MAX_BYTES = 12 * 1024 * 1024;
/** Largest upload: the capture travels gzip-compressed and must fit in one request. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 - 128 * 1024;

export async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

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
