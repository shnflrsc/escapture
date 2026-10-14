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
import type { GuardAnswer, GuardState } from "./checks";

declare global {
  var __safetrailBridge: { query(mark: string): Promise<GuardAnswer> } | undefined;
}

// A page that has just woken from the background (Facebook re-renders its feed) can keep the main
// thread busy for seconds, and the guard answers on that same thread. Wait, and ask again, before
// calling it unanswered.
const WAIT_MS = 2500;
const ATTEMPTS = 3;

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

  function ask(port: MessagePort, mark: string) {
    return new Promise<GuardState | null>((resolve) => {
      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        waiting.delete(id);
        resolve(null);
      }, WAIT_MS);
      waiting.set(id, (state) => {
        clearTimeout(timer);
        resolve(state);
      });
      port.postMessage(JSON.stringify({ op: "query", id, mark }));
    });
  }

  window.addEventListener("safetrail:need-port", offerPort, true);
  offerPort();

  globalThis.__safetrailBridge = {
    /**
     * Asks the guard what happened to the elements carrying the attribute
     * `mark`. Resolves "no-port" when the guard never answered the handshake,
     * and "slow" when it is connected but didn't answer in time.
     */
    async query(mark: string): Promise<GuardAnswer> {
      if (!chan) return "no-port";
      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        const answer = await ask(chan, mark);
        if (answer) return answer;
      }
      return "slow";
    },
  };
}
