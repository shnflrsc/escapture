// Isolated-world content script, injected on demand when the student chooses
// "Capture this page": element picker, tamper checks, snapshot building.
import { captureHost, gzip, MAX_BYTES, MAX_UPLOAD_BYTES, type Kind, type LastCapture, type Reply, type TamperReport } from "../shared/types";
import { queryGuard, runChecksAll } from "./checks";
import { saveDiagnostics } from "./diagnostics";
import { buildSnapshot, loadStyles, mergeSnapshots, readUnreadSheets, serialize, sizeBreakdown, type Snapshot } from "./snapshot";

declare global {
  interface Window {
    __safetrailCapture?: boolean;
  }
}

const HOST_TAG = "safetrail-capture";

// Markers Facebook keeps on its own pages. See Session.snap for how they are used.
const POST_ACTIONS =
  '[data-ad-rendering-role="like_button"], [data-ad-rendering-role="comment_button"], [data-ad-rendering-role="share_button"]';
const POST_HEADER = '[data-ad-rendering-role="profile_name"], h2, h3, h4';
const MESSAGE_ROW = '[data-pagelet="MWMessageRow"], [role="row"]';

// Images are embedded at the size they are shown. These caps are tried in
// order when a capture is still over the upload limit.
const DEFAULT_LEVEL = { maxWidth: 1280, quality: 0.8 };
const SHRINK_LEVELS = [
  { maxWidth: 800, quality: 0.65 },
  { maxWidth: 560, quality: 0.5 },
  { maxWidth: 360, quality: 0.4 },
];

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: Nunito, system-ui, -apple-system, "Segoe UI", sans-serif; }
.box, .sel { position: fixed; pointer-events: none; z-index: 2147483646; border-radius: 6px; display: none; }
.box { border: 2px dashed #3A6D88; background: rgba(102,163,191,0.12); }
.sel { border: 2px solid #3A6D88; background: rgba(102,163,191,0.22); }
.bar, .panel { position: fixed; z-index: 2147483647; left: 50%; transform: translateX(-50%); background: #fff; color: #1E2A32; border: 1px solid #DCE6EB; border-radius: 12px; box-shadow: 0 8px 24px rgba(30,42,50,0.18); font-size: 14px; line-height: 20px; }
.bar { bottom: 16px; padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; justify-content: flex-end; width: max-content; max-width: min(1100px, calc(100vw - 32px)); }
.bar.top { bottom: auto; top: 16px; }
.bar.slim { padding: 8px 12px; flex-wrap: nowrap; }
.bar p { margin: 0; flex: 1 1 260px; min-width: 240px; }
.bar .count { margin: 0 4px; font-weight: 600; white-space: nowrap; flex: none; min-width: 0; }
.bar small { display: block; color: #55646E; font-size: 13px; line-height: 18px; }
.group { display: inline-flex; gap: 8px; flex-shrink: 0; }
.panel { top: 16px; padding: 16px; width: min(440px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 12px; }
.panel h2 { margin: 0; font: 600 18px/26px Lora, Georgia, serif; }
.panel p { margin: 0; }
.note { border-radius: 10px; padding: 10px 12px; }
.note.attention { background: #FDF3E1; color: #8A5A12; }
.chip { display: inline-flex; align-self: flex-start; border-radius: 999px; padding: 2px 10px; font-size: 13px; line-height: 20px; font-weight: 600; background: #E2F3F0; color: #1D6359; }
ul { margin: 0; padding-left: 18px; }
.row { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
button, a.btn { height: 36px; padding: 0 14px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; display: inline-flex; align-items: center; white-space: nowrap; }
button:disabled { background: #E6EDF1; color: #7D8B94; border-color: transparent; cursor: not-allowed; }
button:focus-visible, a.btn:focus-visible { outline: 2px solid #3A6D88; outline-offset: 2px; }
.primary { background: #3A6D88; color: #fff; } .primary:hover:not(:disabled) { background: #2D556B; }
.soft { background: #E6F1F6; color: #2D556B; } .soft:hover:not(:disabled) { background: #CDE2EC; }
.secondary { background: #fff; color: #1E2A32; border-color: #7690A0; } .secondary:hover:not(:disabled) { background: #F1F7FA; }
.ghost { background: transparent; color: #3A6D88; } .ghost:hover { background: #E6F1F6; }
.seg { display: inline-flex; flex-shrink: 0; border: 1px solid #7690A0; border-radius: 10px; overflow: hidden; }
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

function button(label: string, cls: string, onClick: () => void, disabled = false) {
  const b = h("button", { type: "button", class: cls }, label);
  b.disabled = disabled;
  b.addEventListener("click", onClick);
  return b;
}

const send = <T>(msg: unknown) => chrome.runtime.sendMessage(msg) as Promise<Reply<T>>;

function detectKind(): Kind {
  const fixture = document.querySelector<HTMLMetaElement>('meta[name="safetrail:fixture-kind"]')?.content;
  if (captureHost(location.href) === "fixture" && (fixture === "facebook_post" || fixture === "facebook_message")) return fixture;
  if (location.hostname.endsWith("messenger.com") || location.pathname.startsWith("/messages")) return "facebook_message";
  return "facebook_post";
}

type Dock = "top" | "bottom";
// The toolbar covers part of the page, and what it covers can't be clicked. In a conversation
// the newest messages are at the bottom and can't be scrolled clear of it, so it starts at the
// top there. A post's author and time are at its top, so it starts at the bottom there.
const DEFAULT_DOCK: Record<Kind, Dock> = { facebook_message: "top", facebook_post: "bottom" };
const DOCK_KEY = "toolbarDock";

/** `leaf` is what was actually clicked; `el` is the area chosen around it. */
/**
 * A copy taken when messages were selected, kept in case the page unloads
 * them before the student presses Capture (Messenger only keeps a window of
 * the conversation on the page). `snap` is null if the tamper checks failed.
 */
type Frozen = { snap: Snapshot | null; report: TamperReport; ready: Promise<void> };

type Item = {
  leaf: Element;
  el: Element;
  /** Messenger's id for the message, to recognise it again if the page reloads it. */
  key?: string;
  frozen?: Frozen;
  /** The element the frozen copy was taken from, and where it sat (see orderKey). */
  frozenEl?: Element;
  order?: number;
};

const messageKey = (el: Element) =>
  (el.matches("[data-message-id]") ? el : el.querySelector("[data-message-id]"))?.getAttribute("data-message-id") ?? undefined;

function scrollerOf(el: Element): Element | null {
  for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
    const overflow = getComputedStyle(p).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;
}

/**
 * How far above the END of its conversation an element sits, in pixels.
 * Larger means earlier. Measured from the end because that end stays put
 * while older messages load in above; an offset from the top would not.
 */
function orderKey(el: Element): number {
  const rect = el.getBoundingClientRect();
  const sc = scrollerOf(el);
  if (!sc) return document.documentElement.scrollHeight - (rect.top + window.scrollY);
  // A list laid out bottom-up (column-reverse) scrolls from 0 downwards into negative numbers.
  const reversed = getComputedStyle(sc).flexDirection === "column-reverse";
  const below = reversed ? -sc.scrollTop : sc.scrollHeight - sc.clientHeight - sc.scrollTop;
  return sc.getBoundingClientRect().bottom - rect.top + below;
}

function mergeReports(reports: TamperReport[]): TamperReport {
  const checks = reports[0].checks.map((first, i) => reports.map((r) => r.checks[i]).find((c) => c && !c.passed) ?? first);
  return { checks, allPassed: checks.every((c) => c.passed) };
}

const inDocumentOrder = (a: Element, b: Element) =>
  a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

class Session {
  private host = document.createElement(HOST_TAG);
  private shadow = this.host.attachShadow({ mode: "open" });
  private hoverBox = h("div", { class: "box" });
  private selBoxes = h("div");
  private ui = h("div");
  private hover: Element | null = null;
  private items: Item[] = [];
  private kind: Kind = detectKind();
  private picking = false;
  /** Where the toolbar sits, when the student has moved it. Remembered per kind of capture. */
  private docks: Partial<Record<Kind, Dock>> = {};
  private freezeTimer = 0;
  private lastReassociate = 0;
  private frame = 0;

  constructor() {
    this.shadow.append(h("style", {}, CSS), this.selBoxes, this.hoverBox, this.ui);
  }

  start() {
    if (this.picking) return;
    document.documentElement.appendChild(this.host);
    this.picking = true;
    void chrome.storage.local.get(DOCK_KEY).then((stored) => {
      const saved = stored[DOCK_KEY] as Partial<Record<Kind, Dock>> | undefined;
      if (saved && typeof saved === "object") {
        this.docks = saved;
        if (this.picking) this.renderBar();
      }
    });
    this.renderBar();
    document.addEventListener("mousemove", this.onMove, true);
    document.addEventListener("click", this.onClick, true);
    document.addEventListener("mousedown", this.swallow, true);
    document.addEventListener("mouseup", this.swallow, true);
    document.addEventListener("keydown", this.onKey, true);
    const tick = () => {
      this.reposition();
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stopPicking() {
    this.picking = false;
    cancelAnimationFrame(this.frame);
    this.hoverBox.style.display = "none";
    this.selBoxes.replaceChildren();
    document.removeEventListener("mousemove", this.onMove, true);
    document.removeEventListener("click", this.onClick, true);
    document.removeEventListener("mousedown", this.swallow, true);
    document.removeEventListener("mouseup", this.swallow, true);
    document.removeEventListener("keydown", this.onKey, true);
  }

  private close = () => {
    this.stopPicking();
    this.host.remove();
  };

  private isOurs = (e: Event) => e.composedPath().includes(this.host);

  // ---- Choosing what a click means ----

  /**
   * Grows a clicked element to the thing the student means. It relies on
   * markers Facebook keeps for its own purposes (rendering roles, pagelet
   * names, ARIA roles), not on its generated class names, which change often.
   * The Wider and Narrower buttons correct it when the guess is off.
   *
   * Observed on real pages (October 2026):
   * - A post is NOT role="article"; only its comments are. A post is the
   *   smallest element holding both its author heading and its action bar
   *   (Like / Comment / Share). That holds in the feed, in the pop-up view and
   *   on a post's own page, and it includes the comments when they are open.
   * - On a photo's own page the post text sits in a side panel
   *   (role="complementary") beside the photo (role="main").
   * - A message is data-pagelet="MWMessageRow": picture, name and bubble.
   */
  private snap(el: Element, exact: boolean): Element {
    if (exact) return el;
    if (this.kind === "facebook_post") {
      for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) {
        if (!a.querySelector(POST_ACTIONS) || !a.querySelector(POST_HEADER)) continue;
        // Take the photo together with its side panel.
        const panel = a.closest('[role="complementary"]');
        const frame = panel?.parentElement;
        if (frame && frame !== document.body && frame.querySelector(':scope > [role="main"]')) return frame;
        return a;
      }
      // No markers (the layout changed, or this is not a post): fall back to
      // a feed unit, then to the outermost article.
      const unit = el.closest("[aria-posinset]");
      if (unit) return unit;
      let article: Element | null = null;
      for (let x = el.closest('[role="article"]'); x; x = x.parentElement?.closest('[role="article"]') ?? null) article = x;
      return article ?? el;
    }
    // One message is a whole row: picture, name and bubble together.
    const row = el.closest(MESSAGE_ROW) ?? el.closest('[role="article"]');
    if (row) return row;
    // Otherwise, the nearest ancestor that is one of many siblings in a list.
    for (let a: Element | null = el; a?.parentElement && a.parentElement !== document.body; a = a.parentElement) {
      if (a.parentElement.children.length >= 5 && a.getBoundingClientRect().width >= 200) return a;
    }
    return el;
  }

  /**
   * Everything between two selected messages. Rows are often wrapped one by
   * one, so this walks the children of their common container.
   */
  private between(from: Element, to: Element): Element[] {
    let top: Element | null = from;
    while (top && !top.contains(to)) top = top.parentElement;
    if (!top || top === from) return [];
    const branch = (el: Element) => [...top.children].find((c) => c.contains(el));
    const kids = [...top.children];
    const [i, j] = [kids.indexOf(branch(from)!), kids.indexOf(branch(to)!)].sort((x, y) => x - y);
    return kids.slice(i + 1, j).flatMap((kid) => {
      if (kid.matches(MESSAGE_ROW)) return [kid];
      const rows = [...kid.querySelectorAll(MESSAGE_ROW)];
      if (rows.length) return rows;
      // Not a message row (a date divider, or an unloaded placeholder).
      return kid.getBoundingClientRect().height > 0 && kid.textContent?.trim() ? [kid] : [];
    });
  }

  private pickAt(e: MouseEvent): { leaf: Element; el: Element } | null {
    const leaf = document.elementFromPoint(e.clientX, e.clientY);
    if (!leaf || leaf === this.host || leaf === document.documentElement || leaf === document.body) return null;
    return { leaf, el: this.snap(leaf, e.altKey) };
  }

  private select(pick: Item, range: boolean) {
    const existing = this.items.findIndex((i) => i.el === pick.el || i.el.contains(pick.el));
    if (existing >= 0) {
      // Clicking something already selected takes it out again.
      this.items.splice(existing, 1);
    } else if (this.kind === "facebook_post") {
      this.items = [pick];
    } else {
      const last = this.items[this.items.length - 1];
      this.items = this.items.filter((i) => !pick.el.contains(i.el));
      if (range && last && last.el.isConnected) {
        // Shift-click: everything between the last selected message and this one.
        for (const el of this.between(last.el, pick.el)) {
          if (!this.items.some((i) => i.el === el || i.el.contains(el))) this.items.push({ leaf: el, el });
        }
      }
      this.items.push(pick);
    }
    this.scheduleFreeze();
    this.renderBar();
  }

  private fetchSheet = (url: string) =>
    send<{ text: string }>({ type: "sheet:fetch", url }).then(
      (r) => (r.ok ? r.text : null),
      () => null,
    );

  /**
   * Tamper checks, then the clone, for elements that are on the page now.
   * The page guard is told which elements are meant by a throw-away attribute
   * (elements can't be passed between the two script worlds).
   */
  private async checkedSnapshot(targets: Element[]): Promise<{ report: TamperReport; snap: Snapshot | null }> {
    const mark = `data-st-${crypto.randomUUID().replace(/-/g, "")}`;
    for (const t of targets) t.setAttribute(mark, "");
    try {
      const guard = await queryGuard(mark);
      // --- Same task from here to the end of buildSnapshot: check, then clone. ---
      let report = runChecksAll(targets, guard);
      let snap = report.allPassed ? buildSnapshot(targets) : null;
      // --------------------------------------------------------------------------
      if (snap) {
        // Ask again: a change made between the first answer and the clone is
        // reported to the guard a moment later and would otherwise be missed.
        const after = runChecksAll(targets, await queryGuard(mark));
        if (!after.allPassed) {
          report = after;
          snap = null;
        }
      }
      return { report, snap };
    } finally {
      for (const t of targets) t.removeAttribute(mark);
    }
  }

  /** Shortly after the selection changes, copy whatever in it has not been copied yet. */
  private scheduleFreeze() {
    if (this.kind !== "facebook_message") return;
    clearTimeout(this.freezeTimer);
    this.freezeTimer = window.setTimeout(() => this.freeze(), 60);
  }

  private freeze() {
    const pending = this.items.filter((i) => !i.frozen && i.el.isConnected);
    if (!pending.length || !this.picking) return;
    const frozen: Frozen = { snap: null, report: { checks: [], allPassed: false }, ready: Promise.resolve() };
    for (const item of pending) {
      item.frozen = frozen;
      item.frozenEl = item.el;
      item.order = orderKey(item.el);
      item.key = messageKey(item.el);
    }
    // One pass over the page's style sheets for the whole batch.
    frozen.ready = this.checkedSnapshot(pending.map((i) => i.el))
      .then(async ({ report, snap }) => {
        frozen.report = report;
        frozen.snap = snap;
        if (snap) await readUnreadSheets(snap, this.fetchSheet);
      })
      .catch(() => {});
  }

  /** A selected message the page unloaded and has since loaded again is a new element: find it. */
  private reassociate() {
    for (const item of this.items) {
      if (item.el.isConnected || !item.key) continue;
      const again = document.querySelector(`[data-message-id="${window.CSS.escape(item.key)}"]`);
      const row = again?.closest(MESSAGE_ROW) ?? again;
      if (row && !this.items.some((i) => i.el === row)) item.el = row;
    }
  }

  /** Message rows of the conversation with the most loaded messages (there can be several chats open). */
  private loadedMessages(): Element[] {
    let rows = [...document.querySelectorAll('[data-pagelet="MWMessageRow"]')];
    if (!rows.length) rows = [...document.querySelectorAll('[role="main"] [role="row"]')];
    const groups = new Map<Element, Element[]>();
    for (const row of rows) {
      if (row.getBoundingClientRect().height === 0) continue;
      const list = row.closest('[data-pagelet$="MessageList"], [role="grid"], [role="main"]') ?? document.body;
      groups.set(list, [...(groups.get(list) ?? []), row]);
    }
    return [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  }

  private selectAll(rows: Element[]) {
    const first = rows[0];
    const last = rows[rows.length - 1];
    // Everything from the first to the last row, including date dividers between them.
    const all = [first, ...this.between(first, last), last];
    this.items = all.filter((el, i) => all.indexOf(el) === i).map((el) => ({ leaf: el, el }));
    this.scheduleFreeze();
    this.renderBar();
  }

  private async diagnose() {
    const targets = this.items.map((i) => i.el).filter((el) => el.isConnected);
    if (!targets.length) return;
    this.host.remove(); // keep our own toolbar out of the description
    try {
      await saveDiagnostics(targets, this.kind, (url) =>
        send<{ text: string }>({ type: "sheet:fetch", url }).then(
          (r) => (r.ok ? r.text : null),
          () => null,
        ),
      );
    } finally {
      document.documentElement.appendChild(this.host);
    }
  }

  /** Widens or narrows the most recent selection by one level. */
  private resize(wider: boolean) {
    const item = this.items[this.items.length - 1];
    if (!item) return;
    if (wider) {
      const parent = item.el.parentElement;
      if (!parent || parent === document.body || parent === document.documentElement) return;
      item.el = parent;
      item.frozen = undefined;
      this.items = this.items.filter((i) => i === item || !parent.contains(i.el));
    } else {
      if (item.el === item.leaf) return;
      const child = [...item.el.children].find((c) => c.contains(item.leaf));
      if (child) {
        item.el = child;
        item.frozen = undefined;
      }
    }
    this.scheduleFreeze();
    this.renderBar();
  }

  // ---- Toolbar and outlines ----

  private renderBar() {
    const messages = this.kind === "facebook_message";
    const n = this.items.length;
    const setKind = (k: Kind) => () => {
      this.kind = k;
      this.items = [];
      this.renderBar();
    };
    const post = button("A post", "", setKind("facebook_post"));
    const chat = button("Messages", "", setKind("facebook_message"));
    post.setAttribute("aria-pressed", String(!messages));
    chat.setAttribute("aria-pressed", String(messages));

    const text = h(
      "p",
      {},
      messages
        ? "Click each message you want to keep. Shift-click selects everything in between."
        : "Click the post you want to keep. If only part of it is outlined, choose Wider.",
      h(
        "small",
        {},
        messages
          ? "Only messages loaded on screen can be captured, so scroll up to load more first. For conversations you took part in."
          : "Click a selection again to remove it. Hold Alt to pick the exact element. Press Esc to cancel.",
      ),
    );

    const last = this.items[n - 1];
    const dock = this.docks[this.kind] ?? DEFAULT_DOCK[this.kind];
    const move = button(dock === "top" ? "Move to bottom" : "Move to top", "ghost", () => {
      this.docks = { ...this.docks, [this.kind]: dock === "top" ? "bottom" : "top" };
      void chrome.storage.local.set({ [DOCK_KEY]: this.docks });
      this.renderBar();
    });
    move.title = "Move this bar out of the way. Anything it covers can't be selected.";
    const adjust = h(
      "div",
      { class: "group" },
      button("Wider", "secondary", () => this.resize(true), !last),
      button("Narrower", "secondary", () => this.resize(false), !last || last.el === last.leaf),
    );
    // Once something is selected the instructions have done their job: the bar shrinks to
    // one row so it covers as little of the page as possible.
    const slim = n > 0;
    const bar = h("div", { class: `bar ${dock}${slim ? " slim" : ""}`, role: "dialog", "aria-label": "Escapture capture" });
    if (slim) {
      const count = h("p", { class: "count", "aria-live": "polite" }, messages ? `${n} selected` : "Post selected");
      count.title = messages
        ? "Click a message to add it, or a selected one to remove it. Shift-click selects everything in between."
        : "Click the post again to remove the selection. Hold Alt to pick the exact element.";
      bar.append(count, adjust, move);
    } else {
      bar.append(text, h("div", { class: "seg", role: "group", "aria-label": "What are you capturing?" }, post, chat), move);
    }
    if (messages && n === 0) {
      // Selecting every loaded message, one by one, instead of the pane around them: the pane's
      // size depends on the page around it and comes out blank on its own.
      const rows = this.loadedMessages();
      if (rows.length > 1) bar.append(button(`Select all ${rows.length} loaded messages`, "soft", () => this.selectAll(rows)));
    }
    if (n > 0) {
      // Support tool: saves how the selection is built and styled, without its content.
      const diag = button("Save diagnostics", "ghost", () => void this.diagnose());
      diag.title = "Saves a file describing the layout and styling of your selection, without any text, names or images. Send it to Escapture support when a capture looks wrong.";
      bar.append(diag);
    }
    const label = n === 0 ? "Capture" : messages ? `Capture ${n} ${n === 1 ? "message" : "messages"}` : "Capture this post";
    bar.append(
      h(
        "div",
        { class: "group" },
        button("Cancel", "ghost", this.close),
        ...(n > 0 ? [button(label, "primary", () => void this.capture(this.items))] : []),
      ),
    );
    this.ui.replaceChildren(bar);

    this.selBoxes.replaceChildren(...this.items.map(() => h("div", { class: "sel" })));
    this.reposition();
  }

  private place(box: HTMLElement, el: Element | null) {
    if (!el?.isConnected) {
      box.style.display = "none";
      return;
    }
    const r = el.getBoundingClientRect();
    Object.assign(box.style, { display: "block", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  }

  private reposition = () => {
    if (!this.picking) return;
    if (performance.now() - this.lastReassociate > 400) {
      this.lastReassociate = performance.now();
      this.reassociate();
    }
    [...this.selBoxes.children].forEach((box, i) => this.place(box as HTMLElement, this.items[i]?.el ?? null));
    const hovered = this.hover && !this.items.some((i) => i.el === this.hover) ? this.hover : null;
    this.place(this.hoverBox, hovered);
  };

  // ---- Events ----

  private onMove = (e: MouseEvent) => {
    this.hover = this.isOurs(e) ? null : (this.pickAt(e)?.el ?? null);
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
    const pick = this.pickAt(e);
    if (pick) this.select(pick, e.shiftKey);
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.close();
    else if (e.key === "Enter" && this.items.length && !this.isOurs(e)) void this.capture(this.items);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  // ---- Capture ----

  private panel(title: string, ...children: (Node | string)[]) {
    const closeBtn = button("Close", "ghost", this.close);
    const panel = h("div", { class: "panel", role: "status", "aria-live": "polite" }, h("h2", {}, title), ...children);
    this.ui.replaceChildren(panel);
    return { panel, closeBtn };
  }

  private async report(result: LastCapture) {
    await send({ type: "capture:result", result }).catch(() => {});
  }

  private async capture(chosen: Item[]) {
    const live = chosen.filter((i) => i.el.isConnected);
    // Selected earlier, since unloaded by the page: use the copy taken when they were selected.
    const gone = chosen.filter((i) => !i.el.isConnected && i.frozen);
    // Still-attached items only, outermost only, in page order.
    const liveEls = live.map((i) => i.el);
    const targets = liveEls.filter((el, i) => liveEls.indexOf(el) === i && !liveEls.some((o) => o !== el && o.contains(el))).sort(inDocumentOrder);
    if (targets.length + gone.length === 0) return;
    const kind = this.kind;
    this.stopPicking();
    clearTimeout(this.freezeTimer);
    // Take our own UI out of the page before reading it.
    this.host.remove();
    const clientCapturedAt = new Date().toISOString();

    let report: TamperReport;
    let snap: Snapshot | null;
    if (gone.length === 0) {
      ({ report, snap } = await this.checkedSnapshot(targets));
    } else {
      await Promise.all(gone.map((i) => i.frozen!.ready));
      const batches = [...new Set(gone.map((i) => i.frozen!))];
      const fresh = targets.length ? await this.checkedSnapshot(targets) : null;
      report = mergeReports([...(fresh ? [fresh.report] : []), ...batches.map((b) => b.report).filter((r) => r.checks.length)]);
      snap = null;
      if (report.allPassed && (!fresh || fresh.snap) && batches.every((b) => b.snap)) {
        if (fresh?.snap) await readUnreadSheets(fresh.snap, this.fetchSheet);
        snap = mergeSnapshots([
          ...(fresh?.snap ? [{ snap: fresh.snap, units: targets.map((el) => ({ el, order: orderKey(el) })) }] : []),
          ...batches.map((b) => ({ snap: b.snap!, units: gone.filter((i) => i.frozen === b).map((i) => ({ el: i.frozenEl!, order: i.order! })) })),
        ]);
      }
    }
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

    // Style sheets the page would not let us read are fetched by the background worker.
    await loadStyles(snap, (url) =>
      send<{ text: string }>({ type: "sheet:fetch", url }).then(
        (r) => (r.ok ? r.text : null),
        () => null,
      ),
    );
    const tamperReport: TamperReport = {
      ...report,
      size: { width: Math.max(1, Math.round(snap.width)), height: Math.max(1, Math.round(snap.height)) },
    };

    // Embed images through the background worker, a few at a time, each at
    // the size it is shown on the page. If the result is over the upload
    // limit, embed them again smaller before giving up.
    const meta = { sourceUrl: location.href, clientCapturedAt, kind };
    const cache = new Map<string, Promise<string | null>>();
    const fetchOne = (url: string, maxWidth: number | undefined, quality: number) => {
      let abs = url;
      try {
        abs = new URL(url, location.href).href;
      } catch {}
      const key = `${abs}|${maxWidth ?? "raw"}|${quality}`;
      if (!cache.has(key)) {
        cache.set(
          key,
          send<{ dataUrl: string }>({ type: "image:fetch", url: abs, maxWidth, quality }).then(
            (r) => (r.ok ? r.dataUrl : null),
            () => null,
          ),
        );
      }
      return cache.get(key)!;
    };
    const embed = async (level: { maxWidth: number; quality: number }) => {
      const queue = [...snap.images];
      await Promise.all(
        Array.from({ length: 6 }, async () => {
          for (let job = queue.shift(); job; job = queue.shift()) {
            // Twice the shown width keeps images sharp on high-density screens.
            const maxWidth =
              job.displayWidth === undefined
                ? undefined
                : Math.min(level.maxWidth, Math.max(48, Math.ceil(job.displayWidth * 2)));
            job.apply(await fetchOne(job.url, maxWidth, level.quality));
          }
        }),
      );
      return serialize(snap, meta);
    };

    // Two limits: the stored file, and the compressed upload.
    const measure = async (text: string) => {
      const raw = new TextEncoder().encode(text);
      return { raw: raw.byteLength, packed: (await gzip(raw)).byteLength };
    };
    const fits = (m: { raw: number; packed: number }) => m.raw <= MAX_BYTES && m.packed <= MAX_UPLOAD_BYTES;
    let html = await embed(DEFAULT_LEVEL);
    let measured = await measure(html);
    for (const level of SHRINK_LEVELS) {
      if (fits(measured) || snap.images.length === 0) break;
      html = await embed(level);
      measured = await measure(html);
    }
    if (!fits(measured)) {
      const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
      const parts = sizeBreakdown(html);
      const message =
        `This capture is too large to upload (${mb(measured.packed)} MB compressed, and the limit is ${mb(MAX_UPLOAD_BYTES)} MB). ` +
        `Images take ${mb(parts.images)} MB, text and layout ${mb(parts.markup + parts.styles)} MB before compression. ` +
        (targets.length > 1 ? "Select fewer items and capture the rest separately." : "Select a smaller area.");
      const { panel, closeBtn } = this.panel("Not captured", h("p", { class: "note attention" }, message));
      panel.append(h("div", { class: "row" }, closeBtn));
      await this.report({ ok: false, refused: true, message, at: clientCapturedAt });
      return;
    }

    // How tall the finished capture is in the viewer, so the viewer can fit itself to it.
    const heights = await send<{ fit: { w: number; h: number }[] }>({ type: "capture:measure", html }).catch(() => null);
    if (heights?.ok && tamperReport.size) tamperReport.size.fit = heights.fit;

    const reply = await send<{ result: LastCapture }>({
      type: "capture:upload",
      html,
      kind,
      sourceUrl: location.href,
      clientCapturedAt,
      tamperReport,
    }).catch((): Reply<{ result: LastCapture }> => ({ ok: false, error: "The extension stopped responding. Reload the page and try again." }));

    const result: LastCapture = reply.ok ? reply.result : { ok: false, refused: false, message: reply.error, at: clientCapturedAt };
    if (result.ok) {
      const open = h("a", { class: "btn primary", href: result.url, target: "_blank", rel: "noopener" }, "Open in vault");
      const { panel, closeBtn } = this.panel(
        "Saved to your vault",
        h("span", { class: "chip" }, "Tamper checked"),
        h("p", {}, result.label),
      );
      panel.append(h("div", { class: "row" }, closeBtn, open));
    } else {
      const { panel, closeBtn } = this.panel("Not saved", h("p", { class: "note attention" }, result.message));
      const retry = button("Try again", "primary", () => {
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
