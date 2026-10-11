/* eslint-disable */
/**
 * SafeTrail page guard (MAIN world, document_start): DOM provenance.
 *
 * Ported from the DOM Tamper Detector extension's main-world-guard.js (v2,
 * "default-deny provenance"). The detection logic is kept as close to the
 * original as possible, because its details are what make it hard to bypass:
 * built-ins are captured before any page script runs and never looked up
 * again, and nothing here uses a page-patchable regex or prototype method.
 * It is plain JavaScript on purpose and is not type-checked.
 *
 * Model
 *  - A private MutationObserver sees EVERY text-bearing change (document, open
 *    and closed shadow roots).
 *  - A change is legitimate only if it was produced by a hooked DOM API call
 *    whose call stack consists exclusively of scripts the page itself served
 *    (an http(s) URL on an origin the page was already using, or the page's own
 *    inline script). The stack is read from real V8 call sites, which a
 *    "//# sourceURL" comment cannot spoof. Everything else is recorded:
 *      - no hooked call at all  -> DevTools Elements panel, another extension
 *      - console / eval / anonymous script / script from another origin
 *      - a native called with no script frame
 *  - Genuine typing in a genuine editor (the message composer) is allowed.
 *
 * What changed from the original: nothing is shown on the page and nothing is
 * pushed anywhere. Incidents stay in this closure, and the isolated-world
 * bridge asks about them over a private MessagePort when the student captures.
 *
 * Limits that cannot be removed from inside the page: if the page's OWN served
 * script is modified (Local Overrides, a rewriting proxy, a userscript that
 * patches the app's functions), the write still comes from an app frame.
 * A script that runs before this guard could also take over the port
 * handshake. Results must never be described as tamper-proof.
 */
(() => {
  'use strict';
  if (window.__safetrailGuard) return;
  try { Object.defineProperty(window, '__safetrailGuard', { value: true, enumerable: false }); } catch (_) {}

  // ---------- capture intrinsics before any page script can replace them ----------
  const E = Error, captureST = E.captureStackTrace;
  const R_apply = Reflect.apply;
  const gOPD = Object.getOwnPropertyDescriptor, dP = Object.defineProperty, gPO = Object.getPrototypeOf;
  const bindCall = (f) => Function.prototype.call.bind(f);
  const mGet = bindCall(Map.prototype.get), mSet = bindCall(Map.prototype.set), mClear = bindCall(Map.prototype.clear);
  const sHas = bindCall(Set.prototype.has), sAdd = bindCall(Set.prototype.add);
  const wsHas = bindCall(WeakSet.prototype.has), wsAdd = bindCall(WeakSet.prototype.add);
  const str = { trim: bindCall(String.prototype.trim), slice: bindCall(String.prototype.slice), lower: bindCall(String.prototype.toLowerCase), startsWith: bindCall(String.prototype.startsWith), endsWith: bindCall(String.prototype.endsWith), indexOf: bindCall(String.prototype.indexOf), charCodeAt: bindCall(String.prototype.charCodeAt) };
  const arrPush = bindCall(Array.prototype.push);
  const JSONs = JSON.stringify, JSONp = JSON.parse, S = String, hasOwn = bindCall(Object.prototype.hasOwnProperty);
  const now = Date.now.bind(Date), setT = setTimeout, setI = setInterval, clearI = clearInterval, MO = MutationObserver, CE = CustomEvent, W = window, D = document;
  const dispatch = bindCall(EventTarget.prototype.dispatchEvent);
  const addL = bindCall(EventTarget.prototype.addEventListener);
  const NODE = Node.prototype;
  const g = (proto, name) => { const d = gOPD(proto, name); return d && d.get ? bindCall(d.get) : null; };
  const getParent = g(NODE, 'parentNode'), getConnected = g(NODE, 'isConnected'), getType = g(NODE, 'nodeType');
  const getText = g(NODE, 'textContent'), getNodeValue = g(NODE, 'nodeValue');
  const getHost = typeof ShadowRoot !== 'undefined' ? g(ShadowRoot.prototype, 'host') : null;
  const getEditable = g(HTMLElement.prototype, 'isContentEditable');
  const getActive = g(Document.prototype, 'activeElement');
  const getHead = g(Document.prototype, 'head');
  const getDesignMode = g(Document.prototype, 'designMode');
  const getTag = g(Element.prototype, 'tagName');
  const contains = bindCall(NODE.contains);
  const qsa = bindCall(Document.prototype.querySelectorAll);
  const nlLen = bindCall(gOPD(NodeList.prototype, 'length').get), nlItem = bindCall(NodeList.prototype.item);
  const MR = MutationRecord.prototype;
  const rType = g(MR, 'type'), rTarget = g(MR, 'target'), rOld = g(MR, 'oldValue'), rAdded = g(MR, 'addedNodes'), rRemoved = g(MR, 'removedNodes');
  const obsObserve = bindCall(MO.prototype.observe);

  // ---------- structured call-site access (cannot be spoofed with //# sourceURL) ----------
  let CSP = null, ownFile = '';
  try {
    const probe = {}, prev = E.prepareStackTrace;
    E.prepareStackTrace = (e, cs) => cs;
    captureST(probe);
    const cs0 = probe.stack;
    E.prepareStackTrace = prev;
    CSP = gPO(cs0[0]);
    ownFile = R_apply(CSP.getFileName, cs0[0], []) || '';
  } catch (_) { CSP = null; }
  const csFile = CSP && bindCall(CSP.getFileName), csEval = CSP && bindCall(CSP.isEval), csFn = CSP && bindCall(CSP.getFunctionName), csEvalOrigin = CSP && bindCall(CSP.getEvalOrigin);

  // ---------- origin allow-list (what counts as "the page's own script") ----------
  let armed = false;
  const docOrigin = S(location.origin || '');
  const docHost = str.lower(S(location.hostname || ''));
  const baseHost = str.startsWith(docHost, 'www.') ? str.slice(docHost, 4) : docHost;
  const docUrlNoHash = S(location.href).split('#')[0];
  const allowedOrigins = new Set();
  function originOf(u) {            // scheme://host[:port] of an http(s) URL, '' otherwise (no regex: RegExp.prototype is page-patchable)
    u = S(u); let i;
    if (str.startsWith(u, 'https://')) i = 8; else if (str.startsWith(u, 'http://')) i = 7; else return '';
    let j = i; const n = u.length;
    while (j < n) { const c = str.charCodeAt(u, j); if (c === 47 || c === 63 || c === 35) break; j++; }   // / ? #
    return str.lower(str.slice(u, 0, j));
  }
  function hostFromOrigin(o) { const i = str.indexOf(o, '://'); let h = str.slice(o, i + 3); const c = str.indexOf(h, ':'); return c > -1 ? str.slice(h, 0, c) : h; }
  function learnOrigins() {
    try {
      const s = qsa(D, 'script[src]');
      for (let i = 0; i < s.length; i++) { const o = originOf(s[i].src); if (o) sAdd(allowedOrigins, o); }
      const ents = performance.getEntriesByType('resource');
      for (let i = 0; i < ents.length; i++) if (ents[i].initiatorType === 'script') { const o = originOf(ents[i].name); if (o) sAdd(allowedOrigins, o); }
    } catch (_) {}
  }
  function isAppUrl(u) {
    const o = originOf(u);
    if (!o) return false;
    if (!armed) return true;                                    // hydration: origins not learned yet; extension/anonymous/eval are still rejected
    if (sHas(allowedOrigins, o) || o === docOrigin) return true;
    const h = hostFromOrigin(o), scheme = str.slice(o, 0, str.indexOf(o, '://'));
    return str.startsWith(docOrigin, scheme + '://') && (h === baseHost || str.endsWith(h, '.' + baseHost));
  }
  const isHandlerName = (n) => { if (!n || n.length < 3 || n.length > 20 || str.slice(n, 0, 2) !== 'on') return false; for (let i = 2; i < n.length; i++) { const c = str.charCodeAt(n, i); if (c < 97 || c > 122) return false; } return true; };

  // ---------- provenance of the current call ----------
  const OK = { ok: true, reason: 'page-script' };
  const bad = (reason, hard) => ({ ok: false, reason, hard: !!hard });   // hard = unmistakably not page code (recorded even before arming)
  function classify() {
    if (!CSP) return bad('call-site-api-unavailable');
    const o = {}, prevPrep = E.prepareStackTrace, prevLim = E.stackTraceLimit;
    let frames = null;
    try { E.stackTraceLimit = 40; E.prepareStackTrace = (e, cs) => cs; captureST(o, classify); frames = o.stack; }
    catch (_) { frames = null; }
    try { E.prepareStackTrace = prevPrep; E.stackTraceLimit = prevLim; } catch (_) {}
    if (!frames || typeof frames === 'string' || typeof frames.length !== 'number') return bad('stack-unavailable');
    let sawApp = false;
    for (let i = 0; i < frames.length; i++) {
      let file, isEval, fn, eo;
      try { file = csFile(frames[i]); isEval = csEval(frames[i]); fn = csFn(frames[i]); eo = isEval ? csEvalOrigin(frames[i]) : ''; } catch (_) { return bad('stack-forged'); }
      if (file === ownFile) continue;
      if (isEval) {                                                // new Function/eval is fine only if it was created by a page script
        const at = eo ? str.indexOf(S(eo), 'http') : -1;
        if (at > -1 && isAppUrl(str.slice(S(eo), at))) { sawApp = true; continue; }
        return bad('code from eval or new Function that the page did not create', true);
      }
      if (!file) return bad('an anonymous script, such as the DevTools console', true);
      if (file === docUrlNoHash && isHandlerName(fn)) return bad('an inline event-handler attribute (' + fn + ')', true);
      if (file === docUrlNoHash || isAppUrl(file)) { sawApp = true; continue; }
      return bad('a script that is not part of the page, such as a userscript or another extension', true);
    }
    return sawApp ? OK : bad('a browser function called with no page script behind it');
  }

  // ---------- attestation (closure-private, valid for the current task only) ----------
  const attest = new Map();
  let flushScheduled = false;
  function mark(node, info) {
    if (!node) return;
    const old = mGet(attest, node);
    mSet(attest, node, old && !old.ok ? old : (old && !info.ok ? info : (old ? old : info)));
    if (!flushScheduled) { flushScheduled = true; setT(() => { flushScheduled = false; mClear(attest); }, 0); }
  }
  function safe(f) { try { return f(); } catch (_) { return null; } }
  function parentOrHost(n) { const p = getParent(n); if (p) return p; return (getHost && getType(n) === 11) ? safe(() => getHost(n)) : null; }
  function lookup(n) { for (let h = 0; n && h < 256; h++) { const i = mGet(attest, n); if (i) return i; n = parentOrHost(n); } return null; }

  // ---------- hook installation ----------
  const installed = [];
  function targetsFor(kind, self, args) {
    const out = [];
    const push = (n) => { if (!n) return; for (let i = 0; i < out.length; i++) if (out[i] === n) return; arrPush(out, n); };
    const parentOfArgs = () => { for (let i = 0; i < args.length; i++) { const a = args[i]; if (a && typeof a === 'object') { const p = safe(() => getParent(a)); if (p) push(p); } } };
    switch (kind) {
      case 'self': push(self); break;
      case 'parent': push(safe(() => getParent(self))); break;
      case 'selfAndArgParents': push(self); parentOfArgs(); break;
      case 'childOps': push(safe(() => getParent(self))); parentOfArgs(); break;
      case 'adjacent': { const pos = str.lower(S(args[0])); push(pos === 'beforebegin' || pos === 'afterend' ? safe(() => getParent(self)) : self); break; }
      case 'split': push(self); push(safe(() => getParent(self))); break;
      case 'range': push(self.startContainer); push(self.endContainer); push(self.commonAncestorContainer); break;
      case 'doc': push(D.documentElement); push(D.body); break;
      case 'selection': { const s = safe(() => getSelection()); if (s) { push(s.anchorNode); push(s.focusNode); } push(safe(() => getActive(D))); break; }
    }
    return out;
  }
  function before(kind, self, args) {
    const ts = targetsFor(kind, self, args);
    let conn = false;
    for (let i = 0; i < ts.length; i++) if (safe(() => getConnected(ts[i]))) { conn = true; break; }
    if (!conn) return;                               // detached subtrees are not observable; skip the stack walk
    const info = classify();
    for (let i = 0; i < ts.length; i++) mark(ts[i], info);
    return info;
  }
  function hookMethod(proto, name, kind, extra) {
    try {
      if (!proto || !hasOwn(proto, name)) return;
      const d = gOPD(proto, name); const orig = d.value; if (typeof orig !== 'function') return;
      const w = function hookedMethod() { const info = before(kind, this, arguments); if (extra) extra(this, arguments, info); return R_apply(orig, this, arguments); };
      dP(proto, name, { value: w, writable: d.writable, configurable: d.configurable, enumerable: d.enumerable });
      arrPush(installed, { proto, name, prop: 'value', fn: w });
    } catch (_) {}
  }
  function hookSetter(proto, name, kind, extra) {
    try {
      if (!proto) return;
      const d = gOPD(proto, name); if (!d || !d.set) return; const orig = d.set;
      const w = function hookedSetter(v) { const info = before(kind, this, arguments); if (extra) extra(this, arguments, info); return R_apply(orig, this, [v]); };
      dP(proto, name, { get: d.get, set: w, configurable: d.configurable, enumerable: d.enumerable });
      arrPush(installed, { proto, name, prop: 'set', fn: w });
    } catch (_) {}
  }
  let designModeSuspect = false, designModeEverOn = false;
  const suspectEditable = new WeakSet();
  hookSetter(NODE, 'textContent', 'self');
  hookSetter(NODE, 'nodeValue', 'self');
  hookSetter(CharacterData.prototype, 'data', 'self');
  hookSetter(HTMLElement.prototype, 'innerText', 'self');
  hookSetter(HTMLElement.prototype, 'outerText', 'parent');
  hookSetter(Element.prototype, 'innerHTML', 'self');
  hookSetter(Element.prototype, 'outerHTML', 'parent');
  if (typeof ShadowRoot !== 'undefined') hookSetter(ShadowRoot.prototype, 'innerHTML', 'self');
  for (const m of ['appendChild', 'insertBefore', 'replaceChild', 'removeChild']) hookMethod(NODE, m, 'selfAndArgParents');
  for (const p of [Element.prototype, Document.prototype, DocumentFragment.prototype]) for (const m of ['append', 'prepend', 'replaceChildren']) hookMethod(p, m, 'selfAndArgParents');
  for (const p of [Element.prototype, CharacterData.prototype]) for (const m of ['before', 'after', 'replaceWith', 'remove']) hookMethod(p, m, 'childOps');
  for (const m of ['insertAdjacentHTML', 'insertAdjacentText', 'insertAdjacentElement']) hookMethod(Element.prototype, m, 'adjacent');
  for (const m of ['setHTMLUnsafe', 'setHTML']) hookMethod(Element.prototype, m, 'self');
  for (const m of ['appendData', 'insertData', 'deleteData', 'replaceData']) hookMethod(CharacterData.prototype, m, 'self');
  hookMethod(Text.prototype, 'splitText', 'split');
  hookMethod(NODE, 'moveBefore', 'selfAndArgParents');
  hookMethod(NODE, 'normalize', 'self');
  if (typeof Selection !== 'undefined') hookMethod(Selection.prototype, 'deleteFromDocument', 'selection');
  for (const m of ['deleteContents', 'extractContents', 'insertNode', 'surroundContents']) hookMethod(Range.prototype, m, 'range');
  for (const m of ['write', 'writeln', 'open', 'close']) hookMethod(Document.prototype, m, 'doc');
  hookMethod(Document.prototype, 'execCommand', 'selection');
  // editability changes
  const noteEditable = (self, args, info) => { if (info && !info.ok) wsAdd(suspectEditable, self); };
  hookMethod(Element.prototype, 'setAttribute', 'self', (self, args, info) => { if (info && !info.ok && str.lower(S(args[0])) === 'contenteditable') wsAdd(suspectEditable, self); });
  hookSetter(HTMLElement.prototype, 'contentEditable', 'self', noteEditable);
  hookSetter(Document.prototype, 'designMode', 'doc', (self, args, info) => {
    if (str.lower(S(args[0])) === 'on') designModeEverOn = true;      // SafeTrail: remembered even if it is switched off again
    if (info && !info.ok) designModeSuspect = true;
  });
  // attachShadow: observe every shadow root (including closed ones) from this private observer
  (() => {
    try {
      const d = gOPD(Element.prototype, 'attachShadow'); if (!d || typeof d.value !== 'function') return;
      const orig = d.value;
      const w = function attachShadowHooked() { const root = R_apply(orig, this, arguments); try { observeRoot(root); } catch (_) {} return root; };
      dP(Element.prototype, 'attachShadow', { value: w, writable: d.writable, configurable: d.configurable, enumerable: d.enumerable });
      arrPush(installed, { proto: Element.prototype, name: 'attachShadow', prop: 'value', fn: w });
    } catch (_) {}
  })();

  // ---------- trusted user input (for native typing in genuine editors) ----------
  let lastTrustedInput = 0;
  for (const t of ['keydown', 'keyup', 'input', 'beforeinput', 'compositionend', 'paste', 'cut', 'drop']) {
    addL(W, t, (e) => { if (e.isTrusted) lastTrustedInput = now(); }, true);
  }
  function editableGate(node) {
    if (designModeSuspect || now() - lastTrustedInput > 800) return false;
    let el = getType(node) === 1 ? node : parentOrHost(node);
    if (!el || getType(el) !== 1 || !safe(() => getEditable(el))) return false;
    for (let n = el, h = 0; n && h < 256; n = parentOrHost(n), h++) if (wsHas(suspectEditable, n)) return false;
    const a = safe(() => getActive(D));
    return !!(a && (a === el || contains(el, a) || contains(a, el)));
  }

  // ---------- what to ignore ----------
  const EXT_PREFIXES = ['com-1password', 'onepassword', 'op-', 'grammarly-', 'lastpass', 'bitwarden', 'dashlane', 'darkreader', 'nordpass'];
  const extHosts = new WeakSet();
  function isExtTag(tag) { for (let i = 0; i < EXT_PREFIXES.length; i++) if (str.startsWith(tag, EXT_PREFIXES[i])) return true; return false; }
  function noteExtHost(n) { try { if (getType(n) === 1 && isExtTag(str.lower(safe(() => getTag(n)) || '')) && !(getText(n) || '')) wsAdd(extHosts, n); } catch (_) {} }
  function registerExtHostsAtArm() { for (const root of [D.documentElement, D.body]) { if (!root) continue; const k = root.children; for (let i = 0; i < k.length; i++) noteExtHost(k[i]); } }
  const META_TAGS = { TITLE: 1, STYLE: 1, SCRIPT: 1, NOSCRIPT: 1, TEMPLATE: 1, LINK: 1, META: 1, HEAD: 1 };
  function ignoredTarget(node) {
    const head = safe(() => getHead(D));
    for (let n = node, h = 0; n && h < 256; n = parentOrHost(n), h++) {
      if (n === head) return true;
      if (getType(n) === 1) {
        const tag = safe(() => getTag(n)) || '';
        if (META_TAGS[tag]) return true;
        if (wsHas(extHosts, n)) return true;
      }
    }
    return false;
  }
  function textOfNodes(list) {
    let s = '';
    for (let i = 0, len = nlLen(list); i < len; i++) {
      const n = nlItem(list, i), t = getType(n);
      if (t === 3) s += getNodeValue(n) || '';
      else if (t === 1 && !META_TAGS[safe(() => getTag(n)) || '']) s += getText(n) || '';
    }
    return str.trim(s);
  }

  // ---------- incidents (kept here; never shown on the page or sent anywhere) ----------
  // Each is { reason, node, added }: the place that changed and any nodes that
  // were put there. The changed text itself is not kept.
  const incidents = [];
  let storm = false, analysisFailures = 0, hooksReplaced = 0;
  function record(reason, node, added) {
    if (incidents.length >= 200) { storm = true; return; }
    arrPush(incidents, { reason, node, added });
  }

  function onRecords(records) {
    checkIntegrity();
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      let stage = 'verdict';
      try {
        const t = rTarget(r);
        const type = rType(r);
        const v = lookup(t);
        if (!armed) { if (!(v && !v.ok && v.hard && type !== 'attributes')) continue; }   // hydration: only unmistakably foreign hooked writes are judged
        if (type === 'attributes') { if (!(v && v.ok)) wsAdd(suspectEditable, t); continue; }
        if (v && v.ok) continue;                              // produced by a page-served script (fast path)
        stage = 'content';
        if (ignoredTarget(t)) continue;
        const added = [];
        if (type === 'characterData') {
          if (str.trim(rOld(r) || '') === str.trim(getNodeValue(t) || '')) continue;
        } else {
          const an = rAdded(r), rn = rRemoved(r);
          if (textOfNodes(rn) === textOfNodes(an)) continue;   // nothing a reader would see changed
          for (let k = 0, n = nlLen(an); k < n; k++) arrPush(added, nlItem(an, k));
        }
        stage = 'gate';
        if (!v && editableGate(t)) continue;                  // genuine human typing in a genuine editor (never excuses a hooked, non-page write)
        stage = 'record';
        record(v ? v.reason : 'an edit made without any script, such as the DevTools Elements panel or another extension', t, added);
      } catch (_) {
        // Fail closed: if the analysis was disturbed (for example poisoned built-ins), it counts against the page.
        analysisFailures++;
      }
    }
  }

  const observer = new MO(onRecords);
  const OBS = { childList: true, subtree: true, characterData: true, characterDataOldValue: true, attributes: true, attributeFilter: ['contenteditable'] };
  function observeRoot(root) { obsObserve(observer, root, OBS); }
  try { observeRoot(D); } catch (_) {}
  const seenRoots = new WeakSet();
  function sweepRoots() {
    try {
      const tw = D.createTreeWalker(D.documentElement, 1 /* SHOW_ELEMENT */);
      const stack = [tw];
      while (stack.length) {
        const w = stack.pop();
        for (let n = w.currentNode; n; n = w.nextNode()) {
          const sr = safe(() => n.shadowRoot);
          if (sr && !wsHas(seenRoots, sr)) { wsAdd(seenRoots, sr); try { observeRoot(sr); } catch (_) {} arrPush(stack, D.createTreeWalker(sr, 1)); }
        }
      }
    } catch (_) {}
  }

  // ---------- integrity of our own hooks ----------
  const warned = new Set();
  function checkIntegrity() {
    let intact = true;
    for (let i = 0; i < installed.length; i++) {
      const h = installed[i];
      const d = safe(() => gOPD(h.proto, h.name));
      const cur = d && (h.prop === 'set' ? d.set : d.value);
      if (cur !== h.fn) {
        intact = false;
        const key = (h.proto === NODE ? 'Node' : (safe(() => h.proto.constructor.name) || '?')) + '.' + h.name;
        if (!sHas(warned, key)) {
          sAdd(warned, key);
          hooksReplaced++;
          // re-install our hook so protection continues; the replacement itself stays on record
          try { dP(h.proto, h.name, h.prop === 'set' ? { get: d && d.get, set: h.fn, configurable: true, enumerable: true } : { value: h.fn, writable: true, configurable: true, enumerable: false }); } catch (_) {}
        }
      }
    }
    return intact;
  }

  // ---------- arming (initial hydration is not judged) ----------
  function arm() {
    learnOrigins(); armed = true; sweepRoots(); registerExtHostsAtArm();
    if (str.lower(S(safe(() => getDesignMode(D)) || '')) === 'on') designModeEverOn = true;
  }
  function armSoon() { setT(arm, 400); }
  if (D.readyState === 'complete') armSoon(); else addL(W, 'load', armSoon, { once: true, capture: true });
  setI(() => { if (armed && D.visibilityState === 'visible') sweepRoots(); }, 5000);
  setT(() => { if (!armed) armSoon(); }, 6000);   // pages whose load event never fires

  // ---------- private channel to the isolated-world bridge ----------
  // A MessagePort handed over once at document_start. Page code sees no events
  // and cannot forge answers. (Residual: a script that ran before this guard.)
  let port = null;
  const portPost = bindCall(MessagePort.prototype.postMessage), portStart = bindCall(MessagePort.prototype.start), portAdd = bindCall(MessagePort.prototype.addEventListener);
  const msgData = g(MessageEvent.prototype, 'data'), msgPorts = g(MessageEvent.prototype, 'ports'), stopImm = bindCall(Event.prototype.stopImmediatePropagation);
  function needPort() { try { dispatch(W, new CE('safetrail:need-port')); } catch (_) {} }
  addL(W, 'message', (e) => {
    if (port) return;
    try {
      const d = msgData(e); if (!d || typeof d !== 'object' || d.__safetrail !== 'port') return;
      const ps = msgPorts(e); if (!ps || ps.length !== 1 || !e.isTrusted) return;
      stopImm(e); port = ps[0];
      portAdd(port, 'message', (m) => { try { handleCmd(JSONp(msgData(m))); } catch (_) {} });
      portStart(port);
      portPost(port, 'hello');
    } catch (_) {}
  }, true);
  needPort();
  const portTimer = setI(() => { if (port) clearI(portTimer); else needPort(); }, 1000);

  // Is `n` inside `root`, counting shadow trees?
  function within(root, n) { for (let h = 0; n && h < 512; n = parentOrHost(n), h++) if (n === root) return true; return false; }
  const USERSCRIPT_GLOBALS = ['GM_info', 'GM', 'unsafeWindow', 'GM_getValue', 'GM_xmlhttpRequest', 'Tampermonkey', 'Violentmonkey', 'Greasemonkey'];
  function validMark(m) {           // "data-st-" + lowercase letters and digits; checked without a regex
    if (typeof m !== 'string' || m.length < 12 || m.length > 48 || !str.startsWith(m, 'data-st-')) return false;
    for (let i = 8; i < m.length; i++) { const c = str.charCodeAt(m, i); if (!((c >= 97 && c <= 122) || (c >= 48 && c <= 57))) return false; }
    return true;
  }

  /**
   * The bridge marks the elements about to be captured with a throw-away
   * attribute and asks what happened to them. An incident counts against the
   * capture when the change is inside a marked element, or put something
   * there that contains one. Changes elsewhere on the page are only counted.
   */
  function handleCmd(c) {
    if (!c || c.op !== 'query' || typeof c.id !== 'string' || c.id.length > 64 || !port) return;
    const targets = [];
    if (validMark(c.mark)) { const found = safe(() => qsa(D, '[' + c.mark + ']')); if (found) for (let i = 0; i < found.length && i < 500; i++) arrPush(targets, found[i]); }
    const intact = checkIntegrity();
    const reasons = []; let elsewhere = 0;
    for (let i = 0; i < incidents.length; i++) {
      const inc = incidents[i]; let hit = false;
      for (let t = 0; t < targets.length && !hit; t++) {
        const T = targets[t];
        if (within(T, inc.node)) hit = true;
        for (let k = 0; k < inc.added.length && !hit; k++) if (within(T, inc.added[k]) || within(inc.added[k], T)) hit = true;
      }
      if (!hit) { elsewhere++; continue; }
      let dup = false; for (let q = 0; q < reasons.length; q++) if (reasons[q] === inc.reason) dup = true;
      if (!dup && reasons.length < 5) arrPush(reasons, inc.reason);
    }
    const globals = []; for (let i = 0; i < USERSCRIPT_GLOBALS.length; i++) if (USERSCRIPT_GLOBALS[i] in W) arrPush(globals, USERSCRIPT_GLOBALS[i]);
    const designNow = str.lower(S(safe(() => getDesignMode(D)) || '')) === 'on';
    // Built from primitives only: a page-defined toJSON must not be able to shape the answer.
    let hits = ''; for (let i = 0; i < reasons.length; i++) hits += (i ? ',' : '') + JSONs(S(reasons[i]));
    let gl = ''; for (let i = 0; i < globals.length; i++) gl += (i ? ',' : '') + JSONs(globals[i]);
    const reply = '{"id":' + JSONs(c.id) + ',"armed":' + (armed ? 'true' : 'false') + ',"callSites":' + (CSP ? 'true' : 'false') +
      ',"intact":' + (intact && hooksReplaced === 0 ? 'true' : 'false') + ',"analysisFailed":' + (analysisFailures > 0 ? 'true' : 'false') +
      ',"storm":' + (storm ? 'true' : 'false') + ',"targets":' + targets.length + ',"designModeEverOn":' + (designModeEverOn || designNow ? 'true' : 'false') +
      ',"userscriptGlobals":[' + gl + '],"hits":[' + hits + '],"elsewhere":' + elsewhere + '}';
    try { portPost(port, reply); } catch (_) {}
  }
})();
