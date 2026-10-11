import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "ghost"
  | "weighty"
  | "danger"
  | "danger-solid";

const base =
  "inline-flex h-[var(--control-h)] items-center justify-center gap-2 rounded-md px-5 text-[15px] leading-5 font-semibold whitespace-nowrap transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled-bg disabled:text-disabled-fg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  secondary: "border border-border-strong bg-card text-ink hover:bg-brand-50",
  soft: "bg-brand-100 text-brand-800 hover:bg-brand-200",
  ghost: "text-brand-700 hover:bg-brand-100",
  weighty: "bg-brand-900 text-white hover:bg-brand-950",
  danger: "border border-danger-solid bg-card text-danger-solid hover:bg-danger-bg",
  "danger-solid": "bg-danger-solid text-white hover:bg-danger-fg",
};

export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  cn(base, variants[variant], className);

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      type={type}
      className={buttonClass(variant, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <LoaderCircle size={16} strokeWidth={1.75} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
