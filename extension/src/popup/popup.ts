import { captureHost, type AuthState, type LastCapture, type Reply } from "../shared/types";

const app = document.getElementById("app")!;
const send = <T>(msg: unknown) => chrome.runtime.sendMessage(msg) as Promise<Reply<T>>;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, string> = {}, ...children: (Node | string)[]) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else el.setAttribute(k, v);
  }
  el.append(...children);
  return el;
}

function renderSignedOut(error?: string) {
  const email = h("input", { type: "email", name: "email", autocomplete: "username", required: "" });
  const password = h("input", { type: "password", name: "password", autocomplete: "current-password", required: "" });
  const submit = h("button", { type: "submit", class: "primary" }, "Sign in to SafeTrail");
  const form = h("form", {}, h("label", {}, "SafeTrail email", email), h("label", {}, "Password", password), submit);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submit.disabled = true;
    submit.textContent = "Signing in";
    const reply = await send<{ auth: AuthState }>({ type: "auth:signIn", email: email.value.trim(), password: password.value });
    if (reply.ok) void render();
    else renderSignedOut(reply.error);
  });
  app.replaceChildren(
    h("h1", {}, "Sign in to capture"),
    h("p", { class: "helper" }, "Use your SafeTrail account. Captures are saved to your private vault."),
    ...(error ? [h("p", { class: "note attention", role: "alert" }, error)] : []),
    form,
    h("p", { class: "helper" }, "No account yet? ", h("a", { href: `${__APP_URL__}/sign-up`, target: "_blank", rel: "noopener" }, "Create one")),
  );
}

function lastCaptureCard(last: LastCapture | null): Node[] {
  if (!last) return [];
  if (last.ok) {
    return [
      h(
        "div",
        { class: "card" },
        h("p", {}, "Saved to your vault"),
        h("span", { class: "badge" }, "Captured with tamper checks"),
        h("p", { class: "helper" }, last.label),
        h("a", { href: last.url, target: "_blank", rel: "noopener" }, "Open in vault"),
      ),
    ];
  }
  return [h("p", { class: "note attention" }, last.message)];
}

async function renderReady(auth: Extract<AuthState, { signedIn: true }>, last: LastCapture | null, error?: string) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const supported = Boolean(tab?.url && captureHost(tab.url));
  const capture = h("button", { type: "button", class: "primary" }, "Capture this page");
  if (!supported) capture.disabled = true;
  capture.addEventListener("click", async () => {
    capture.disabled = true;
    const reply = await send({ type: "capture:start" });
    if (reply.ok) window.close();
    else void renderReady(auth, last, reply.error);
  });
  const signOut = h("button", { type: "button", class: "ghost" }, "Sign out");
  signOut.addEventListener("click", async () => {
    await send({ type: "auth:signOut" });
    void render();
  });

  app.replaceChildren(
    h("h1", {}, "Capture evidence"),
    ...(error ? [h("p", { class: "note attention", role: "alert" }, error)] : []),
    supported
      ? h("p", { class: "helper" }, "Choose Capture this page, then click the post or the messages you want to keep.")
      : h("p", { class: "note info" }, "Open the Facebook post or Messenger conversation you want to keep, then open this again."),
    capture,
    h("p", { class: "helper" }, "Messenger captures include only the messages loaded on screen. Capturing messages is meant for conversations you took part in."),
    ...lastCaptureCard(last),
    h("div", { class: "account" }, h("span", { class: "helper" }, auth.email), signOut),
  );
}

async function render() {
  const reply = await send<{ auth: AuthState; lastCapture: LastCapture | null }>({ type: "auth:status" }).catch(
    (): Reply<{ auth: AuthState; lastCapture: LastCapture | null }> => ({ ok: false, error: "The extension couldn't start. Close this and open it again." }),
  );
  if (!reply.ok) {
    app.replaceChildren(h("p", { class: "note attention" }, reply.error));
    return;
  }
  if (!reply.auth.signedIn) renderSignedOut();
  else await renderReady(reply.auth, reply.lastCapture);
}

void render();
