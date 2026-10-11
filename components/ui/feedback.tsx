import { CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/cn";

const bannerTones = {
  info: "bg-brand-100 text-brand-800",
  attention: "bg-escalated-bg text-escalated-fg",
  success: "bg-tamper-bg text-tamper-fg",
};

/** Tinted background and an icon. No accent stripes, and never red. */
export function Banner({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof bannerTones;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "success" ? CircleCheck : Info;
  return (
    <div
      role={tone === "attention" ? "alert" : "status"}
      className={cn("flex items-start gap-2 rounded-md px-4 py-3 text-sm leading-[22px]", bannerTones[tone], className)}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center shadow-soft">
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-700" aria-hidden>
        {icon}
      </div>
      <h3>{title}</h3>
      <p className="max-w-md text-sm leading-[22px] text-muted">{children}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
