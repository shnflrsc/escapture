// SingleFile-style snapshot, simplified. The selection is cloned with its own
// class names, and only the page's stylesheet rules that apply to it are kept
// ("tree-shaking"). Images are embedded as data URIs and everything active is
// stripped. Nothing in the result loads from the network or runs.
import type { Kind } from "../shared/types";
import { isComposer } from "./checks";

const REMOVE = new Set([
  "SCRIPT", "STYLE", "LINK", "META", "BASE", "IFRAME", "FRAME", "FRAMESET", "OBJECT", "EMBED",
  "NOSCRIPT", "TEMPLATE", "AUDIO", "SOURCE", "TRACK", "PORTAL",
]);

// Inherited from outside the selection, so they are copied onto the wrapper.
const INHERITED_CONTEXT = [
  "color", "direction", "font-family", "font-size", "font-style", "font-weight", "font-stretch",
  "font-variant-caps", "letter-spacing", "line-height", "list-style-type", "text-align", "text-indent",
  "text-transform", "text-rendering", "white-space-collapse", "text-wrap-mode", "word-break",
  "overflow-wrap", "word-spacing", "-webkit-font-smoothing", "writing-mode",
];

// When several separate items are selected, the containers between them are
// kept only as plain structure. Their own sizing and positioning (often used
// by virtualised lists) would leave large gaps once the other items are gone.
const CONTAINER_PROPS = ["display", "flex-direction", "flex-wrap", "align-items", "justify-content", "row-gap", "column-gap"];

// Rules for states that can't exist in a frozen copy are left out.
const DYNAMIC = /:(hover|active|focus|focus-visible|focus-within|visited|target)\b/;
const PSEUDO_ELEMENT = /(::?(before|after|first-line|first-letter)|::(placeholder|marker))$/;
const OTHER_PSEUDO_ELEMENT = /::[a-zA-Z-]+(\([^)]*\))?$/;
// Selectors where a missing class does not rule out a match.
const NEGATING = /:(not|is|where|has)\(/;
const CLASS_TOKEN = /\.(-?[_a-zA-Z][\w-]*)/g;
const URL_IN_CSS = /url\((["']?)(.*?)\1\)/g;
const VAR_REF = /var\(\s*(--[\w-]+)/g;
// 1x1 transparent GIF, used where an image could not be fetched.
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

/**
 * `displayWidth` is how wide the image is shown, in CSS pixels, so it can be
 * embedded at that size. It is unset for CSS images, which may be sprite
 * sheets and must keep their real dimensions. `apply` may be called again
 * with a smaller version of the same image.
 */
export type PendingImage = { url: string; displayWidth?: number; apply: (dataUrl: string | null) => void };

/** One selector of one stylesheet rule that applies to something in the selection. */
type Candidate = {
  order: number; // position in the cascade
  base: string; // selector without its pseudo-element
  pseudo: string; // "::before", or ""
  decl: string; // the rule's declarations
  matched: Element[]; // cloned elements it applied to on the live page
};

export type Snapshot = {
  root: Element;
  images: PendingImage[];
  width: number;
  /** Height of the captured area on the page, and of each selected item (for merged captures). */
  height: number;
  heights: Map<Element, number>;
  background: string;
  /** Background of the nearest painted element around the selection, for the wrapper. */
  backdrop: string;
  /**
   * The same, measured from the first selected ITEM rather than from the copied root. When
   * several items are selected the root is their common container, which may itself be what
   * paints behind them; a merged capture drops that container and needs this instead.
   */
  itemBackdrop: string;
  /** Style sheets the page would not let us read directly. See loadStyles. */
  unreadSheets: { href: string; index: number }[];
  warnings: string[];
  // Internal state between buildSnapshot, loadStyles and serialize.
  candidates: Candidate[];
  cloneOf: Map<Element, Element>;
  live: { top: Element; extras: Element[]; classes: Set<string> };
  context: Map<string, string>; // inline declarations for the wrapper
  cssImages: Map<string, string | null>;
  css: string;
};

/**
 * The background an element paints, as declarations, or "" if it paints none.
 * Images that would have to be fetched are left out; gradients are kept, with
 * how they are attached (Messenger draws one gradient behind a whole
 * conversation and lets it show through the sender's bubbles).
 */
function paintOf(cs: CSSStyleDeclaration): string {
  const color = cs.backgroundColor;
  const image = cs.backgroundImage;
  const hasColor = Boolean(color) && color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color);
  const hasImage = Boolean(image) && image !== "none" && !image.includes("url(");
  if (!hasColor && !hasImage) return "";
  const parts: string[] = [];
  if (hasColor) parts.push(`background-color:${color}`);
  if (hasImage) {
    parts.push(
      `background-image:${image}`,
      `background-attachment:${cs.backgroundAttachment}`,
      `background-size:${cs.backgroundSize}`,
      `background-position:${cs.backgroundPosition}`,
      `background-repeat:${cs.backgroundRepeat}`,
    );
  }
  return parts.join(";");
}

/** Short CSS class names: a, b, ... Z, aa, ab, ... Most-used classes get the shortest. */
function shortName(i: number): string {
  const first = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const rest = first + "0123456789";
  let name = first[i % first.length];
  for (i = Math.floor(i / first.length); i > 0; i = Math.floor((i - 1) / rest.length)) name += rest[(i - 1) % rest.length];
  return name;
}

/** A box that takes no space and shows nothing: tracking pixels, anti-scraping filler, collapsed menus. */
function takesNoSpace(o: Element, cs: CSSStyleDeclaration): boolean {
  if (!(o instanceof HTMLElement) || o.tagName === "BR" || o.tagName === "WBR" || cs.display === "contents") return false;
  const zero = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.width === 0 && r.height === 0;
  };
  if (!zero(o)) return false;
  // A zero-size box can still draw something: generated content, a shadow or an outline.
  const draws = (el: Element) => {
    for (const pseudo of ["::before", "::after"]) {
      const content = getComputedStyle(el, pseudo).content;
      if (content !== "none" && content !== "normal") return true;
    }
    const s = el === o ? cs : getComputedStyle(el);
    return s.boxShadow !== "none" || (s.outlineStyle !== "none" && s.outlineWidth !== "0px");
  };
  // Text can spill out of a zero-size box unless the box clips it.
  if (o.textContent?.trim() && cs.overflowX === "visible") return false;
  const inner = o.querySelectorAll("*");
  return inner.length <= 300 && !draws(o) && [...inner].every((el) => zero(el) && !draws(el));
}

function placeholder(doc: Document, width: number, height: number): HTMLElement {
  const span = doc.createElement("span");
  span.textContent = "Image unavailable";
  span.setAttribute(
    "style",
    `display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;` +
      `width:${Math.max(120, Math.round(width))}px;height:${Math.max(32, Math.round(height))}px;max-width:100%;` +
      `background:#EFF4F7;border:1px dashed #7690A0;color:#55646E;font:13px/18px system-ui,sans-serif;`,
  );
  return span;
}

/** Strips everything except what the copy needs. `class` is kept: the kept style rules refer to it. */
function sanitizeAttributes(el: Element) {
  // SVG ids are kept: gradients, clip paths and <use> refer to them.
  const svg = el.namespaceURI === "http://www.w3.org/2000/svg";
  const isLink = el.tagName.toLowerCase() === "a";
  const linkLabel = isLink ? el.getAttribute("aria-label") : null;
  for (const attr of [...el.attributes]) {
    const name = attr.name.toLowerCase();
    if (name === "class" || (svg && name === "id")) continue;
    if (
      name.startsWith("on") ||
      name.startsWith("data-") ||
      name.startsWith("aria-") ||
      name === "id" || name === "srcset" || name === "sizes" || name === "nonce" ||
      name === "integrity" || name === "contenteditable" || name === "action" || name === "formaction" ||
      name === "ping" || name === "target" || name === "srcdoc" || name === "loading" || name === "tabindex" ||
      name === "autofocus" || name === "style" || name === "role"
    ) {
      el.removeAttribute(attr.name);
    }
  }
  if (isLink) {
    const href = el.getAttribute("href") ?? el.getAttribute("xlink:href");
    el.removeAttribute("xlink:href");
    let safe: string | null = null;
    try {
      const u = href ? new URL(href, location.href) : null;
      if (u && (u.protocol === "https:" || u.protocol === "http:")) {
        // Facebook appends long tracking parameters to every link.
        for (const key of [...u.searchParams.keys()]) if (key.startsWith("__") || key === "fbclid") u.searchParams.delete(key);
        safe = u.href;
      }
    } catch {}
    // Links never leave the capture: the real address is taken off, so captured content can
    // never take the viewer anywhere. Where the link pointed is kept as plain text (a tooltip
    // here, and the panel that serialize adds, shown when the link is clicked).
    el.removeAttribute("href");
    el.removeAttribute("rel");
    if (safe) {
      el.setAttribute("data-href", safe);
      if (!el.hasAttribute("title")) el.setAttribute("title", safe);
      if (linkLabel) el.setAttribute("data-label", linkLabel.slice(0, 80));
    }
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement || el instanceof HTMLTextAreaElement) {
    el.setAttribute("disabled", "");
  }
}

/** An SVG <image>: embedded like any other picture, at the size it is shown. */
function embedSvgImage(snap: Snapshot, o: SVGImageElement, c: Element) {
  const url = o.href.baseVal;
  c.removeAttribute("xlink:href");
  c.removeAttribute("href");
  if (url.startsWith("data:image/")) c.setAttribute("href", url);
  else if (url) {
    snap.images.push({
      url,
      displayWidth: o.getBoundingClientRect().width,
      apply: (dataUrl) => {
        if (dataUrl) c.setAttribute("href", dataUrl);
        else c.removeAttribute("href");
      },
    });
  }
}

/**
 * The accessible label of an element, when the page keeps it somewhere
 * outside the selection (Facebook does this for timestamps). It is kept as a
 * tooltip, so the plain text survives however the page draws it.
 */
function outsideLabel(o: Element, top: Element): string | null {
  const ids = o.getAttribute("aria-labelledby");
  if (!ids) return null;
  const text = ids
    .split(/\s+/)
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => Boolean(el) && !top.contains(el))
    .map((el) => el.textContent?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
  return text && text.length <= 200 ? text : null;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const ID_REF = /url\(["']?#([^"')]+)["']?\)/g;

/**
 * SVG can draw something defined elsewhere on the page: <use href="#id">, or
 * mask="url(#id)". Facebook draws feed timestamps this way, with the text kept
 * in a shared block outside the post. Anything the selection points to that
 * is not inside it is copied into a hidden holder so the reference still works.
 */
function includeReferenced(snap: Snapshot) {
  const { top } = snap.live;
  const wanted = new Set<string>();
  for (const el of [snap.root, ...snap.root.querySelectorAll("*")]) {
    if (el.namespaceURI !== SVG_NS) continue;
    for (const attr of el.attributes) {
      if ((attr.name === "href" || attr.name === "xlink:href") && attr.value.startsWith("#")) wanted.add(attr.value.slice(1));
      else for (const m of attr.value.matchAll(ID_REF)) wanted.add(m[1]);
    }
  }
  let holder: Element | null = null;
  for (const id of wanted) {
    const original = document.getElementById(id);
    if (!original || original.namespaceURI !== SVG_NS || top.contains(original) || original.contains(top)) continue;
    if (original.querySelectorAll("*").length > 500) continue; // a whole sprite sheet, not a single item
    const copy = original.cloneNode(true) as Element;
    const originals = [original, ...original.querySelectorAll("*")];
    const copies = [copy, ...copy.querySelectorAll("*")];
    originals.forEach((o, i) => {
      const c = copies[i];
      if (REMOVE.has(o.tagName.toUpperCase())) return c.remove();
      sanitizeAttributes(c);
      if (o instanceof SVGImageElement) embedSvgImage(snap, o, c);
      snap.cloneOf.set(o, c);
    });
    if (!holder) {
      holder = document.createElementNS(SVG_NS, "svg");
      holder.setAttribute("width", "0");
      holder.setAttribute("height", "0");
      holder.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
      snap.root.appendChild(holder);
    }
    holder.appendChild(copy);
    snap.live.extras.push(original);
  }
}

/** Lowest element that contains every target. */
function commonAncestor(targets: Element[]): Element {
  let root: Element = targets[0];
  for (const t of targets) while (!root.contains(t)) root = root.parentElement ?? document.documentElement;
  return root;
}

/** Splits "a, b:is(c, d), e" at top-level commas only. */
function splitSelectors(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      out.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(text.slice(start).trim());
  return out.filter(Boolean);
}

const absoluteUrls = (css: string, base: string) =>
  css.replace(URL_IN_CSS, (whole, _q, url: string) => {
    if (url.startsWith("data:") || url.startsWith("#")) return whole;
    try {
      return `url("${new URL(url, base).href}")`;
    } catch {
      return whole;
    }
  });

/**
 * Walks a style sheet and records every rule that applies to something in the
 * selection, tested against the live page so ancestors outside the selection
 * (themes, layout modes) count.
 */
function collectRules(snap: Snapshot, rules: CSSRuleList, sheetIndex: number, base: string) {
  const { top, extras, classes } = snap.live;
  let n = 0;
  const walk = (list: CSSRuleList) => {
    for (const rule of list) {
      if (rule instanceof CSSStyleRule) {
        const decl = rule.style.cssText;
        if (!decl) continue;
        let resolved: string | null = null;
        const order = sheetIndex * 1e6 + n++;
        for (const selector of splitSelectors(rule.selectorText)) {
          if (DYNAMIC.test(selector)) continue;
          const pseudo = selector.match(PSEUDO_ELEMENT)?.[0] ?? "";
          if (!pseudo && OTHER_PSEUDO_ELEMENT.test(selector)) continue; // scrollbars, selection colours
          const baseSel = (pseudo ? selector.slice(0, -pseudo.length) : selector).trim() || "*";
          // Cheap rejection: a class the page does not use anywhere near the selection.
          if (!NEGATING.test(baseSel)) {
            let absent = false;
            for (const m of baseSel.matchAll(CLASS_TOKEN)) if (!classes.has(m[1])) absent = true;
            if (absent) continue;
          }
          const found: Element[] = [];
          try {
            for (const root of [top, ...extras]) {
              if (root.matches(baseSel)) found.push(root);
              found.push(...root.querySelectorAll(baseSel));
            }
          } catch {
            continue;
          }
          const matched = found.map((o) => snap.cloneOf.get(o)).filter((c): c is Element => Boolean(c));
          if (!matched.length) continue;
          resolved ??= absoluteUrls(decl, base);
          snap.candidates.push({ order, base: baseSel, pseudo, decl: resolved, matched });
        }
      } else if (rule instanceof CSSMediaRule) {
        // Frozen at the size the page had when it was captured.
        if (window.matchMedia(rule.media.mediaText).matches) walk(rule.cssRules);
      } else if (rule instanceof CSSSupportsRule) {
        if (CSS.supports(rule.conditionText)) walk(rule.cssRules);
      } else if (rule instanceof CSSImportRule) {
        try {
          if (rule.styleSheet) walk(rule.styleSheet.cssRules);
        } catch {}
      } else if (rule.constructor.name === "CSSLayerBlockRule") {
        walk((rule as CSSGroupingRule).cssRules);
      }
      // @font-face and @keyframes are left out: no fonts are embedded and
      // nothing animates in a frozen copy.
    }
  };
  walk(rules);
}

/** Values of the CSS variables the kept rules use, as they resolve on the selection. */
function resolveVariables(snap: Snapshot, texts: Iterable<string>) {
  const cs = getComputedStyle(snap.live.top);
  for (const text of texts) {
    for (const m of text.matchAll(VAR_REF)) {
      if (snap.context.has(m[1])) continue;
      const value = cs.getPropertyValue(m[1]).trim();
      if (value && !/url\(/.test(value)) snap.context.set(m[1], value);
    }
  }
}

/**
 * Builds the frozen clone synchronously (call right after the tamper checks,
 * in the same task). Images still to embed are returned for async fetching.
 *
 * With one target the clone is that element. With several (for example a few
 * chosen messages), the clone is their common container with everything that
 * was not selected removed, so the items keep their order and layout.
 */
export function buildSnapshot(targets: Element[]): Snapshot {
  const top = targets.length === 1 ? targets[0] : commonAncestor(targets);
  const selected = new Set(targets);
  // Containers between the common ancestor and the selected items.
  const scaffolding = new Set<Element>();
  if (targets.length > 1) {
    for (const t of targets) for (let el = t.parentElement; el && top.contains(el); el = el.parentElement) scaffolding.add(el);
    scaffolding.add(top);
  }

  const clone = top.cloneNode(true) as Element;
  const originals = [top, ...top.querySelectorAll("*")];
  const clones = [clone, ...clone.querySelectorAll("*")];
  const remove: Element[] = [];
  const snap: Snapshot = {
    root: clone,
    images: [],
    width: Math.max(...targets.map((t) => t.getBoundingClientRect().width)),
    height: targets.reduce((sum, t) => sum + t.getBoundingClientRect().height, 0),
    heights: new Map(targets.map((t) => [t, t.getBoundingClientRect().height])),
    background: "#ffffff",
    backdrop: "",
    itemBackdrop: "",
    unreadSheets: [],
    warnings: [],
    candidates: [],
    cloneOf: new Map(),
    live: { top, extras: [], classes: new Set() },
    context: new Map(),
    cssImages: new Map(),
    css: "",
  };
  const inlineTexts: string[] = [];

  let skipped: Element | null = null;
  let inside: Element | null = null; // the selected item currently being walked

  for (let i = 0; i < originals.length; i++) {
    const o = originals[i];
    const c = clones[i];
    if (skipped?.contains(o)) continue;
    if (inside && !inside.contains(o)) inside = null;
    if (!inside && selected.has(o)) inside = o;
    const isScaffold = !inside && scaffolding.has(o);

    const tag = o.tagName.toUpperCase();
    const unselected = targets.length > 1 && !inside && !isScaffold;
    const cs = unselected || REMOVE.has(tag) ? null : getComputedStyle(o);
    // Elements that are not rendered are not part of what was on screen.
    if (!cs || (cs.display === "none" && o !== top)) {
      remove.push(c);
      skipped = o;
      continue;
    }
    if (o !== top && !isScaffold && !selected.has(o) && takesNoSpace(o, cs)) {
      remove.push(c);
      skipped = o;
      continue;
    }

    const authored = o.getAttribute("style") ?? "";
    const label = outsideLabel(o, top);
    sanitizeAttributes(c);
    if (label) c.setAttribute("title", label);

    if (isScaffold) {
      // Plain structure only: no page classes, just how its children are laid out.
      c.removeAttribute("class");
      const layout = CONTAINER_PROPS.map((p) => [p, cs.getPropertyValue(p)])
        .filter(([p, v]) => v && v !== "normal" && !(p === "display" && v === "block") && !(p === "flex-direction" && v === "row") && v !== "nowrap")
        .map(([p, v]) => `${p}:${v}`);
      // ...and what it paints behind them: the selected items may be see-through in places.
      const paint = paintOf(cs);
      if (paint) layout.push(paint);
      if (layout.length) c.setAttribute("style", layout.join(";"));
      continue;
    }
    snap.cloneOf.set(o, c);

    const rect = o.getBoundingClientRect();
    if (o instanceof HTMLImageElement) {
      const url = o.currentSrc || o.src;
      c.removeAttribute("src");
      if (url.startsWith("data:image/")) c.setAttribute("src", url);
      else if (url) {
        let node: Element = c;
        snap.images.push({
          url,
          displayWidth: rect.width,
          apply: (dataUrl) => {
            if (dataUrl) c.setAttribute("src", dataUrl);
            else if (node === c) {
              node = placeholder(document, rect.width, rect.height);
              c.replaceWith(node);
            }
          },
        });
      }
    } else if (o instanceof SVGImageElement) {
      embedSvgImage(snap, o, c);
    } else if (o instanceof HTMLCanvasElement) {
      let data: string | null = null;
      try {
        data = o.toDataURL("image/webp", 0.8);
      } catch {}
      const img = document.createElement("img");
      if (data) img.setAttribute("src", data);
      img.setAttribute("class", o.getAttribute("class") ?? "");
      img.setAttribute("style", `width:${Math.round(rect.width)}px;height:${Math.round(rect.height)}px`);
      const replacement = data ? img : placeholder(document, rect.width, rect.height);
      c.replaceWith(replacement);
      if (data) snap.cloneOf.set(o, img);
      else snap.cloneOf.delete(o);
      skipped = o;
      continue;
    } else if (o instanceof HTMLVideoElement) {
      c.replaceWith(placeholder(document, rect.width, rect.height));
      snap.cloneOf.delete(o);
      skipped = o;
      continue;
    }

    // Inline styles are kept. Anything they would load is embedded, and values
    // an animation was holding are pinned, since nothing animates in the copy.
    const extra: string[] = [];
    for (const animation of (o as HTMLElement).getAnimations?.() ?? []) {
      const frames = (animation.effect as KeyframeEffect | null)?.getKeyframes?.() ?? [];
      for (const frame of frames) {
        for (const key of Object.keys(frame)) {
          if (key === "offset" || key === "easing" || key === "composite" || key === "computedOffset") continue;
          const prop = key === "cssFloat" ? "float" : key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
          const value = cs.getPropertyValue(prop);
          if (value) extra.push(`${prop}:${value}`);
        }
      }
    }
    if (o === top && (cs.position === "fixed" || cs.position === "absolute" || cs.position === "sticky")) {
      // The selection sat on top of the page (a dialog); in the copy it is the page.
      extra.push("position:relative", "inset:auto", "margin:0", "transform:none");
    }
    if (authored || extra.length) {
      const urls = [...new Set([...authored.matchAll(URL_IN_CSS)].map((m) => m[2]).filter((u) => !u.startsWith("data:") && !u.startsWith("#")))];
      const embedded = new Map<string, string | null>();
      const render = () => {
        let value = authored;
        for (const url of urls) value = value.split(url).join(embedded.get(url) ?? BLANK);
        const text = [value.trim().replace(/;$/, ""), ...extra].filter(Boolean).join(";");
        if (text) c.setAttribute("style", text);
      };
      render();
      for (const url of urls) {
        snap.images.push({
          url,
          apply: (dataUrl) => {
            embedded.set(url, dataUrl);
            render();
          },
        });
      }
      inlineTexts.push(authored);
    }

    if (isComposer(o)) {
      // Whatever is typed in the composer is not part of the conversation.
      c.textContent = "";
      skipped = o;
    }
  }
  for (const el of remove) el.remove();
  includeReferenced(snap);

  // Class names in and around the selection, for cheap rule rejection.
  for (const o of [...originals, ...snap.live.extras.flatMap((e) => [e, ...e.querySelectorAll("*")])]) {
    for (const name of o.classList) snap.live.classes.add(name);
  }
  for (let el = top.parentElement; el; el = el.parentElement) for (const name of el.classList) snap.live.classes.add(name);

  // What the selection inherits from the page around it.
  const outer = getComputedStyle(top.parentElement ?? top);
  for (const prop of INHERITED_CONTEXT) {
    const value = outer.getPropertyValue(prop);
    if (value) snap.context.set(prop, value);
  }
  // Whatever the nearest element around the selection paints (colour or gradient)
  // goes on the wrapper, so see-through parts of the selection keep what was behind them.
  for (let el = top.parentElement; el; el = el.parentElement) {
    const paint = paintOf(getComputedStyle(el));
    if (paint) {
      snap.backdrop = paint;
      break;
    }
  }
  for (let el = targets[0].parentElement; el; el = el.parentElement) {
    const paint = paintOf(getComputedStyle(el));
    if (paint) {
      snap.itemBackdrop = paint;
      break;
    }
  }
  // The first non-transparent background behind the selection, so light text
  // captured from a dark page stays readable.
  for (let el: Element | null = targets[0]; el; el = el.parentElement) {
    const color = getComputedStyle(el).backgroundColor;
    if (color && color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color)) {
      snap.background = color;
      break;
    }
  }

  // The page's own style rules that apply to the selection.
  const sheets = [...document.styleSheets, ...document.adoptedStyleSheets];
  sheets.forEach((sheet, index) => {
    if (sheet.disabled) return;
    if (sheet.media.mediaText && !window.matchMedia(sheet.media.mediaText).matches) return;
    try {
      collectRules(snap, sheet.cssRules, index, sheet.href ?? document.baseURI);
    } catch {
      // A cross-origin sheet served without CORS headers can't be read here.
      if (sheet.href) snap.unreadSheets.push({ href: sheet.href, index });
    }
  });
  resolveVariables(snap, [...snap.candidates.map((c) => c.decl), ...inlineTexts]);
  return snap;
}

/**
 * Finishes the styles. Style sheets the page would not let us read are
 * fetched through the extension and matched against the page as it is now
 * (this affects appearance only: the content was frozen by buildSnapshot).
 * Then the kept rules are reduced to what the copy needs.
 */
export async function loadStyles(snap: Snapshot, fetchText: (url: string) => Promise<string | null>) {
  await readUnreadSheets(snap, fetchText);
  finalizeStyles(snap);
}

/** The first half of loadStyles: must run while the snapshot's elements are still on the page. */
export async function readUnreadSheets(snap: Snapshot, fetchText: (url: string) => Promise<string | null>) {
  let failed = 0;
  for (const { href, index } of snap.unreadSheets) {
    const text = await fetchText(href);
    if (text === null) {
      failed++;
      continue;
    }
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      const before = snap.candidates.length;
      collectRules(snap, sheet.cssRules, index, href);
      resolveVariables(snap, snap.candidates.slice(before).map((c) => c.decl));
    } catch {
      failed++;
    }
  }
  snap.unreadSheets = [];
  if (failed) {
    snap.warnings.push(
      `${failed} of the page's style sheets could not be read, so this capture may look different from the page. Its text is not affected.`,
    );
  }
}

/**
 * Joins items copied at different moments into one snapshot.
 *
 * Messenger keeps only a window of messages on the page and unloads the rest
 * as you scroll, so a long selection never exists on the page all at once.
 * Each part was copied (and checked) while its items were on the page; here
 * the chosen items are lifted out of their parts and put in reading order.
 * `order` is how far above the end of the conversation an item sat, so larger
 * means earlier. Call loadStyles on the result to finish it.
 */
export function mergeSnapshots(parts: { snap: Snapshot; units: { el: Element; order: number }[] }[]): Snapshot {
  const root = document.createElement("div");
  const units = parts
    .flatMap((p) => p.units.map((u) => ({ clone: p.snap.cloneOf.get(u.el), order: u.order })))
    .filter((u): u is { clone: Element; order: number } => Boolean(u.clone))
    .sort((a, b) => b.order - a.order);
  for (const u of units) root.appendChild(u.clone);

  // The same rule found by several parts becomes one rule again.
  const rules = new Map<string, Candidate>();
  for (const p of parts) {
    for (const c of p.snap.candidates) {
      const key = `${c.order}|${c.base}|${c.pseudo}|${c.decl}`;
      const known = rules.get(key);
      if (known) known.matched.push(...c.matched);
      else rules.set(key, { ...c, matched: [...c.matched] });
    }
  }
  const snaps = parts.map((p) => p.snap);
  const context = new Map<string, string>();
  for (const snap of [...snaps].reverse()) for (const [k, v] of snap.context) context.set(k, v); // first part wins
  return {
    root,
    images: snaps.flatMap((x) => x.images),
    width: Math.max(...snaps.map((x) => x.width)),
    height: parts.reduce((sum, p) => sum + p.units.reduce((n, u) => n + (p.snap.heights.get(u.el) ?? 0), 0), 0),
    heights: new Map(),
    background: snaps[0].background,
    backdrop: snaps.find((x) => x.itemBackdrop)?.itemBackdrop ?? "",
    itemBackdrop: "",
    unreadSheets: [],
    warnings: [...new Set(snaps.flatMap((x) => x.warnings))],
    candidates: [...rules.values()],
    cloneOf: new Map(snaps.flatMap((x) => [...x.cloneOf])),
    live: snaps[0].live,
    context,
    cssImages: new Map(),
    css: "",
  };
}

/** Removes wrappers that carry nothing: no class, no attributes, no rule, and exactly one element inside. */
function flatten(root: Element, styledByRule: Set<Element>) {
  const all = [...root.querySelectorAll("div, span")].reverse(); // innermost first
  for (const el of all) {
    if (el === root || !el.parentNode || el.attributes.length > 0 || styledByRule.has(el)) continue;
    const kids = [...el.childNodes].filter((n) => !(n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()));
    if (kids.length === 0) el.remove();
    else if (kids.length === 1 && kids[0].nodeType === Node.ELEMENT_NODE) el.replaceWith(kids[0]);
  }
}

/**
 * Decides how each kept rule is written in the copy, and shortens class names.
 *
 * A rule keeps its own selector when that selector picks exactly the same
 * elements inside the copy as it did on the page. Otherwise (it depended on
 * something outside the selection, or on an attribute that was stripped) the
 * elements it applied to get a generated class and the rule uses that.
 */
function finalizeStyles(snap: Snapshot) {
  const root = snap.root;
  const attached = (el: Element) => el === root || root.contains(el);
  const candidates = snap.candidates.sort((a, b) => a.order - b.order);

  flatten(root, new Set(candidates.flatMap((c) => c.matched)));

  type Kept = { order: number; decl: string; pseudo: string; base?: string; generated?: Element[]; pinned?: boolean };
  const kept: Kept[] = [];
  const referenced = new Set<string>(); // page classes the kept selectors use
  const pinnedNames = new Set<string>(); // ...which must keep their names
  for (const c of candidates) {
    const live = c.matched.filter(attached);
    if (!live.length) continue;
    let standalone: Element[] = [];
    try {
      standalone = [...root.querySelectorAll(c.base)];
      if (root.matches(c.base)) standalone.push(root);
    } catch {}
    const liveSet = new Set(live);
    if (standalone.length === liveSet.size && standalone.every((el) => liveSet.has(el))) {
      // Renaming is only attempted on selectors simple enough to rewrite safely.
      const pinned = /["'\\]|\[[^\]]*\./.test(c.base);
      for (const m of c.base.matchAll(CLASS_TOKEN)) (pinned ? pinnedNames : referenced).add(m[1]);
      kept.push({ order: c.order, decl: c.decl, pseudo: c.pseudo, base: c.base, pinned });
    } else {
      kept.push({ order: c.order, decl: c.decl, pseudo: c.pseudo, generated: [...liveSet] });
    }
  }
  for (const name of pinnedNames) referenced.delete(name);

  // Shortest names for the most used classes.
  const elements = [root, ...root.querySelectorAll("*")];
  const uses = new Map<string, number>();
  for (const el of elements) for (const name of el.classList) if (referenced.has(name)) uses.set(name, (uses.get(name) ?? 0) + 1);
  let next = 0;
  const fresh = () => {
    let name = shortName(next++);
    while (pinnedNames.has(name)) name = shortName(next++);
    return name;
  };
  const rename = new Map([...uses].sort((a, b) => b[1] - a[1]).map(([name]) => [name, fresh()]));

  const added = new Map<Element, string[]>();
  const rules: string[] = ["*,*::before,*::after{animation:none!important;transition:none!important}"];
  let previous: { order: number; decl: string; selectors: string[] } | null = null;
  const flush = () => {
    if (previous) rules.push(`${previous.selectors.join(",")}{${previous.decl}}`);
  };
  for (const k of kept) {
    let selector: string;
    if (k.base !== undefined) {
      selector = (k.pinned ? k.base : k.base.replace(CLASS_TOKEN, (whole, name: string) => `.${rename.get(name) ?? name}`)) + k.pseudo;
    } else {
      const name = fresh();
      for (const el of k.generated!) added.set(el, [...(added.get(el) ?? []), name]);
      selector = `.${name}${k.pseudo}`;
    }
    // Selectors of the same rule are written together.
    if (previous && previous.order === k.order && previous.decl === k.decl) previous.selectors.push(selector);
    else {
      flush();
      previous = { order: k.order, decl: k.decl, selectors: [selector] };
    }
  }
  flush();

  // Elements keep only the classes a kept rule uses.
  for (const el of elements) {
    const names = [
      ...[...el.classList].flatMap((name) => (pinnedNames.has(name) ? [name] : rename.has(name) ? [rename.get(name)!] : [])),
      ...(added.get(el) ?? []),
    ];
    if (names.length) el.setAttribute("class", names.join(" "));
    else el.removeAttribute("class");
  }

  snap.css = rules.join("");
  // Images the kept rules use (icon sprites, backgrounds) are embedded too.
  for (const m of snap.css.matchAll(URL_IN_CSS)) {
    const url = m[2];
    if (url.startsWith("data:") || url.startsWith("#") || snap.cssImages.has(url)) continue;
    snap.cssImages.set(url, null);
    snap.images.push({ url, apply: (dataUrl) => snap.cssImages.set(url, dataUrl) });
  }
}

/**
 * Stores each repeated image once. A profile picture that appears beside
 * forty messages is embedded forty times otherwise. The image moves into a
 * CSS rule and the elements refer to it by class; no script is involved.
 */
function shareRepeatedImages(root: Element): string {
  const rules: string[] = [];
  const share = (prefix: string, attr: string, selector: string, rule: (value: string) => string) => {
    const byValue = new Map<string, Element[]>();
    for (const el of root.querySelectorAll(selector)) {
      const value = el.getAttribute(attr)!;
      // Values with quotes or braces can't be moved into a rule safely.
      if (value.length < 64 || /["\\{}\n]/.test(attr === "src" ? value : value.replace(/url\("[^"]*"\)/g, ""))) continue;
      byValue.set(value, [...(byValue.get(value) ?? []), el]);
    }
    let n = 0;
    for (const [value, els] of byValue) {
      if (els.length < 2) continue;
      const name = `${prefix}${(n++).toString(36)}`;
      rules.push(`.${name}{${rule(value)}}`);
      for (const el of els) {
        el.removeAttribute(attr);
        el.setAttribute("class", `${el.getAttribute("class") ?? ""} ${name}`.trim());
      }
    }
  };
  share("i-", "src", 'img[src^="data:image/"]', (src) => `content:url("${src}")`);
  share("b-", "style", '[style*="url("]', (style) => style);
  return rules.join("");
}

// Shown when a captured link is clicked. No script is involved: each link points at a
// spot in this same document, and the rule below shows the panel whose spot is the target.
const LINK_PANEL_CSS =
  ".st-tip{display:none;position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;box-sizing:border-box;padding:10px 12px;" +
  "border:1px solid #7690A0;border-radius:10px;background:#fff;color:#55646E;box-shadow:0 8px 24px rgba(30,42,50,.18);" +
  "font:13px/18px system-ui,-apple-system,'Segoe UI',sans-serif;text-align:left}" +
  ".st-tip:target{display:block}" +
  ".st-tip b{display:block;margin:4px 0;font-weight:400;color:#1E2A32;word-break:break-all;user-select:all;-webkit-user-select:all}" +
  ".st-tip a{float:right;margin-left:12px;color:#3A6D88;font-weight:600;text-decoration:none}";

/**
 * Captured links never leave the capture. Clicking one opens a small panel at
 * the bottom saying where it pointed; one click on the address selects all of
 * it for copying. The panels are marked as added by Escapture and are not part
 * of what was on screen. Returns the panels' markup, or "" if there are no links.
 */
function linkPanels(root: Element): string {
  const ids = new Map<string, string>();
  for (const a of root.querySelectorAll("a[data-href]")) {
    const url = a.getAttribute("data-href")!;
    let id = ids.get(url);
    if (!id) {
      if (ids.size >= 2000) continue; // beyond this the link stays inert, with its tooltip
      ids.set(url, (id = `st-l${ids.size.toString(36)}`));
    }
    a.setAttribute("href", `#${id}`);
  }
  return [...ids]
    .map(([url, id]) => `<div class="st-tip" id="${id}"><a href="#st-close">Close</a>Added by Escapture. This link pointed to:<b>${esc(url)}</b>Click the address to select it, then copy.</div>`)
    .join("");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Wraps the clone in a minimal standalone document. Leaves `snap` untouched, so it can be called again. */
export function serialize(snap: Snapshot, meta: { sourceUrl: string; clientCapturedAt: string; kind: Kind }): string {
  const root = snap.root.cloneNode(true) as Element;
  // Final pass: nothing active may survive, whatever happened while embedding.
  for (const el of [root, ...root.querySelectorAll("*")]) {
    if (el !== root && REMOVE.has(el.tagName.toUpperCase())) el.remove();
    else for (const a of [...el.attributes]) if (a.name.toLowerCase().startsWith("on") || /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
  }
  // Every url() left in the rules becomes embedded data; nothing loads remotely.
  const rules = snap.css.replace(URL_IN_CSS, (whole, _q, url: string) =>
    url.startsWith("data:") || url.startsWith("#") ? whole : `url("${snap.cssImages.get(url) ?? BLANK}")`,
  );
  const css = (rules + shareRepeatedImages(root)).replace(/<\//g, "<\\/");
  const links = linkPanels(root);
  const context = [...snap.context].map(([prop, value]) => `${prop}:${value}`).join(";");
  return (
    `<!doctype html><html lang="${esc(document.documentElement.lang || "en")}"><head><meta charset="utf-8">` +
    `<meta name="safetrail:source-url" content="${esc(meta.sourceUrl)}">` +
    `<meta name="safetrail:client-captured-at" content="${esc(meta.clientCapturedAt)}">` +
    `<meta name="safetrail:kind" content="${esc(meta.kind)}">` +
    `<title>Escapture capture</title><style>${css}${links ? LINK_PANEL_CSS : ""}</style></head>` +
    `<body style="margin:0;padding:16px;background:${esc(snap.background)}">` +
    `<div style="width:${Math.round(snap.width)}px;max-width:100%;${esc(snap.backdrop)};${esc(context)}">${root.outerHTML}</div>${links}</body></html>\n`
  );
}

/** Rough split of where the bytes of a capture go, for the too-large message. */
export function sizeBreakdown(html: string) {
  let images = 0;
  for (const m of html.matchAll(/data:image\/[^"')\s]+/g)) images += m[0].length;
  const style = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
  let styleImages = 0;
  for (const m of style.matchAll(/data:image\/[^"')\s]+/g)) styleImages += m[0].length;
  const styles = style.length - styleImages;
  return { images, styles, markup: Math.max(0, html.length - images - styles) };
}
