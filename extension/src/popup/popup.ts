import { captureHost, CHECKS, type AuthState, type CaptureRecord, type LastCapture, type Reply } from "../shared/types";

const app = document.getElementById("app")!;
const send = <T>(msg: unknown) => chrome.runtime.sendMessage(msg) as Promise<Reply<T>>;

type Status = { auth: AuthState; lastCapture: LastCapture | null; history: CaptureRecord[] };

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
    ...(error ? [h("p", { class: "note attention", role: "alert" }, error)] : []),
    form,
    h("p", { class: "helper" }, "No account yet? ", h("a", { href: `${__APP_URL__}/sign-up`, target: "_blank", rel: "noopener" }, "Create one")),
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** What was captured from this browser, newest first. */
function historyList(history: CaptureRecord[]): Node[] {
  if (history.length === 0) return [];
  return [
    h("h2", {}, "History"),
    h(
      "ul",
      { class: "history" },
      ...history.map((c) =>
        h(
          "li",
          {},
          h("a", { href: c.url, target: "_blank", rel: "noopener", title: c.label }, c.label),
          h("span", { class: "row" }, h("span", { class: "helper" }, when(c.at)), h("span", { class: "badge" }, "Tamper checked")),
        ),
      ),
    ),
  ];
}

/** The question-mark button and the panel it opens: what the extension checks before it saves anything. */
function checksHelp(): { button: HTMLButtonElement; panel: HTMLElement } {
  const panel = h(
    "div",
    { class: "card", id: "checks-help", hidden: "" },
    h("p", { class: "strong" }, "Checks run at capture"),
    h("ul", { class: "checks" }, ...CHECKS.map((c) => h("li", {}, c))),
  );
  const button = h("button", { type: "button", class: "icon", "aria-label": "Checks run at capture", "aria-expanded": "false", "aria-controls": "checks-help" }, "?");
  button.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", String(!panel.hidden));
  });
  return { button, panel };
}

async function renderReady(auth: Extract<AuthState, { signedIn: true }>, status: Status, error?: string) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const supported = Boolean(tab?.url && captureHost(tab.url));
  const capture = h("button", { type: "button", class: "primary" }, "Capture this page");
  if (!supported) capture.disabled = true;
  capture.addEventListener("click", async () => {
    capture.disabled = true;
    const reply = await send({ type: "capture:start" });
    if (reply.ok) window.close();
    else void renderReady(auth, status, reply.error);
  });
  const signOut = h("button", { type: "button", class: "ghost" }, "Sign out");
  signOut.addEventListener("click", async () => {
    await send({ type: "auth:signOut" });
    void render();
  });
  const help = checksHelp();
  const failed = status.lastCapture && !status.lastCapture.ok ? status.lastCapture.message : null;

  app.replaceChildren(
    h("div", { class: "title" }, h("h1", {}, "Capture evidence"), help.button),
    help.panel,
    ...(error ? [h("p", { class: "note attention", role: "alert" }, error)] : []),
    ...(supported
      ? []
      : [h("p", { class: "note info" }, "Open the Facebook post or Messenger conversation you want to keep, then open this again.")]),
    capture,
    ...(failed ? [h("p", { class: "note attention" }, failed)] : []),
    ...historyList(status.history),
    h("div", { class: "account" }, h("span", { class: "helper" }, auth.email), signOut),
  );
}

async function render() {
  const reply = await send<Status>({ type: "auth:status" }).catch(
    (): Reply<Status> => ({ ok: false, error: "The extension couldn't start. Close this and open it again." }),
  );
  if (!reply.ok) {
    app.replaceChildren(h("p", { class: "note attention" }, reply.error));
    return;
  }
  if (!reply.auth.signedIn) renderSignedOut();
  else await renderReady(reply.auth, reply);
}

void render();
