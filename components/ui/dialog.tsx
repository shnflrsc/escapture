"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/** Native <dialog>: traps focus, closes on Escape and restores focus. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Next.js keeps the page you navigate away from mounted but hidden, instead of
  // removing it. A modal dialog left open there would still be modal: it makes the
  // whole document inert, so nothing on the new page could be clicked. This cleanup
  // runs when the page is hidden (and on unmount) and closes it, which also resets
  // the owner's state through onClose.
  useLayoutEffect(() => {
    const d = ref.current;
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={cn(
        "m-auto w-[calc(100%-32px)] rounded-2xl border border-border bg-card p-0 text-ink shadow-modal",
        wide ? "max-w-[720px]" : "max-w-[560px]",
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex flex-col gap-2 overflow-y-auto p-6">
            <h3 id={titleId}>{title}</h3>
            {description && <p className="text-sm leading-[22px] text-muted">{description}</p>}
            {children && <div className="mt-2 flex flex-col gap-4">{children}</div>}
          </div>
          {footer && (
            <div className="flex justify-end gap-3 border-t border-border bg-card px-6 py-4">{footer}</div>
          )}
        </div>
      )}
    </dialog>
  );
}
