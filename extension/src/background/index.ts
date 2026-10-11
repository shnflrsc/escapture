// Service worker: sign-in, token storage, every network call to the SafeTrail
// app (it has host permission, so no CORS issue), image fetching, hashing, upload.
import {
  captureHost,
  gzip,
  MAX_BYTES,
  MAX_UPLOAD_BYTES,
  type AuthState,
  type LastCapture,
  type Message,
  type Reply,
} from "../shared/types";

const APP_URL = __APP_URL__;

type Stored = { token?: string; name?: string; email?: string; lastCapture?: LastCapture };

const store = {
  get: () => chrome.storage.local.get(["token", "name", "email", "lastCapture"]) as Promise<Stored>,
  set: (v: Partial<Stored>) => chrome.storage.local.set(v),
  clearAuth: () => chrome.storage.local.remove(["token", "name", "email"]),
};

async function appFetch(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Never send the browser's SafeTrail cookies: the extension has its own session.
  return fetch(`${APP_URL}${path}`, { ...init, headers, credentials: "omit" });
}

const errorText = async (res: Response, fallback: string) => {
  const body = await res.json().catch(() => null);
  return (body?.error?.message ?? body?.message ?? fallback) as string;
};

async function authStatus(): Promise<AuthState> {
  const { token, name, email } = await store.get();
  if (!token) return { signedIn: false };
  try {
    const res = await appFetch("/api/auth/get-session", {}, token);
    const session = res.ok ? await res.json().catch(() => null) : null;
    if (res.ok && !session?.user) {
      await store.clearAuth();
      return { signedIn: false };
    }
    if (session?.user) return { signedIn: true, name: session.user.name, email: session.user.email };
  } catch {
    // Offline: keep the stored session and let the upload report the problem.
  }
  return { signedIn: true, name: name ?? "", email: email ?? "" };
}

async function signIn(email: string, password: string): Promise<Reply<{ auth: AuthState }>> {
  let res: Response;
  try {
    res = await appFetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { ok: false, error: "We couldn't reach SafeTrail. Check your connection and try again." };
  }
  if (!res.ok) {
    return {
      ok: false,
      error:
        res.status === 401
          ? "That email or password isn't right. Check them and try again."
          : await errorText(res, "We couldn't sign you in. Please try again."),
    };
  }
  const token = res.headers.get("set-auth-token");
  const body = await res.json().catch(() => null);
  if (!token || !body?.user) return { ok: false, error: "We couldn't sign you in. Please try again." };
  await store.set({ token, name: body.user.name, email: body.user.email });
  return { ok: true, auth: { signedIn: true, name: body.user.name, email: body.user.email } };
}

async function signOut() {
  const { token } = await store.get();
  if (token) await appFetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, token).catch(() => {});
  await store.clearAuth();
}

async function startCapture(): Promise<Reply> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !captureHost(tab.url)) {
    return {
      ok: false,
      error: "Open the Facebook post or Messenger conversation you want to keep, then try again.",
    };
  }
  if (!(await store.get()).token) return { ok: false, error: "Sign in to SafeTrail first." };
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tab.id, { type: "picker:start" });
  } catch {
    return { ok: false, error: "We couldn't start on this page. Reload it and try again." };
  }
  return { ok: true };
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Fetches an image and returns a data URI.
 * With `maxWidth`, the image is embedded no wider than that (photos and
 * avatars are embedded at the size they are shown, not the size Facebook
 * serves) and animated images are reduced to their first frame. Without it
 * the file is passed through untouched, which CSS sprite sheets need.
 */
async function fetchImage(url: string, maxWidth?: number, quality = 0.8): Promise<Reply<{ dataUrl: string }>> {
  try {
    const res = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    let blob = await res.blob();
    if (!blob.type.startsWith("image/")) return { ok: false, error: "not an image" };
    if (maxWidth && blob.type !== "image/svg+xml") {
      const bitmap = await createImageBitmap(blob);
      const small = bitmap.width <= maxWidth && blob.size <= 30 * 1024 && blob.type !== "image/gif";
      if (!small) {
        const scale = Math.min(1, maxWidth / bitmap.width);
        const canvas = new OffscreenCanvas(
          Math.max(1, Math.round(bitmap.width * scale)),
          Math.max(1, Math.round(bitmap.height * scale)),
        );
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        // WebP keeps transparency (stickers, icons) and is smaller than JPEG.
        blob = await canvas.convertToBlob({ type: "image/webp", quality });
      }
      bitmap.close();
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return { ok: true, dataUrl: `data:${blob.type};base64,${toBase64(bytes)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function upload(msg: Extract<Message, { type: "capture:upload" }>): Promise<Reply<{ result: LastCapture }>> {
  const at = new Date().toISOString();
  const fail = async (message: string, refused = false) => {
    const result: LastCapture = { ok: false, refused, message, at };
    await store.set({ lastCapture: result });
    return { ok: true as const, result };
  };

  const { token } = await store.get();
  if (!token) return fail("Sign in to SafeTrail in the extension, then capture again.");

  // The hash is of the exact bytes the server will store: the HTML itself.
  const bytes = new TextEncoder().encode(msg.html);
  if (bytes.byteLength > MAX_BYTES) return fail("This capture is too large. Select a smaller area.", true);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const sha256 = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
  // It travels gzip-compressed; the server unpacks it and checks the hash.
  const packed = await gzip(bytes);
  if (packed.byteLength > MAX_UPLOAD_BYTES) return fail("This capture is too large. Select a smaller area.", true);

  const form = new FormData();
  form.set("file", new File([packed as BlobPart], "capture.html.gz", { type: "application/gzip" }));
  form.set("encoding", "gzip");
  form.set("sha256", sha256);
  form.set("kind", msg.kind);
  form.set("sourceUrl", msg.sourceUrl);
  form.set("clientCapturedAt", msg.clientCapturedAt);
  form.set("tamperReport", JSON.stringify({ ...msg.tamperReport, extensionVersion: __EXT_VERSION__ }));
  form.set("extensionVersion", __EXT_VERSION__);

  let res: Response;
  try {
    res = await appFetch("/api/evidence", { method: "POST", body: form }, token);
  } catch {
    return fail("We couldn't reach SafeTrail, so nothing was saved. Check your connection and capture again.");
  }
  if (res.status === 401) {
    await store.clearAuth();
    return fail("Your SafeTrail session ended. Sign in again in the extension, then capture again.");
  }
  if (!res.ok) return fail(await errorText(res, "We couldn't save this capture. Please try again."));
  const saved = await res.json();
  const result: LastCapture = { ok: true, id: saved.id, label: saved.label, url: `${APP_URL}/vault/${saved.id}`, at };
  await store.set({ lastCapture: result });
  return { ok: true, result };
}

async function handle(msg: Message): Promise<unknown> {
  switch (msg.type) {
    case "auth:status":
      return { ok: true, auth: await authStatus(), lastCapture: (await store.get()).lastCapture ?? null };
    case "auth:signIn":
      return signIn(msg.email, msg.password);
    case "auth:signOut":
      await signOut();
      return { ok: true };
    case "capture:start":
      return startCapture();
    case "capture:result":
      await store.set({ lastCapture: msg.result });
      return { ok: true };
    case "image:fetch":
      return fetchImage(msg.url, msg.maxWidth, msg.quality);
    case "capture:upload":
      return upload(msg);
  }
}

chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  // Only this extension's own pages and content scripts may talk to the worker.
  if (sender.id !== chrome.runtime.id) return false;
  handle(msg).then(sendResponse, (e) =>
    sendResponse({ ok: false, error: e instanceof Error ? e.message : "Something went wrong." }),
  );
  return true;
});
