"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/cn";

const SAVE_AFTER_MS = 1000;
const CHECK_EVERY_MS = 5000;

// The server stores text trimmed; compare like with like.
const tidy = (s: string) => s.trim();

/**
 * A draft's title or description, edited in place. It saves itself shortly
 * after typing stops and when the field is left. Several people can edit one
 * draft, so each save says what the field held when the edit began; if someone
 * else changed it meanwhile the save is refused and both versions are shown.
 */
export function CaseField({
  caseId,
  field,
  value,
}: {
  caseId: string;
  field: "title" | "description";
  /** The text the server has. Changes when the page picks up someone else's edit. */
  value: string;
}) {
  const router = useRouter();
  const id = useId();
  const [text, setText] = useState(value);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [theirs, setTheirs] = useState<string | null>(null);

  const el = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const base = useRef(value); // what the server held when this edit began
  const latest = useRef(value); // what is in the field now
  const server = useRef(value); // the newest text the page has been given
  const conflict = useRef(false);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timers and cleanups call the newest save through this.
  const saveRef = useRef<() => Promise<void>>(async () => {});

  async function save() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (busy.current || conflict.current) return;
    const mine = tidy(latest.current);
    if (mine === base.current) return;
    if (field === "title" && !mine) {
      setStatus("error");
      setError("Give your case a title.");
      return;
    }
    busy.current = true;
    setStatus("saving");
    setError(null);
    try {
      const saved = await api<Record<typeof field, string>>(`/api/cases/${caseId}`, {
        method: "PATCH",
        body: { [field]: mine, base: { [field]: base.current } },
      });
      base.current = saved[field];
      // The page will be told on its next refresh; until then this is the newest text we know of.
      server.current = saved[field];
      setStatus("saved");
    } catch (err) {
      const current =
        err instanceof ApiError && err.code === "edit_conflict"
          ? (err.data.current as Partial<Record<typeof field, string>> | undefined)?.[field]
          : undefined;
      if (typeof current === "string") {
        conflict.current = true;
        setTheirs(current);
        setStatus("idle");
      } else {
        setStatus("error");
        setError(errorMessage(err));
        // Escalated, deleted, or you were removed: show the page as it now is.
        if (err instanceof ApiError && (err.status === 409 || err.status === 404)) router.refresh();
      }
    } finally {
      busy.current = false;
      // Typed more while that was on its way.
      if (tidy(latest.current) !== mine) timer.current = setTimeout(() => void saveRef.current(), SAVE_AFTER_MS);
    }
  }

  // Takes the server's text when it is safe to: nothing unsaved here, and not while typing.
  function adopt() {
    if (server.current === base.current || busy.current || conflict.current) return;
    if (tidy(latest.current) !== base.current) return; // unsaved: the next save will meet the conflict
    if (document.activeElement === el.current) return;
    base.current = server.current;
    latest.current = server.current;
    setText(server.current);
    setStatus("idle");
  }

  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    server.current = value;
    adopt();
  }, [value]);

  // Leaving the page with a save still waiting: send it now.
  useEffect(
    () => () => {
      if (timer.current) void saveRef.current();
    },
    [],
  );

  function onChange(next: string) {
    latest.current = next;
    setText(next);
    setError(null);
    if (status !== "saving") setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveRef.current(), SAVE_AFTER_MS);
  }

  function resolve(keepMine: boolean) {
    if (theirs === null) return;
    base.current = theirs;
    conflict.current = false;
    setTheirs(null);
    if (keepMine) void save();
    else {
      latest.current = theirs;
      setText(theirs);
    }
  }

  const shared = {
    ref: el,
    id,
    value: text,
    "aria-describedby": `${id}-status`,
    "aria-invalid": error ? true : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onBlur: () => void save().then(adopt),
  };

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {field === "title" ? "Title" : "What happened"}
      </label>
      {field === "title" ? (
        <input
          {...shared}
          maxLength={160}
          placeholder="Title"
          className="-mx-2 w-[calc(100%+16px)] rounded-md border border-transparent bg-transparent px-2 font-heading text-[32px] leading-10 font-semibold text-ink hover:border-border focus:border-border-strong focus:bg-card"
        />
      ) : (
        <textarea
          {...shared}
          maxLength={10000}
          rows={5}
          placeholder="What happened? Describe it in your own words. You can keep editing until you escalate."
          // Fills its card edge to edge, so the card itself is the text box; the card shows the focus ring.
          className="block min-h-32 w-full resize-none rounded-xl border-0 bg-transparent px-[var(--card-pad)] pt-[var(--card-pad)] pb-2 text-base leading-[26px] text-ink [field-sizing:content] placeholder:text-muted focus-visible:outline-none!"
        />
      )}
      <p
        id={`${id}-status`}
        aria-live="polite"
        className={cn(
          "min-h-[18px] text-[13px] leading-[18px]",
          error ? "text-danger-fg" : "text-muted",
          field === "description" && "px-[var(--card-pad)] pb-3",
        )}
      >
        {error ? (
          <>
            Not saved. {error}{" "}
            {!(field === "title" && !tidy(text)) && (
              <button type="button" className="link" onClick={() => void save()}>
                Try again
              </button>
            )}
          </>
        ) : status === "saving" ? (
          "Saving…"
        ) : status === "saved" ? (
          "Saved"
        ) : null}
      </p>
      {theirs !== null && (
        <div
          role="alert"
          className={cn(
            "flex flex-col gap-3 rounded-md bg-escalated-bg p-4 text-sm leading-[22px]",
            field === "description" && "mx-[var(--card-pad)] mb-[var(--card-pad)]",
          )}
        >
          <p className="font-semibold text-escalated-fg">
            Someone else changed the {field} while you were editing. Yours has not been saved.
          </p>
          <div>
            <p className="font-semibold">Theirs</p>
            <p className="max-h-40 overflow-y-auto rounded-md bg-card p-2 whitespace-pre-wrap">
              {theirs || <span className="text-muted">(empty)</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => resolve(true)}>
              Keep mine
            </Button>
            <Button variant="ghost" onClick={() => resolve(false)}>
              Use theirs
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Keeps an open draft current: asks every few seconds whether the case has
 * changed and reloads the page's data if so. Stops while the tab is hidden.
 */
export function CaseLive({ caseId, updatedAt }: { caseId: string; updatedAt: string }) {
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const now = await api<{ updatedAt: string; status: string }>(`/api/cases/${caseId}?only=version`);
        if (stopped) return;
        if (now.status !== "draft" || new Date(now.updatedAt).getTime() !== new Date(updatedAt).getTime()) {
          router.refresh();
        }
      } catch (err) {
        if (stopped || !(err instanceof ApiError) || err.status !== 404) return; // offline: try again next time
        stopped = true;
        toast("This case is no longer available to you.");
        router.push("/cases");
        router.refresh();
      }
    };
    const every = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(every);
      document.removeEventListener("visibilitychange", check);
    };
  }, [caseId, updatedAt, router, toast]);

  return null;
}
