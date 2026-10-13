import type { TamperCheck, TamperReport } from "../shared/types";

/** The page guard's answer about the elements being captured. See page-guard.js. */
export type GuardState = {
  /** False while the page is still loading; changes are only judged once this is true. */
  armed: boolean;
  /** Whether the browser's call-site API was available to tell page scripts from others. */
  callSites: boolean;
  /** False if any of the guard's hooks on DOM functions was replaced after load. Not a failure by itself. */
  intact: boolean;
  /** Which ones, for example "Node.appendChild". */
  replaced: string[];
  /** True if the guard's analysis of a change was disturbed (for example poisoned built-ins). */
  analysisFailed: boolean;
  /** True if there were too many unattributed changes to keep track of. */
  storm: boolean;
  /** How many marked elements the guard found. */
  targets: number;
  designModeEverOn: boolean;
  userscriptGlobals: string[];
  /** Why text in the selection changed without coming from the page's own scripts. */
  hits: string[];
  /** Unattributed changes elsewhere on the page. */
  elsewhere: number;
};

/**
 * Asks the MAIN-world guard, through the isolated-world bridge, what happened
 * to the elements carrying the attribute `mark`. Null if no guard is running.
 */
export function queryGuard(mark: string): Promise<GuardState | null> {
  return globalThis.__safetrailBridge?.query(mark) ?? Promise.resolve(null);
}

const isEditable = (el: Element) => {
  const v = el.getAttribute("contenteditable");
  return v !== null && v.toLowerCase() !== "false";
};

/** The message composer is legitimately editable. Its content is emptied in the snapshot. */
export const isComposer = (el: Element) => el.getAttribute("role") === "textbox" && isEditable(el);

const USERSCRIPT_MARKERS = /tampermonkey|violentmonkey|greasemonkey|userscript/i;

/** 5. Did text in the selection change other than through the page's own scripts? */
function provenance(guard: GuardState | null, expectedTargets: number): TamperCheck {
  const id = "dom-provenance";
  const fail = (detail: string): TamperCheck => ({ id, passed: false, detail });
  if (!guard) {
    return fail("The tamper guard was not running when this page loaded, so changes to it could not be watched. Reload the page and capture again.");
  }
  if (!guard.callSites) return fail("This browser can't tell the page's own scripts from others, so changes can't be checked.");
  if (!guard.armed) return fail("The page is still loading. Wait a moment and capture again.");
  if (guard.targets < expectedTargets) return fail("The tamper guard could not find the selected area. Reload the page and capture again.");
  if (guard.analysisFailed) return fail("A change to the page could not be checked because the page's built-in functions had been altered.");
  if (guard.storm) return fail("There were too many unexplained changes on this page to check them.");
  if (guard.hits.length) {
    return fail(`Text in the selected area was changed by ${guard.hits.join("; and by ")}, not by the page itself.`);
  }
  return { id, passed: true };
}

/**
 * Tamper checks for one selected element. Synchronous on purpose: they run
 * immediately before the clone, in the same task, so the page can't change in
 * between (the guard's answer is fetched just before, and asked for again
 * just after).
 *
 * These do NOT stop modified Facebook code, local overrides, proxies or
 * in-transit rewriting. Results must never be described as tamper-proof.
 */
export function runChecks(target: Element, guard: GuardState | null, expectedTargets = 1): TamperReport {
  const checks: TamperCheck[] = [];

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

  // 5. Changes that did not come from the page's own scripts.
  checks.push(provenance(guard, expectedTargets));
  // Sites and other extensions routinely wrap built-in functions, and change other parts of the
  // page. Neither is reported: a wrapper that is not the page's own fails the check above, and
  // one that skips the guard leaves changes unexplained, which also fails it.

  return { checks, allPassed: checks.every((c) => c.passed) };
}

/** Runs the checks for every selected item. Capture is refused if any item fails any check. */
export function runChecksAll(targets: Element[], guard: GuardState | null): TamperReport {
  const reports = targets.map((t) => runChecks(t, guard, targets.length));
  const checks = reports[0].checks.map((first, i) => {
    const failed = reports.map((r) => r.checks[i]).find((c) => !c.passed);
    return failed ?? first;
  });
  return { checks, allPassed: checks.every((c) => c.passed) };
}
