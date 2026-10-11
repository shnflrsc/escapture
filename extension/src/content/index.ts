// Isolated-world content script, injected on demand when the student chooses
// "Capture this page": element picker, tamper checks, snapshot building.
import { captureHost, MAX_BYTES, type Kind, type LastCapture, type Reply } from "../shared/types";
import { queryGuard, runChecks, type GuardState } from "./checks";
import { buildSnapshot, serialize } from "./snapshot";

declare global {
  interface Window {
    __safetrailCapture?: boolean;
  }
}

const HOST_TAG = "safetrail-capture";

// Tried in order when a capture is over the upload limit.
const IMAGE_LEVELS = [
  { maxWidth: 960, quality: 0.7 },
  { maxWidth: 720, quality: 0.6 },
  { maxWidth: 480, quality: 0.5 },
];

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: Nunito, system-ui, -apple-system, "Segoe UI", sans-serif; }
.box { position: fixed; pointer-events: none; z-index: 2147483646; border: 2px solid #3A6D88; background: rgba(102,163,191,0.18); border-radius: 6px; display: none; }
.bar, .panel { position: fixed; z-index: 2147483647; left: 50%; transform: translateX(-50%); background: #fff; color: #1E2A32; border: 1px solid #DCE6EB; border-radius: 12px; box-shadow: 0 8px 24px rgba(30,42,50,0.18); font-size: 14px; line-height: 20px; }
.bar { top: 16px; padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: flex-end; width: max-content; max-width: min(860px, calc(100vw - 32px)); }
.bar p { margin: 0; flex: 1 1 280px; min-width: 240px; }
.seg { flex-shrink: 0; }
.bar small { display: block; color: #55646E; font-size: 13px; line-height: 18px; }
.panel { top: 16px; padding: 16px; width: min(420px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 12px; }
.panel h2 { margin: 0; font: 600 18px/26px Lora, Georgia, serif; }
.panel p { margin: 0; }
.note { border-radius: 10px; padding: 10px 12px; }
.note.attention { background: #FDF3E1; color: #8A5A12; }
.note.success { background: #E2F3F0; color: #1D6359; font-weight: 600; }
ul { margin: 0; padding-left: 18px; }
.row { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
button, a.btn { height: 36px; padding: 0 14px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; display: inline-flex; align-items: center; white-space: nowrap; }
button:focus-visible, a.btn:focus-visible { outline: 2px solid #3A6D88; outline-offset: 2px; }
.primary { background: #3A6D88; color: #fff; } .primary:hover { background: #2D556B; }
.soft { background: #E6F1F6; color: #2D556B; } .soft:hover { background: #CDE2EC; }
.ghost { background: transparent; color: #3A6D88; } .ghost:hover { background: #E6F1F6; }
.seg { display: inline-flex; border: 1px solid #7690A0; border-radius: 10px; overflow: hidden; }
.seg button { border-radius: 0; height: 34px; background: #fff; color: #1E2A32; }
.seg button[aria-pressed="true"] { background: #E6F1F6; color: #2D556B; }
@media (prefers-reduced-motion: no-preference) { .panel { animation: rise 200ms ease-out; } }
@keyframes rise { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
`;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, string> = {}, ...children: (Node | string)[]) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else el.setAttribute(k, v);
  }
  el.append(...children);
  return el;
}

const send = <T>(msg: unknown) => chrome.runtime.sendMessage(msg) as Promise<Reply<T>>;

function detectKind(): Kind {
  const fixture = document.querySelector<HTMLMetaElement>('meta[name="safetrail:fixture-kind"]')?.content;
  if (captureHost(location.href) === "fixture" && (fixture === "facebook_post" || fixture === "facebook_message")) return fixture;
  if (location.hostname.endsWith("messenger.com") || location.pathname.startsWith("/messages")) return "facebook_message";
  return "facebook_post";
}

class Session {
  private host = document.createElement(HOST_TAG);
  private shadow = this.host.attachShadow({ mode: "open" });
  private box = h("div", { class: "box" });
  private ui = h("div");
  private current: Element | null = null;
  private kind: Kind = detectKind();
  private guard: GuardState | null = null;
  private picking = false;

  constructor() {
    this.shadow.append(h("style", {}, CSS), this.box, this.ui);
  }

  start() {
    if (this.picking) return;
    document.documentElement.appendChild(this.host);
    this.picking = true;
    void queryGuard().then((g) => (this.guard = g));
    this.renderBar();
    document.addEventListener("mousemove", this.onMove, true);
    document.addEventListener("click", this.onClick, true);
    document.addEventListener("mousedown", this.swallow, true);
    document.addEventListener("mouseup", this.swallow, true);
    document.addEventListener("keydown", this.onKey, true);
    window.addEventListener("scroll", this.reposition, true);
  }

  private stopPicking() {
    this.picking = false;
    this.box.style.display = "none";
    document.removeEventListener("mousemove", this.onMove, true);
    document.removeEventListener("click", this.onClick, true);
    document.removeEventListener("mousedown", this.swallow, true);
    document.removeEventListener("mouseup", this.swallow, true);
    document.removeEventListener("keydown", this.onKey, true);
    window.removeEventListener("scroll", this.reposition, true);
  }

  private close = () => {
    this.stopPicking();
    this.host.remove();
  };

  private isOurs = (e: Event) => e.composedPath().includes(this.host);

  private renderBar() {
    const post = h("button", { type: "button", "aria-pressed": String(this.kind === "facebook_post") }, "A post");
    const chat = h("button", { type: "button", "aria-pressed": String(this.kind === "facebook_message") }, "Messages");
    const setKind = (k: Kind) => () => {
      this.kind = k;
      this.renderBar();
    };
    post.addEventListener("click", setKind("facebook_post"));
    chat.addEventListener("click", setKind("facebook_message"));
    const cancel = h("button", { type: "button", class: "ghost" }, "Cancel");
    cancel.addEventListener("click", this.close);

    const messages = this.kind === "facebook_message";
    const text = h(
      "p",
      {},
      messages ? "Click the conversation you want to keep." : "Click the post you want to keep.",
      h(
        "small",
        {},
        messages
          ? "Only messages currently loaded on screen are captured. Scroll up to load more before capturing. This is meant for conversations you took part in."
          : "Hold Alt to pick a smaller part. Press Esc to cancel.",
      ),
    );
    const bar = h("div", { class: "bar", role: "dialog", "aria-label": "SafeTrail capture" }, text, h("div", { class: "seg", role: "group", "aria-label": "What are you capturing?" }, post, chat));
    const pane = document.querySelector('[role="main"]');
    if (messages && pane) {
      const whole = h("button", { type: "button", class: "soft" }, "Use whole conversation pane");
      whole.addEventListener("click", () => this.capture(pane));
      bar.append(whole);
    }
    bar.append(cancel);
    this.ui.replaceChildren(bar);
  }

  private pick(e: MouseEvent): Element | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === this.host || el === document.documentElement || el === document.body) return null;
    if (e.altKey) return el;
    // Snap to the whole post so the picker doesn't depend on Facebook's class names.
    return (this.kind === "facebook_post" && el.closest('[role="article"]')) || el;
  }

  private reposition = () => {
    if (!this.current) return;
    const r = this.current.getBoundingClientRect();
    Object.assign(this.box.style, { display: "block", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  };

  private onMove = (e: MouseEvent) => {
    if (this.isOurs(e)) {
      this.box.style.display = "none";
      return;
    }
    this.current = this.pick(e);
    this.reposition();
  };

  private swallow = (e: Event) => {
    if (this.isOurs(e)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  private onClick = (e: MouseEvent) => {
    if (this.isOurs(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const target = this.pick(e);
    if (target) void this.capture(target);
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    this.close();
  };

  private panel(title: string, ...children: (Node | string)[]) {
    const closeBtn = h("button", { type: "button", class: "ghost" }, "Close");
    closeBtn.addEventListener("click", this.close);
    const panel = h("div", { class: "panel", role: "status", "aria-live": "polite" }, h("h2", {}, title), ...children);
    this.ui.replaceChildren(panel);
    return { panel, closeBtn };
  }

  private async report(result: LastCapture) {
    await send({ type: "capture:result", result }).catch(() => {});
  }

  private async capture(target: Element) {
    this.stopPicking();
    // Take our own UI out of the page before reading it.
    this.host.remove();
    const guard = (await queryGuard()) ?? this.guard;

    // --- Same task from here to the end of buildSnapshot: check, then clone. ---
    const report = runChecks(target, guard);
    const clientCapturedAt = new Date().toISOString();
    const snap = report.allPassed ? buildSnapshot(target) : null;
    // --------------------------------------------------------------------------
    document.documentElement.appendChild(this.host);

    if (!snap) {
      const reasons = report.checks.filter((c) => !c.passed).map((c) => c.detail ?? c.id);
      const message = "We couldn't capture this page because it looks like it was changed in the browser. Reload the page and try again.";
      const { panel, closeBtn } = this.panel(
        "Not captured",
        h("p", { class: "note attention" }, message),
        h("ul", {}, ...reasons.map((r) => h("li", {}, r))),
      );
      panel.append(h("div", { class: "row" }, closeBtn));
      await this.report({ ok: false, refused: true, message: `${message} ${reasons.join(" ")}`, at: clientCapturedAt });
      return;
    }

    this.panel("Capturing", h("p", {}, "Saving a copy to your vault. This takes a moment."));

    // Embed images through the background worker, a few at a time. If the
    // result is over the upload limit, embed them again smaller before giving up.
    const meta = { sourceUrl: location.href, clientCapturedAt, kind: this.kind };
    const size = (text: string) => new TextEncoder().encode(text).byteLength;
    const embed = async (level?: { maxWidth: number; quality: number }) => {
      const cache = new Map<string, Promise<string | null>>();
      const fetchOne = (url: string) => {
        let abs = url;
        try {
          abs = new URL(url, location.href).href;
        } catch {}
        if (!cache.has(abs)) {
          cache.set(
            abs,
            send<{ dataUrl: string }>({ type: "image:fetch", url: abs, ...level }).then(
              (r) => (r.ok ? r.dataUrl : null),
              () => null,
            ),
          );
        }
        return cache.get(abs)!;
      };
      const queue = [...snap.images];
      await Promise.all(
        Array.from({ length: 6 }, async () => {
          for (let job = queue.shift(); job; job = queue.shift()) job.apply(await fetchOne(job.url));
        }),
      );
      return serialize(snap, meta);
    };

    let html = await embed();
    for (const level of IMAGE_LEVELS) {
      if (size(html) <= MAX_BYTES || snap.images.length === 0) break;
      html = await embed(level);
    }
    const bytes = size(html);
    if (bytes > MAX_BYTES) {
      const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
      const message = `This capture is too large (${mb(bytes)} MB, and the limit is ${mb(MAX_BYTES)} MB). Select a smaller area.`;
      const { panel, closeBtn } = this.panel("Not captured", h("p", { class: "note attention" }, message));
      panel.append(h("div", { class: "row" }, closeBtn));
      await this.report({ ok: false, refused: true, message, at: clientCapturedAt });
      return;
    }

    const reply = await send<{ result: LastCapture }>({
      type: "capture:upload",
      html,
      kind: this.kind,
      sourceUrl: location.href,
      clientCapturedAt,
      tamperReport: report,
    }).catch((): Reply<{ result: LastCapture }> => ({ ok: false, error: "The extension stopped responding. Reload the page and try again." }));

    const result: LastCapture = reply.ok ? reply.result : { ok: false, refused: false, message: reply.error, at: clientCapturedAt };
    if (result.ok) {
      const open = h("a", { class: "btn primary", href: result.url, target: "_blank", rel: "noopener" }, "Open in vault");
      const { panel, closeBtn } = this.panel(
        "Saved to your vault",
        h("p", { class: "note success" }, "Captured with tamper checks"),
        h("p", {}, result.label),
      );
      panel.append(h("div", { class: "row" }, closeBtn, open));
    } else {
      const { panel, closeBtn } = this.panel("Not saved", h("p", { class: "note attention" }, result.message));
      const retry = h("button", { type: "button", class: "primary" }, "Try again");
      retry.addEventListener("click", () => {
        this.close();
        new Session().start();
      });
      panel.append(h("div", { class: "row" }, closeBtn, retry));
    }
  }
}

if (!window.__safetrailCapture) {
  window.__safetrailCapture = true;
  let session: Session | null = null;
  chrome.runtime.onMessage.addListener((msg: { type?: string }, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || msg?.type !== "picker:start") return false;
    document.querySelector(HOST_TAG)?.remove();
    session = new Session();
    session.start();
    sendResponse({ ok: true });
    return false;
  });
}
