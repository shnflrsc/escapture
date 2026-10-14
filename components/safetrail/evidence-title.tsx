"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/client-api";

/**
 * An item's name, edited in place by its owner, like a draft case's title.
 * It saves when the field is left or Enter is pressed; Escape puts it back.
 */
export function EvidenceTitle({ evidenceId, value }: { evidenceId: string; value: string }) {
  const router = useRouter();
  const id = useId();
  const [text, setText] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(value);

  async function save() {
    const next = text.trim();
    if (next === saved.current) {
      setText(next);
      return;
    }
    if (!next) {
      setError("Give it a name.");
      return;
    }
    try {
      await api(`/api/evidence/${evidenceId}`, { method: "PATCH", body: { label: next } });
      saved.current = next;
      setText(next);
      setError(null);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        Name
      </label>
      <input
        id={id}
        value={text}
        maxLength={120}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setText(saved.current);
            setError(null);
          }
        }}
        className="-mx-2 w-[calc(100%+16px)] rounded-md border border-transparent bg-transparent px-2 font-heading text-[32px] leading-10 font-semibold text-ink hover:border-border focus:border-border-strong focus:bg-card"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[13px] leading-[18px] text-danger-fg">
          Not saved. {error}
        </p>
      )}
    </div>
  );
}
