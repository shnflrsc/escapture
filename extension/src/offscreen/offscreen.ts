// Offscreen document: lays a finished capture out at the widths the SafeTrail
// viewer uses and reports how tall it comes out. The viewer may not run
// scripts or look inside its frame, so the capture's height has to be known
// in advance; this is the only place it can be measured exactly.
//
// The capture is loaded in a frame that cannot run scripts. It has none
// anyway (the snapshot strips them), and everything it shows is embedded.

type Measure = { target: "offscreen"; type: "measure"; html: string; widths: number[] };

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function measure(html: string, widths: number[]): Promise<{ w: number; h: number }[]> {
  const frame = document.createElement("iframe");
  // Same-origin so its layout can be read from here; no allow-scripts.
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.style.cssText = "position:absolute;left:0;top:0;border:0;height:600px";
  frame.style.width = `${widths[0]}px`;
  const loaded = new Promise<void>((resolve) => frame.addEventListener("load", () => resolve(), { once: true }));
  frame.srcdoc = html;
  document.body.appendChild(frame);
  try {
    await Promise.race([loaded, settle(4000)]);
    const out: { w: number; h: number }[] = [];
    for (const w of widths) {
      frame.style.width = `${w}px`;
      await settle(30);
      const body = frame.contentDocument?.body;
      if (!body) break;
      // The body's own height: the content plus the capture's padding, whatever the frame's height.
      out.push({ w, h: Math.ceil(body.getBoundingClientRect().height) });
    }
    return out;
  } finally {
    frame.remove();
  }
}

chrome.runtime.onMessage.addListener((msg: Measure, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || msg?.target !== "offscreen" || msg.type !== "measure") return false;
  measure(msg.html, msg.widths).then(
    (fit) => sendResponse({ ok: true, fit }),
    () => sendResponse({ ok: false }),
  );
  return true;
});
