// Isolated-world side of the page guard, loaded at document_start.
//
// It hands the MAIN-world guard one end of a MessageChannel and keeps the
// other. After that handshake nothing is dispatched as a page-visible event:
// page code can neither read the guard's answers nor forge them. The capture
// script, injected later into this same isolated world, asks through
// `globalThis.__safetrailBridge`.
//
// Ported from the DOM Tamper Detector extension's content.js (the channel
// only; its toasts, popup state and script verification are not used here).
import type { GuardState } from "./checks";

declare global {
  var __safetrailBridge: { query(mark: string): Promise<GuardState | null> } | undefined;
}

if (!globalThis.__safetrailBridge) {
  let chan: MessagePort | null = null;
  const offered: MessageChannel[] = [];
  const waiting = new Map<string, (state: GuardState | null) => void>();

  function offerPort() {
    if (chan || offered.length >= 6) return;
    const mc = new MessageChannel();
    offered.push(mc);
    mc.port1.onmessage = (e) => {
      // The guard answers on the port it accepted; the others are closed.
      if (!chan) {
        chan = mc.port1;
        for (const o of offered) if (o !== mc) o.port1.close();
      }
      if (chan !== mc.port1 || typeof e.data !== "string" || e.data === "hello") return;
      let reply: (GuardState & { id?: unknown }) | null = null;
      try {
        reply = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!reply || typeof reply.id !== "string") return;
      const resolve = waiting.get(reply.id);
      waiting.delete(reply.id);
      resolve?.(reply);
    };
    try {
      window.postMessage({ __safetrail: "port" }, "*", [mc.port2]);
    } catch {}
  }

  window.addEventListener("safetrail:need-port", offerPort, true);
  offerPort();

  globalThis.__safetrailBridge = {
    /**
     * Asks the guard what happened to the elements carrying the attribute
     * `mark`. Resolves null when no guard is listening (the extension was
     * installed or reloaded after this page loaded).
     */
    query(mark: string) {
      return new Promise<GuardState | null>((resolve) => {
        if (!chan) return resolve(null);
        const id = crypto.randomUUID();
        const timer = setTimeout(() => {
          waiting.delete(id);
          resolve(null);
        }, 800);
        waiting.set(id, (state) => {
          clearTimeout(timer);
          resolve(state);
        });
        chan.postMessage(JSON.stringify({ op: "query", id, mark }));
      });
    },
  };
}
