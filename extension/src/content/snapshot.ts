// SingleFile-style snapshot, simplified: clone the target, inline computed
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

/** `apply` may be called again with a smaller version of the same image. */
export type PendingImage = { url: string; apply: (dataUrl: string | null) => void };

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

function inlineStyle(
  original: Element,
  cs: CSSStyleDeclaration,
  parentCs: CSSStyleDeclaration | null,
  defaults: Map<string, string>,
  skipBackgroundImage: boolean,
): string {
  const tag = original.tagName.toUpperCase();
  const hasText = original.childNodes.length > 0;
  let out = "";
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    if (SKIP.test(prop) || (skipBackgroundImage && prop === "background-image")) continue;
    const value = cs.getPropertyValue(prop);
    if (!value || value === defaults.get(prop)) {
      // Still needed if the parent sets an inherited property to something else.
      if (!(INHERITED.has(prop) && parentCs && parentCs.getPropertyValue(prop) !== value)) continue;
    } else if (INHERITED.has(prop) && parentCs && parentCs.getPropertyValue(prop) === value) {
      continue;
    }
    // Resolved pixel heights would stop text from reflowing; keep them only
    // for replaced or empty boxes (avatars, spacers, images).
    if (prop === "height" && hasText && !REPLACED.has(tag)) continue;
    if (prop === "width" && cs.display === "inline") continue;
    out += `${prop}:${value};`;
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
    if (svg && (name === "id" || name === "class")) continue;
    if (
      name.startsWith("on") ||
      name.startsWith("data-") ||
      name === "class" || name === "id" || name === "srcset" || name === "sizes" || name === "nonce" ||
      name === "integrity" || name === "contenteditable" || name === "action" || name === "formaction" ||
      name === "ping" || name === "target" || name === "srcdoc" || name === "loading" || name === "tabindex" ||
      name === "autofocus" || name === "style"
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
      if (u && (u.protocol === "https:" || u.protocol === "http:")) safe = u.href;
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

/**
 * Builds the frozen clone synchronously (call right after the tamper checks,
 * in the same task). Images still to embed are returned for async fetching.
 */
export function buildSnapshot(target: Element): { root: Element; css: string; images: PendingImage[]; width: number; background: string } {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("style", "position:fixed;left:-9999px;top:0;width:10px;height:10px;border:0;visibility:hidden");
  document.documentElement.appendChild(frame);
  const defaultsCache: Defaults = new Map();
  const images: PendingImage[] = [];

  try {
    const clone = target.cloneNode(true) as Element;
    const originals = [target, ...target.querySelectorAll("*")];
    const clones = [clone, ...clone.querySelectorAll("*")];
    const styles = new Map<Element, CSSStyleDeclaration>();
    const remove: Element[] = [];
    // Identical style strings are shared through one generated class each.
    // Facebook repeats the same styles on thousands of elements, so this is
    // what keeps a real post under the upload limit.
    const classes = new Map<string, string>();
    const classFor = (style: string) => {
      let name = classes.get(style);
      if (!name) classes.set(style, (name = `s${classes.size.toString(36)}`));
      return name;
    };
    let skipped: Element | null = null;

    for (let i = 0; i < originals.length; i++) {
      const o = originals[i];
      const c = clones[i];
      if (skipped?.contains(o)) continue;
      const tag = o.tagName.toUpperCase();
      const cs = REMOVE.has(tag) ? null : getComputedStyle(o);
      // Elements that are not rendered are not part of what was on screen.
      if (!cs || (cs.display === "none" && o !== target)) {
        remove.push(c);
        skipped = o;
        continue;
      }
      styles.set(o, cs);
      const parentCs = o === target ? null : (o.parentElement && styles.get(o.parentElement)) ?? null;

      const bg = cs.backgroundImage;
      const bgUrls =
        bg && bg !== "none" && bg.includes("url(")
          ? [...new Set([...bg.matchAll(URL_IN_CSS)].map((m) => m[2]).filter((u) => !u.startsWith("data:")))]
          : [];
      let style = inlineStyle(
        o,
        cs,
        parentCs,
        defaultStyles(frame, defaultsCache, o.namespaceURI === "http://www.w3.org/2000/svg" ? "div" : o.tagName),
        bgUrls.length > 0,
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
          data = o.toDataURL("image/jpeg", 0.8);
        } catch {}
        const img = document.createElement("img");
        if (data) img.setAttribute("src", data);
        img.setAttribute("class", classFor(style));
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
      // Strip any url() that is not an embedded image so nothing loads remotely.
      style = style.replace(/[a-z-]+:[^;]*url\((?!["']?data:image\/)[^;]*;/g, "");
      if (style) c.setAttribute("class", classFor(style));
      else c.removeAttribute("class");
    }
    for (const el of remove) el.remove();

    // The first non-transparent background behind the target, so light text
    // captured from a dark page stays readable.
    let background = "#ffffff";
    for (let el: Element | null = target; el; el = el.parentElement) {
      const color = getComputedStyle(el).backgroundColor;
      if (color && color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color)) {
        background = color;
        break;
      }
    }
    const css = [...classes].map(([style, name]) => `.${name}{${style}}`).join("\n");
    return { root: clone, css, images, width: target.getBoundingClientRect().width, background };
  } finally {
    frame.remove();
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Wraps the clone in a minimal standalone document. */
export function serialize(
  snap: { root: Element; css: string; width: number; background: string },
  meta: { sourceUrl: string; clientCapturedAt: string; kind: Kind },
): string {
  // Final pass: nothing active may survive, whatever happened while embedding.
  for (const el of [...snap.root.querySelectorAll("*")]) {
    if (REMOVE.has(el.tagName.toUpperCase())) el.remove();
    else for (const a of [...el.attributes]) if (a.name.toLowerCase().startsWith("on") || /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
  }
  const body = new XMLSerializer().serializeToString(snap.root).replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, "");
  return (
    `<!doctype html>\n<html lang="${esc(document.documentElement.lang || "en")}">\n<head>\n<meta charset="utf-8">\n` +
    `<meta name="safetrail:source-url" content="${esc(meta.sourceUrl)}">\n` +
    `<meta name="safetrail:client-captured-at" content="${esc(meta.clientCapturedAt)}">\n` +
    `<meta name="safetrail:kind" content="${esc(meta.kind)}">\n` +
    `<title>SafeTrail capture</title>\n<style>\n${snap.css.replace(/<\//g, "<\\/")}\n</style>\n</head>\n` +
    `<body style="margin:0;padding:16px;background:${esc(snap.background)}">\n` +
    `<div style="width:${Math.round(snap.width)}px;max-width:100%">${body}</div>\n</body>\n</html>\n`
  );
}
