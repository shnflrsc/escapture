import { Check, ChevronDown, Minus } from "lucide-react";
import Link from "next/link";
import { buttonClass, buttonLg, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** A link that looks like a button. The landing page's actions all lead somewhere. */
export function ButtonLink({
  href,
  variant = "primary",
  lg = false,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  lg?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, cn(lg && buttonLg, className))}>
      {children}
    </Link>
  );
}

/**
 * Seven open, flowing lines. Decoration only, behind the hero and the two dark
 * blocks. Never closed loops: those would read as the logo's fingerprint.
 */
export function TrailPattern({ dark = false }: { dark?: boolean }) {
  const paths = Array.from({ length: 7 }, (_, i) => {
    const y = 150 + i * 26;
    const a = 60 + i * 9;
    return `M-40 ${y + a} C 220 ${y - a}, 420 ${y + a * 1.3}, 660 ${y} S 1040 ${y - a * 0.9}, 1240 ${y + a * 0.4}`;
  });
  return (
    <svg
      aria-hidden
      className={cn("mk-trail", dark && "mk-trail-dark")}
      viewBox="0 0 1200 480"
      preserveAspectRatio="xMidYMid slice"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function Section({
  id,
  tone = "canvas",
  eyebrow,
  title,
  lead,
  center = false,
  inset = false,
  pattern = false,
  children,
}: {
  id?: string;
  tone?: "canvas" | "card" | "tint" | "dark";
  eyebrow?: string;
  title?: string;
  lead?: string;
  center?: boolean;
  inset?: boolean;
  pattern?: boolean;
  children: React.ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <section id={id} className={cn("mk-section", dark ? "mk-dark" : `mk-tone-${tone}`, inset && "mk-inset")}>
      {pattern && <TrailPattern dark={dark} />}
      <div className="mk-wrap">
        {title && (
          <div className={cn("mk-section-head", center && "mk-center")}>
            {eyebrow && <span className="mk-eyebrow">{eyebrow}</span>}
            <h2 className="mk-display-lg">{title}</h2>
            {lead && <p className="mk-lead">{lead}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/**
 * A picture of the product in a window. What is inside is an illustration, not
 * the working interface: it is one image to assistive technology, and nothing
 * in it can be focused or clicked.
 */
export function ProductFrame({ url, label, children }: { url: string; label: string; children: React.ReactNode }) {
  return (
    <div className="mk-frame" role="img" aria-label={label}>
      <div className="mk-frame-bar" aria-hidden>
        <i />
        <i />
        <i />
        <span className="mk-frame-url">{url}</span>
      </div>
      <div className="mk-frame-body" aria-hidden>
        {children}
      </div>
    </div>
  );
}

/** A button as drawn inside a product picture. Not a control. */
export function MockButton({
  variant = "primary",
  className,
  children,
}: {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={buttonClass(variant, cn("cursor-default", className))}>{children}</span>;
}

export function PilotStrip({ items }: { items: string[] }) {
  return (
    <div className="mk-pilot">
      <div className="mk-wrap">
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="mk-steps">
      {items.map((step, i) => (
        <li key={step.title} className="mk-step">
          <span className="mk-step-num" aria-hidden>
            {i + 1}
          </span>
          <h3 className="mk-h3">
            <span className="sr-only">Step {i + 1}: </span>
            {step.title}
          </h3>
          <p className="mk-muted">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function FeatureRow({
  eyebrow,
  title,
  body,
  points,
  reverse = false,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  reverse?: boolean;
  /** The picture. */
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mk-feature", reverse && "mk-feature-rev")}>
      <div className="mk-feature-text">
        <span className="mk-eyebrow">{eyebrow}</span>
        <h2 className="mk-display-md">{title}</h2>
        <p>{body}</p>
        <ul className="mk-points">
          {points.map((point) => (
            <li key={point}>
              <Check size={16} strokeWidth={1.75} aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function TrustPanel({
  does,
  doesNot,
}: {
  does: { title: string; items: string[] };
  doesNot: { title: string; items: string[] };
}) {
  return (
    <div className="mk-trust">
      {[
        { ...does, Icon: Check },
        { ...doesNot, Icon: Minus },
      ].map(({ title, items, Icon }) => (
        <div key={title} className="mk-trust-col">
          <h3 className="mk-h3">{title}</h3>
          <ul>
            {items.map((item) => (
              <li key={item}>
                <Icon size={20} strokeWidth={1.75} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mk-faq">
      {items.map((item, i) => (
        <details key={item.q} open={i === 0}>
          <summary>
            {item.q}
            <ChevronDown size={20} strokeWidth={1.75} aria-hidden />
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="mk-tone-canvas" style={{ padding: "32px 0 96px" }}>
      <div className="mk-wrap">
        <div className="mk-cta mk-dark" style={{ borderRadius: "var(--radius-section)" }}>
          <TrailPattern dark />
          <h2 className="mk-display-lg">{title}</h2>
          <p className="mk-lead">{lead}</p>
          <div className="mk-actions">{children}</div>
        </div>
      </div>
    </section>
  );
}
