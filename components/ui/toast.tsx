"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = { id: number; text: string };
const ToastContext = createContext<(text: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

/** Bottom-left, calm, auto-dismissing. Never for anything the user must act on. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(1);

  const dismissLater = useCallback((id: number) => {
    timers.current.set(
      id,
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000),
    );
  }, []);

  const push = useCallback(
    (text: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, text }]);
      dismissLater(id);
    },
    [dismissLater],
  );

  return (
    <ToastContext value={push}>
      {children}
      <div aria-live="polite" className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            onMouseEnter={() => clearTimeout(timers.current.get(t.id))}
            onMouseLeave={() => dismissLater(t.id)}
            className="fade-in max-w-sm rounded-md bg-ink px-4 py-3 text-sm leading-[22px] text-white shadow-raised"
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
