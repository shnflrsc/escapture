"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, ApiError } from "@/lib/client-api";
import { initials } from "@/lib/format";
import { mapIndex, mergeText } from "@/lib/merge";

type Field = "title" | "description";
type Texts = Record<Field, string>;
export type Collaborator = {
  id: string;
  name: string;
  email: string;
  field: Field | null;
  start: number | null;
  end: number | null;
};
type Answer = { status: string; editable: boolean; others: Collaborator[] } & Texts;

// How often an open page checks in: often while visible, rarely in a background tab.
const TICK_MS = 500;
const HIDDEN_TICK_MS = 4000;
// After a keystroke, check in sooner than the next tick so others see it quickly.
const TYPED_MS = 150;
const FIELDS: Field[] = ["title", "description"];

// One color per person, from the design tokens, picked from their id so it stays the same on every screen.
const COLORS = [
  "var(--brand-700)",
  "var(--tamper-solid)",
  "var(--escalated-solid)",
  "var(--brand-400)",
  "var(--closed-solid)",
  "var(--tamper-fg)",
];
export function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

type Ctx = {
  text: Texts;
  others: Collaborator[];
  editable: boolean;
  offline: boolean;
  change: (field: Field, value: string) => void;
  register: (field: Field, el: HTMLInputElement | HTMLTextAreaElement | null) => void;
  /** The caret position to put back after someone else's edit moved the text under it, once. */
  takeRestore: (field: Field) => [number, number] | undefined;
};
const CollabContext = createContext<Ctx | null>(null);
const useCollab = () => {
  const ctx = useContext(CollabContext);
  if (!ctx) throw new Error("CollabField and PresenceAvatars belong inside CollabProvider.");
  return ctx;
};

/**
 * Keeps an open case live for everyone on it. A couple of times a second the page
 * sends what changed and where the caret is, and gets back the saved text merged
 * with everyone else's edits and who else has the case open. Edits typed while a
 * check-in is on its way are merged on top of the answer, so nothing is lost and
 * nobody is asked to choose between versions.
 */
export function CollabProvider({
  caseId,
  initial,
  editable: editableAtLoad,
  children,
}: {
  caseId: string;
  initial: Texts;
  editable: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [text, setText] = useState<Texts>(initial);
  const [others, setOthers] = useState<Collaborator[]>([]);
  const [editable, setEditable] = useState(editableAtLoad);
  const [offline, setOffline] = useState(false);

  const local = useRef<Texts>({ ...initial }); // what is in the fields now
  const saved = useRef<Texts>({ ...initial }); // the newest text the server confirmed
  const elements = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const restore = useRef<Partial<Record<Field, [number, number]>>>({});
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failures = useRef(0);
  const stopped = useRef(false);
  const tickRef = useRef<() => Promise<void>>(async () => {});

  const schedule = useCallback((ms: number) => {
    if (stopped.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void tickRef.current(), ms);
  }, []);

  function focus() {
    for (const field of FIELDS) {
      const el = elements.current[field];
      if (el && document.activeElement === el) {
        return { field, start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 };
      }
    }
    return null;
  }

  async function tick() {
    if (busy.current || stopped.current) return;
    busy.current = true;
    const sent = { ...local.current };
    const edits: Partial<Record<Field, { base: string; text: string }>> = {};
    if (editable) {
      for (const field of FIELDS) if (sent[field] !== saved.current[field]) edits[field] = { base: saved.current[field], text: sent[field] };
    }
    try {
      const answer = await api<Answer>(`/api/cases/${caseId}/live`, {
        body: { edits: Object.keys(edits).length ? edits : undefined, focus: focus() },
      });
      failures.current = 0;
      setOffline(false);
      saved.current = { title: answer.title, description: answer.description };
      let moved = false;
      for (const field of FIELDS) {
        const now = local.current[field];
        // Anything typed while this check-in was on its way goes on top of the answer.
        const next = now === sent[field] ? answer[field] : mergeText(sent[field], answer[field], now);
        if (next === now) continue;
        const el = elements.current[field];
        if (el && document.activeElement === el) {
          restore.current[field] = [mapIndex(now, next, el.selectionStart ?? 0), mapIndex(now, next, el.selectionEnd ?? 0)];
        }
        local.current[field] = next;
        moved = true;
      }
      if (moved) setText({ ...local.current });
      setOthers(answer.others);
      setEditable(answer.editable);
      // Escalated, or closed, by someone else: show the page as it now is.
      if (editable && !answer.editable) router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        stopped.current = true;
        router.push("/cases");
        router.refresh();
        return;
      }
      failures.current++;
      if (failures.current >= 3) setOffline(true);
    } finally {
      busy.current = false;
    }
    const pending = FIELDS.some((f) => local.current[f] !== saved.current[f]);
    const wait = document.visibilityState === "visible" ? TICK_MS : HIDDEN_TICK_MS;
    schedule(failures.current ? Math.min(wait * 2 ** failures.current, 8000) : pending ? TYPED_MS : wait);
  }

  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => {
    stopped.current = false;
    schedule(0);
    const wake = () => schedule(0);
    document.addEventListener("visibilitychange", wake);
    // Closing the tab: say so, so others stop seeing this person straight away.
    const leave = () => {
      void fetch(`/api/cases/${caseId}/live`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leave: true }),
      }).catch(() => {});
    };
    window.addEventListener("pagehide", leave);
    return () => {
      stopped.current = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [caseId, schedule]);

  const change = useCallback(
    (field: Field, value: string) => {
      local.current[field] = value;
      setText({ ...local.current });
      if (!busy.current) schedule(TYPED_MS);
    },
    [schedule],
  );
  const register = useCallback((field: Field, el: HTMLInputElement | HTMLTextAreaElement | null) => {
    elements.current[field] = el;
  }, []);
  const takeRestore = useCallback((field: Field) => {
    const keep = restore.current[field];
    delete restore.current[field];
    return keep;
  }, []);

  const value = useMemo<Ctx>(
    () => ({ text, others, editable, offline, change, register, takeRestore }),
    [text, others, editable, offline, change, register, takeRestore],
  );
  return <CollabContext.Provider value={value}>{children}</CollabContext.Provider>;
}

// The styles a hidden copy of a field needs so that its text wraps exactly like the field's.
const MIRRORED = [
  "boxSizing", "width", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "fontStyle", "fontVariant", "fontWeight",
  "fontStretch", "fontSize", "lineHeight", "fontFamily", "textAlign", "textTransform", "textIndent",
  "letterSpacing", "wordSpacing", "tabSize", "wordBreak", "overflowWrap",
] as const;

/** Where character `index` sits inside a text field, relative to the field's top-left corner. */
function caretPoint(el: HTMLInputElement | HTMLTextAreaElement, index: number) {
  const cs = getComputedStyle(el);
  const mirror = document.createElement("div");
  for (const p of MIRRORED) mirror.style[p] = cs[p];
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.whiteSpace = el.tagName === "INPUT" ? "pre" : "pre-wrap";
  mirror.style.overflowWrap = el.tagName === "INPUT" ? "normal" : "break-word";
  mirror.textContent = el.value.slice(0, index);
  const marker = document.createElement("span");
  marker.textContent = el.value.slice(index) || ".";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const point = {
    x: marker.offsetLeft - el.scrollLeft,
    y: marker.offsetTop - el.scrollTop,
    h: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3,
  };
  mirror.remove();
  return point;
}

type Marker = { id: string; name: string; color: string; x: number; y: number; h: number };

/**
 * A draft's title or description, edited by several people at once. Other
 * people's carets show in the field in their color, with their name.
 */
export function CollabField({
  field,
  label,
  placeholder,
  maxLength,
  className,
}: {
  field: Field;
  label: string;
  placeholder?: string;
  maxLength: number;
  className?: string;
}) {
  const { text, others, editable, offline, change, register, takeRestore } = useCollab();
  const id = useId();
  const el = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const value = text[field];

  useLayoutEffect(() => {
    register(field, el.current);
    return () => register(field, null);
  }, [field, register]);

  // Someone else's edit moved the text under this person's caret: put it back on the same character.
  useLayoutEffect(() => {
    const keep = takeRestore(field);
    if (keep && el.current) el.current.setSelectionRange(keep[0], keep[1]);
  }, [value, field, takeRestore]);

  // Where everyone else's caret is in this field.
  const here = others.filter((o) => o.field === field && o.end !== null);
  const herePositions = here.map((o) => `${o.id}:${o.end}`).join(",");
  useLayoutEffect(() => {
    const node = el.current;
    if (!node || here.length === 0) {
      setMarkers((m) => (m.length ? [] : m));
      return;
    }
    const measure = () =>
      setMarkers(
        here.map((o) => {
          const p = caretPoint(node, Math.min(o.end ?? 0, node.value.length));
          return { id: o.id, name: o.name, color: colorFor(o.id), x: node.offsetLeft + p.x, y: node.offsetTop + p.y, h: p.h };
        }),
      );
    measure();
    node.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      node.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
    // here is derived from others; herePositions captures what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [herePositions, value]);

  const shared = {
    id,
    value,
    maxLength,
    readOnly: !editable,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(field, e.target.value),
    className,
  };

  return (
    <div className="relative flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {field === "title" ? <input ref={el} {...shared} /> : <textarea ref={el} rows={5} {...shared} />}
      {/* Other people's carets. Decorative: who is here is said in words by the avatars at the top. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {markers.map((m) => (
          <span key={m.id} className="absolute" style={{ left: m.x, top: m.y, height: m.h }}>
            <span className="absolute inset-y-0 left-0 w-0.5 rounded-full" style={{ background: m.color }} />
            <span
              className="absolute bottom-full left-0 mb-0.5 rounded-sm px-1.5 py-px font-sans text-[11px] leading-4 font-semibold whitespace-nowrap text-white"
              style={{ background: m.color }}
            >
              {m.name.split(" ")[0]}
            </span>
          </span>
        ))}
      </div>
      {offline && (
        <p role="status" className="text-[13px] leading-[18px] text-muted">
          Reconnecting. Your changes are kept here and will be saved when the connection is back.
        </p>
      )}
    </div>
  );
}

/** Who else has this case open, as small avatars. Hovering or focusing one shows their name and email. */
export function PresenceAvatars() {
  const { others } = useCollab();
  if (others.length === 0) return null;
  const shown = others.slice(0, 5);
  const more = others.length - shown.length;
  return (
    <div role="group" aria-label={`Also here: ${others.map((o) => o.name).join(", ")}`} className="flex items-center">
      <ul className="flex -space-x-2">
        {shown.map((o) => (
          <li key={o.id} className="group relative">
            <span
              tabIndex={0}
              aria-label={`${o.name}, ${o.email}, has this case open`}
              className="grid size-9 place-items-center rounded-full border-2 bg-brand-100 text-[13px] leading-none font-bold text-brand-800"
              style={{ borderColor: colorFor(o.id) }}
            >
              {initials(o.name)}
            </span>
            <span
              role="tooltip"
              className="pointer-events-none invisible absolute top-full right-0 z-30 mt-2 w-max max-w-[260px] rounded-md bg-ink px-3 py-2 text-left text-[13px] leading-[18px] text-white opacity-0 shadow-raised transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
            >
              <span className="block font-semibold">{o.name}</span>
              <span className="block break-all text-white/80">{o.email}</span>
            </span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <span className="ml-2 text-sm leading-5 font-semibold text-muted" title={others.slice(5).map((o) => o.name).join(", ")}>
          +{more}
        </span>
      )}
    </div>
  );
}

/** Puts the case's live text on the page (the heading uses the title as it is now). */
export function LiveTitle() {
  const { text } = useCollab();
  return <>{text.title}</>;
}
