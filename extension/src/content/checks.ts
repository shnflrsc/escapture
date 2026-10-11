import type { TamperCheck, TamperReport } from "../shared/types";

export type GuardState = {
  designModeEverOn: boolean;
  editableAdded: number;
  userscriptGlobals: string[];
};

/** Asks the MAIN-world guard for its state. Resolves null if it isn't there. */
export function queryGuard(timeoutMs = 400): Promise<GuardState | null> {
  return new Promise((resolve) => {
    // Per-session nonce so stray messages aren't mistaken for the reply.
    // A hostile page can still read the query and forge a reply; see page-guard.ts.
    const nonce = crypto.randomUUID();
    const done = (value: GuardState | null) => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      resolve(value);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const d = event.data as { source?: string; nonce?: string; state?: GuardState } | null;
      if (d?.source === "safetrail-guard" && d.nonce === nonce && d.state) done(d.state);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "safetrail-content", type: "guard:query", nonce }, window.location.origin);
  });
}

const isEditable = (el: Element) => {
  const v = el.getAttribute("contenteditable");
  return v !== null && v.toLowerCase() !== "false";
};

/** The message composer is legitimately editable. Its content is emptied in the snapshot. */
export const isComposer = (el: Element) => el.getAttribute("role") === "textbox" && isEditable(el);

const USERSCRIPT_MARKERS = /tampermonkey|violentmonkey|greasemonkey|userscript/i;

/**
 * Static tamper checks. Synchronous on purpose: they run immediately before
 * the clone, in the same task, so the page can't change in between.
 * These do NOT stop modified Facebook code, local overrides, proxies or
 * in-transit rewriting. Results must never be described as tamper-proof.
 */
export function runChecks(target: Element, guard: GuardState | null): TamperReport {
  const checks: TamperCheck[] = [];
  const warnings: string[] = [];

  // 1. Page editing mode.
  const designOn = document.designMode.toLowerCase() === "on";
  const designHistory = guard?.designModeEverOn ?? false;
  checks.push({
    id: "design-mode",
    passed: !designOn && !designHistory,
    detail: designOn
      ? "Page editing mode (designMode) is on."
      : designHistory
        ? "Page editing mode was switched on earlier on this page."
        : undefined,
  });

  // 2. Editable content on the target, its ancestors or its descendants.
  let editable: string | undefined;
  for (let el: Element | null = target; el; el = el.parentElement) {
    if (isEditable(el) && !(el !== target && isComposer(el))) {
      editable = el === target ? "The selected area is editable." : "The selected area is inside editable content.";
      break;
    }
  }
  if (!editable) {
    for (const el of target.querySelectorAll("[contenteditable]")) {
      if (isEditable(el) && !isComposer(el) && !el.closest('[role="textbox"][contenteditable]')) {
        editable = "Part of the selected area is editable.";
        break;
      }
    }
  }
  checks.push({ id: "contenteditable", passed: !editable, detail: editable });

  // 3. Userscript managers (best effort).
  const globals = guard?.userscriptGlobals ?? [];
  const root = document.documentElement;
  const domMarker =
    [root, document.body].some(
      (el) => el && [...el.attributes].some((a) => USERSCRIPT_MARKERS.test(a.name) || USERSCRIPT_MARKERS.test(a.value)),
    ) || Boolean(document.querySelector('[id*="tampermonkey" i], [id*="violentmonkey" i], [class*="tampermonkey" i]'));
  checks.push({
    id: "userscript-markers",
    passed: globals.length === 0 && !domMarker,
    detail: globals.length ? `Userscript manager detected (${globals.join(", ")}).` : domMarker ? "Userscript manager markers found on the page." : undefined,
  });

  // 4. Injected scripts or styles inside the selected area.
  const injected = target.querySelector("script, style");
  checks.push({
    id: "injected-elements",
    passed: !injected,
    detail: injected ? `A <${injected.tagName.toLowerCase()}> element is inside the selected area.` : undefined,
  });

  if (!guard) warnings.push("The page guard was not active, so editing history and userscript globals could not be checked.");
  else if (guard.editableAdded > 0) warnings.push("Content on this page was made editable at some point since it loaded.");
  // Mutation-provenance checking (attributing DOM changes to page scripts) is
  // not implemented in this version; see README "Known limitations".

  return { checks, allPassed: checks.every((c) => c.passed), warnings: warnings.length ? warnings : undefined };
}

/** Runs the checks for every selected item. Capture is refused if any item fails any check. */
export function runChecksAll(targets: Element[], guard: GuardState | null): TamperReport {
  const reports = targets.map((t) => runChecks(t, guard));
  const checks = reports[0].checks.map((first, i) => {
    const failed = reports.map((r) => r.checks[i]).find((c) => !c.passed);
    return failed ?? first;
  });
  return { checks, allPassed: checks.every((c) => c.passed), warnings: reports[0].warnings };
}
