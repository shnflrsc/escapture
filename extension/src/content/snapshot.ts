// SingleFile-style snapshot, simplified: clone the selection, copy computed
// styles, embed images as data URIs, and strip everything active.
import type { Kind } from "../shared/types";
import { isComposer } from "./checks";

const REMOVE = new Set([
  "SCRIPT", "STYLE", "LINK", "META", "BASE", "IFRAME", "FRAME", "FRAMESET", "OBJECT", "EMBED",
  "NOSCRIPT", "TEMPLATE", "AUDIO", "SOURCE", "TRACK", "PORTAL",
]);

// Inherited properties are skipped when they equal the parent's value.
const INHERITED = new Set([
  "color", "cursor", "direction", "font-family", "font-size", "font-style", "font-variant-caps",
  "font-weight", "font-stretch", "font-kerning", "letter-spacing", "line-height", "list-style-type",
  "list-style-position", "text-align", "text-indent", "text-transform", "text-rendering", "visibility",
  "white-space-collapse", "text-wrap-mode", "word-break", "overflow-wrap", "word-spacing", "tab-size",
  "-webkit-font-smoothing", "text-size-adjust", "quotes", "orphans", "widows", "caret-color",
  "text-shadow", "pointer-events", "border-collapse", "border-spacing", "hyphens", "writing-mode",
]);

const SKIP = /(^|-)(inline-size|block-size)$|^(perspective-origin|transform-origin|inset-inline|inset-block|margin-inline|margin-block|padding-inline|padding-block|border-inline|border-block|animation|transition|cursor|pointer-events|user-select|will-change|caret-color|-webkit-tap-highlight-color|-webkit-locale|d$|cx$|cy$|r$|rx$|ry$|x$|y$)/;
const REPLACED = new Set(["IMG", "SVG", "CANVAS", "VIDEO", "PICTURE", "INPUT", "TEXTAREA", "SELECT", "BUTTON"]);

// When several separate items are selected, the containers between them are
// kept only as plain structure. Their own sizing and positioning (often used
// by virtualised lists) would leave large gaps once the other items are gone.
const CONTAINER_PROPS = new Set([
  "display", "flex-direction", "flex-wrap", "align-items", "justify-content", "row-gap", "column-gap",
  "box-sizing", "background-color",
]);

/**
 * `displayWidth` is how wide the image is shown, in CSS pixels, so it can be
 * embedded at that size. It is unset for CSS backgrounds, which may be sprite
 * sheets and must keep their real dimensions. `apply` may be called again
 * with a smaller version of the same image.
 */
export type PendingImage = { url: string; displayWidth?: number; apply: (dataUrl: string | null) => void };

export type Snapshot = { root: Element; css: string; images: PendingImage[]; width: number; background: string };

type Defaults = Map<string, Map<string, string>>;

function defaultStyles(frame: HTMLIFrameElement, cache: Defaults, tag: string): Map<string, string> {
  let d = cache.get(tag);
  if (d) return d;
  d = new Map();
  const doc = frame.contentDocument;
  if (doc?.body) {
    const el = doc.createElement(tag);
    doc.body.appendChild(el);
    const cs = frame.contentWindow!.getComputedStyle(el);
    for (let i = 0; i < cs.length; i++) d.set(cs[i], cs.getPropertyValue(cs[i]));
    el.remove();
  }
  cache.set(tag, d);
  return d;
}

/** The declarations an element needs: only what differs from a bare element of the same tag. */
function declarations(
  original: Element,
  cs: CSSStyleDeclaration,
  parentCs: CSSStyleDeclaration | null,
  defaults: Map<string, string>,
  opts: { skipBackgroundImage: boolean; containerOnly: boolean },
): string[] {
  const tag = original.tagName.toUpperCase();
  const hasChildren = original.childNodes.length > 0;
  const out: string[] = [];
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    if (SKIP.test(prop) || (opts.skipBackgroundImage && prop === "background-image")) continue;
    if (opts.containerOnly && !CONTAINER_PROPS.has(prop) && !INHERITED.has(prop)) continue;
    const value = cs.getPropertyValue(prop);
    if (!value || value === defaults.get(prop)) {
      // Still needed if the parent sets an inherited property to something else.
      if (!(INHERITED.has(prop) && parentCs && parentCs.getPropertyValue(prop) !== value)) continue;
    } else if (INHERITED.has(prop) && parentCs && parentCs.getPropertyValue(prop) === value) {
      continue;
    }
    // Resolved pixel heights would stop text from reflowing; keep them only
    // for replaced or empty boxes (avatars, spacers, images).
    if (prop === "height" && hasChildren && !REPLACED.has(tag)) continue;
    if (prop === "width" && cs.display === "inline") continue;
    // Nothing may load remotely: drop any url() that is not an embedded image.
    if (value.includes("url(") && !/^url\(["']?data:image\//.test(value)) continue;
    out.push(`${prop}:${value}`);
  }
  return out;
}

const URL_IN_CSS = /url\((["']?)(.*?)\1\)/g;

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

function sanitizeAttributes(el: Element) {
  // SVG ids are kept: gradients, clip paths and <use> refer to them.
  const svg = el.namespaceURI === "http://www.w3.org/2000/svg";
  for (const attr of [...el.attributes]) {
    const name = attr.name.toLowerCase();
    if (svg && name === "id") continue;
    if (
      name.startsWith("on") ||
      name.startsWith("data-") ||
      name.startsWith("aria-") ||
      name === "class" || name === "id" || name === "srcset" || name === "sizes" || name === "nonce" ||
      name === "integrity" || name === "contenteditable" || name === "action" || name === "formaction" ||
      name === "ping" || name === "target" || name === "srcdoc" || name === "loading" || name === "tabindex" ||
      name === "autofocus" || name === "style" || name === "role"
    ) {
      el.removeAttribute(attr.name);
    }
  }
  if (el instanceof HTMLAnchorElement || el.tagName.toLowerCase() === "a") {
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
    if (safe) {
      el.setAttribute("href", safe);
      el.setAttribute("rel", "noopener noreferrer nofollow");
    } else {
      el.removeAttribute("href");
    }
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement || el instanceof HTMLTextAreaElement) {
    el.setAttribute("disabled", "");
  }
}

/** Short CSS class names: a, b, ... Z, aa, ab, ... Most-used styles get the shortest. */
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
  // Text can spill out of a zero-size box unless the box clips it.
  if (o.textContent?.trim() && cs.overflowX === "visible") return false;
  const inner = o.querySelectorAll("*");
  return inner.length <= 300 && [...inner].every(zero);
}

/**
 * Removes wrappers that carry nothing: no styles of their own, no attributes,
 * and exactly one element inside. Facebook nests many of these.
 */
function flatten(root: Element, styled: Map<Element, string[]>) {
  const all = [...root.querySelectorAll("div, span")].reverse(); // innermost first
  for (const el of all) {
    if (el === root || !el.parentNode || el.attributes.length > 0 || (styled.get(el)?.length ?? 0) > 0) continue;
    const kids = [...el.childNodes].filter((n) => !(n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()));
    if (kids.length === 0) el.remove();
    else if (kids.length === 1 && kids[0].nodeType === Node.ELEMENT_NODE) el.replaceWith(kids[0]);
  }
}

/**
 * Turns each element's declarations into class names and returns the CSS.
 *
 * Every distinct declaration ("color:red") is one class, shared by every
 * element that uses it, so size barely grows with the number of elements.
 * Elements that share their whole set of declarations with others (list rows,
 * repeated buttons, every message bubble) get a single combined class instead
 * when that is shorter.
 */
function assignClasses(root: Element, styled: Map<Element, string[]>): string {
  const live = [...styled].filter(([el, decls]) => decls.length > 0 && (el === root || root.contains(el)));
  const count = (list: [Element, string[]][]) => {
    const freq = new Map<string, number>();
    for (const [, decls] of list) for (const d of decls) freq.set(d, (freq.get(d) ?? 0) + 1);
    return [...freq].sort((a, b) => b[1] - a[1]);
  };

  // Group elements with identical declaration sets.
  const groups = new Map<string, Element[]>();
  for (const [el, decls] of live) {
    const key = decls.join(";");
    groups.set(key, [...(groups.get(key) ?? []), el]);
  }
  const provisional = new Map(count(live).map(([d], i) => [d, shortName(i)]));
  const combos: [string, Element[]][] = [];
  for (const [key, els] of groups) {
    const decls = styled.get(els[0])!;
    const atomic = decls.reduce((n, d) => n + provisional.get(d)!.length + 1, 0) * els.length;
    const combined = key.length + 6 + els.length * 3;
    if (els.length > 1 && combined < atomic) combos.push([key, els]);
  }
  combos.sort((a, b) => b[1].length - a[1].length);

  const rules: string[] = [];
  const done = new Set<Element>();
  combos.forEach(([key, els], i) => {
    const name = `_${shortName(i)}`;
    rules.push(`.${name}{${key}}`);
    for (const el of els) {
      el.setAttribute("class", name);
      done.add(el);
    }
  });
  const rest = live.filter(([el]) => !done.has(el));
  const names = new Map(count(rest).map(([d], i) => [d, shortName(i)]));
  for (const [d, name] of names) rules.push(`.${name}{${d}}`);
  for (const [el, decls] of rest) el.setAttribute("class", decls.map((d) => names.get(d)).join(" "));
  return rules.join("");
}

/** Lowest element that contains every target. */
function commonAncestor(targets: Element[]): Element {
  let root: Element = targets[0];
  for (const t of targets) while (!root.contains(t)) root = root.parentElement ?? document.documentElement;
  return root;
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
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("style", "position:fixed;left:-9999px;top:0;width:10px;height:10px;border:0;visibility:hidden");
  document.documentElement.appendChild(frame);
  const defaultsCache: Defaults = new Map();
  const images: PendingImage[] = [];

  try {
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
    const styles = new Map<Element, CSSStyleDeclaration>();
    const remove: Element[] = [];

    // Declarations per cloned element; turned into classes once the tree is final.
    const styled = new Map<Element, string[]>();

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
      styles.set(o, cs);
      const parentCs = o === top ? null : (o.parentElement && styles.get(o.parentElement)) ?? null;

      const bg = cs.backgroundImage;
      const bgUrls =
        !isScaffold && bg && bg !== "none" && bg.includes("url(")
          ? [...new Set([...bg.matchAll(URL_IN_CSS)].map((m) => m[2]).filter((u) => !u.startsWith("data:")))]
          : [];
      const decls = declarations(
        o,
        cs,
        parentCs,
        defaultStyles(frame, defaultsCache, o.namespaceURI === "http://www.w3.org/2000/svg" ? "div" : o.tagName),
        { skipBackgroundImage: bgUrls.length > 0 || isScaffold, containerOnly: isScaffold },
      );
      sanitizeAttributes(c);

      const rect = o.getBoundingClientRect();
      if (o instanceof HTMLImageElement) {
        const url = o.currentSrc || o.src;
        c.removeAttribute("src");
        if (url.startsWith("data:image/")) c.setAttribute("src", url);
        else if (url) {
          let node: Element = c;
          images.push({
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
      } else if (o instanceof HTMLCanvasElement) {
        let data: string | null = null;
        try {
          data = o.toDataURL("image/webp", 0.8);
        } catch {}
        const img = document.createElement("img");
        if (data) img.setAttribute("src", data);
        styled.set(img, decls);
        c.replaceWith(data ? img : placeholder(document, rect.width, rect.height));
        skipped = o;
        continue;
      } else if (o instanceof HTMLVideoElement) {
        c.replaceWith(placeholder(document, rect.width, rect.height));
        skipped = o;
        continue;
      }

      // CSS background images stay inline on the element, embedded one by one.
      if (bgUrls.length) {
        const el = c;
        const embedded = new Map<string, string | null>();
        const render = () => {
          let value = bg;
          for (const url of bgUrls) {
            const dataUrl = embedded.get(url);
            if (!dataUrl) {
              value = "none";
              break;
            }
            value = value.split(url).join(dataUrl);
          }
          el.setAttribute("style", `background-image:${value}`);
        };
        render();
        for (const url of bgUrls) {
          images.push({
            url,
            apply: (dataUrl) => {
              embedded.set(url, dataUrl);
              render();
            },
          });
        }
      }

      if (isComposer(o)) {
        // Whatever is typed in the composer is not part of the conversation.
        c.textContent = "";
        skipped = o;
      }
      c.removeAttribute("class");
      styled.set(c, decls);
    }
    for (const el of remove) el.remove();
    flatten(clone, styled);
    const css = assignClasses(clone, styled);

    // The first non-transparent background behind the selection, so light
    // text captured from a dark page stays readable.
    let background = "#ffffff";
    for (let el: Element | null = targets[0]; el; el = el.parentElement) {
      const color = getComputedStyle(el).backgroundColor;
      if (color && color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color)) {
        background = color;
        break;
      }
    }
    const width = Math.max(...targets.map((t) => t.getBoundingClientRect().width));
    return { root: clone, css, images, width, background };
  } finally {
    frame.remove();
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
  share("b-", "style", '[style^="background-image:"]', (style) => style);
  return rules.join("");
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
  const css = (snap.css + shareRepeatedImages(root)).replace(/<\//g, "<\\/");
  return (
    `<!doctype html><html lang="${esc(document.documentElement.lang || "en")}"><head><meta charset="utf-8">` +
    `<meta name="safetrail:source-url" content="${esc(meta.sourceUrl)}">` +
    `<meta name="safetrail:client-captured-at" content="${esc(meta.clientCapturedAt)}">` +
    `<meta name="safetrail:kind" content="${esc(meta.kind)}">` +
    `<title>SafeTrail capture</title><style>${css}</style></head>` +
    `<body style="margin:0;padding:16px;background:${esc(snap.background)}">` +
    `<div style="width:${Math.round(snap.width)}px;max-width:100%">${root.outerHTML}</div></body></html>\n`
  );
}

/** Rough split of where the bytes of a capture go, for the too-large message. */
export function sizeBreakdown(html: string, css: string) {
  let images = 0;
  for (const m of html.matchAll(/data:image\/[^"')\s]+/g)) images += m[0].length;
  return { images, styles: css.length, markup: Math.max(0, html.length - images - css.length) };
}
