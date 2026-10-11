"use client";

import { CircleAlert } from "lucide-react";
import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-md border bg-card px-3 text-base text-ink placeholder:text-muted disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-fg";

type Common = { label: string; hint?: string; error?: string | null };

function Wrap({
  id,
  label,
  hint,
  error,
  children,
}: Common & { id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm leading-5 font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[13px] leading-[18px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1 text-[13px] leading-[18px] text-danger-fg">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string | null) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function Input({
  label,
  hint,
  error,
  className,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "h-[var(--control-h)]", error ? "border-danger-fg" : "border-border-strong", className)}
        {...rest}
      />
    </Wrap>
  );
}

export function Textarea({
  label,
  hint,
  error,
  className,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "min-h-32 py-2", error ? "border-danger-fg" : "border-border-strong", className)}
        {...rest}
      />
    </Wrap>
  );
}

export function Select({
  label,
  hint,
  error,
  className,
  children,
  ...rest
}: Common & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "h-[var(--control-h)] border-border-strong", className)}
        {...rest}
      >
        {children}
      </select>
    </Wrap>
  );
}
