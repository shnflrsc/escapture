// Support tool: describes how the selected area is built and styled, WITHOUT
// its content, so a capture that looks wrong can be investigated without
// anyone having to share their messages.
//
// What the file contains: element structure, class names, sizes, a few
// computed style values, and the style rules the capture kept.
// What it never contains: text (only its length), names, links, image
// addresses, or attribute values other than class, role and inline style.
import { buildSnapshot, loadStyles, type Snapshot } from "./snapshot";

const STYLE_PROPS = [
  "display", "position", "overflow-x", "overflow-y", "width", "height", "min-height", "max-height",
  "flex-direction", "flex-grow", "flex-basis", "order", "opacity", "visibility", "z-index", "transform",
  "color", "background-color", "background-image", "background-attachment", "mix-blend-mode",
  "mask-image", "clip-path", "box-shadow", "font-size", "contain", "content-visibility",
];
const KEEP_ATTRS = new Set(["role", "aria-hidden", "data-pagelet", "data-virtualized", "data-ad-rendering-role", "data-visualcompletion"]);

const noUrls = (s: string) => s.replace(/url\([^)]*\)/g, "url(…)");
/** CSS with every quoted string reduced to its length, so generated text can't leak. */
const noStrings = (css: string) => noUrls(css).replace(/"(?:[^"\\]|\\.)*"/g, (m) => `"…${m.length - 2}"`);

function styleOf(el: Element, pseudo?: string) {
  const cs = getComputedStyle(el, pseudo);
  const out: Record<string, string> = {};
  for (const p of STYLE_PROPS) {
    const v = cs.getPropertyValue(p);
    if (v && v !== "none" && v !== "normal" && v !== "auto" && v !== "0" && v !== "visible" && v !== "static") out[p] = noUrls(v);
  }
  if (pseudo) out.content = cs.content === "none" || cs.content === "normal" ? "none" : /^url\(/.test(cs.content) ? "url(…)" : `text(${cs.content.length - 2})`;
  return out;
}

function describe(el: Element, snap: Snapshot | null, depth: number, budget: { left: number }): unknown {
  budget.left--;
  const r = el.getBoundingClientRect();
  const attrs: Record<string, string> = {};
  for (const a of el.attributes) {
    if (KEEP_ATTRS.has(a.name)) attrs[a.name] = a.value.slice(0, 60);
    else if (a.name === "style") attrs.style = noUrls(a.value).slice(0, 400);
    else if (a.name !== "class") attrs[a.name] = "…"; // the attribute exists; its value is not recorded
  }
  const ownText = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).reduce((n, t) => n + (t.textContent?.trim().length ?? 0), 0);
  const copy = snap?.cloneOf.get(el);
  const node: Record<string, unknown> = {
    tag: el.tagName.toLowerCase(),
    class: el.getAttribute("class") ?? "",
    attrs,
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    ownTextLength: ownText,
    style: styleOf(el),
    // What became of it in the capture.
    captured: copy ? (copy === snap!.root || snap!.root.contains(copy) ? { class: copy.getAttribute("class") ?? "", style: noUrls(copy.getAttribute("style") ?? "") } : "removed") : "not captured",
  };
  for (const pseudo of ["::before", "::after"]) {
    const ps = styleOf(el, pseudo);
    if (ps.content !== "none") node[pseudo] = ps;
  }
  if (depth > 0 && budget.left > 0) {
    node.children = [...el.children].filter(() => budget.left > 0).map((c) => describe(c, snap, depth - 1, budget));
  } else if (el.children.length) {
    node.childrenOmitted = el.querySelectorAll("*").length;
  }
  return node;
}

/** Builds the diagnostic report for the given selection and offers it as a download. */
export async function saveDiagnostics(targets: Element[], kind: string, fetchText: (url: string) => Promise<string | null>) {
  let snap: Snapshot | null = null;
  let error: string | null = null;
  try {
    snap = buildSnapshot(targets);
    await loadStyles(snap, fetchText);
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  const budget = { left: 4000 };
  const ancestors: unknown[] = [];
  for (let el = targets[0].parentElement, i = 0; el && i < 12; el = el.parentElement, i++) {
    ancestors.push({ tag: el.tagName.toLowerCase(), class: el.getAttribute("class") ?? "", children: el.children.length, style: styleOf(el), inlineStyle: noUrls(el.getAttribute("style") ?? "").slice(0, 400) });
  }
  let sheets = 0;
  let unreadable = 0;
  for (const sheet of document.styleSheets) {
    sheets++;
    try {
      void sheet.cssRules;
    } catch {
      unreadable++;
    }
  }
  const report = {
    safetrailDiagnostics: 1,
    note: "Structure and styling only. No text, names, links or image addresses are included.",
    extensionVersion: __EXT_VERSION__,
    site: location.hostname,
    path: location.pathname.split("/").slice(0, 2).join("/"), // first segment only
    kind,
    viewport: [window.innerWidth, window.innerHeight],
    selection: targets.length,
    styleSheets: { total: sheets, unreadable, fetchedSeparately: snap?.unreadSheets.length ?? 0 },
    captureError: error,
    captureWarnings: snap?.warnings ?? [],
    wrapperStyle: snap ? [...snap.context].map(([p, v]) => `${p}:${noUrls(v)}`) : [],
    wrapperBackdrop: snap?.backdrop ?? "",
    keptCss: snap ? noStrings(snap.css).slice(0, 400_000) : "",
    ancestors,
    targets: targets.slice(0, 40).map((t) => describe(t, snap, 40, budget)),
    truncated: budget.left <= 0,
  };
  const blob = new Blob([JSON.stringify(report)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `safetrail-diagnostics-${kind}-${Date.now()}.json`;
  a.click(); // not attached to the page, so the page is not changed
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
