// Runs in the page's own JavaScript world (world: "MAIN") from document_start.
// It watches for tampering signals the isolated content script can't see:
// userscript-manager globals, and whether page editing mode was ever switched
// on since the page loaded.
//
// LIMITS: this is a speed bump, not a guarantee. A hostile page (or anything
// else running in this world) can forge or silence this channel, and none of
// this detects modified Facebook code, local overrides, proxies or DevTools
// edits made through the debugger protocol.
(() => {
  const w = window as unknown as Record<string, unknown>;
  if (w.__safetrailGuard) return;
  Object.defineProperty(w, "__safetrailGuard", { value: true, enumerable: false });

  const state = { designModeEverOn: false, editableAdded: 0 };

  try {
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, "designMode");
    if (desc?.set && desc.get) {
      const { get, set } = desc;
      Object.defineProperty(Document.prototype, "designMode", {
        configurable: true,
        enumerable: desc.enumerable,
        get(this: Document) {
          return get.call(this);
        },
        set(this: Document, value: string) {
          if (String(value).toLowerCase() === "on") state.designModeEverOn = true;
          set.call(this, value);
        },
      });
    }
  } catch {}

  const isComposer = (el: Element) => el.getAttribute("role") === "textbox";
  const start = () => {
    if (document.designMode.toLowerCase() === "on") state.designModeEverOn = true;
    new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as Element;
        const v = el.getAttribute("contenteditable");
        if (v !== null && v !== "false" && !isComposer(el)) state.editableAdded++;
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["contenteditable"], subtree: true });
  };
  if (document.documentElement) start();
  else document.addEventListener("readystatechange", start, { once: true });

  const USERSCRIPT_GLOBALS = ["GM_info", "GM", "unsafeWindow", "GM_getValue", "GM_xmlhttpRequest", "Tampermonkey", "Violentmonkey", "Greasemonkey"];

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data as { source?: string; type?: string; nonce?: string } | null;
    if (!data || data.source !== "safetrail-content" || data.type !== "guard:query") return;
    window.postMessage(
      {
        source: "safetrail-guard",
        nonce: data.nonce,
        state: {
          designModeEverOn: state.designModeEverOn || document.designMode.toLowerCase() === "on",
          editableAdded: state.editableAdded,
          userscriptGlobals: USERSCRIPT_GLOBALS.filter((g) => g in w),
        },
      },
      window.location.origin,
    );
  });
})();
