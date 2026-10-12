import { FileText, MessagesSquare } from "lucide-react";
import { TamperBadge } from "@/components/ui/badge";

const items = [
  { Icon: FileText, name: "Post on my timeline", meta: "Facebook post · Captured 12 Oct 2026 14:03" },
  { Icon: MessagesSquare, name: "Group chat", meta: "Facebook messages · Captured 12 Oct 2026 21:07" },
];

/**
 * The home page's picture: what a saved capture looks like in the vault, drawn
 * with the real badge. It is sample content, so it is hidden from assistive
 * technology and captioned as an example.
 */
export function HeroExample() {
  return (
    <figure className="flex flex-col gap-3">
      <div aria-hidden className="rounded-2xl bg-brand-100 p-4">
        <ul className="rounded-xl border border-border bg-card shadow-soft">
          {items.map(({ Icon, name, meta }) => (
            <li key={name} className="flex items-start gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
              <Icon size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-700" />
              <div className="flex min-w-0 flex-col items-start gap-0.5">
                <p className="text-[15px] leading-[22px] font-semibold text-ink">{name}</p>
                <p className="tnum text-[13px] leading-[18px] text-muted">{meta}</p>
                <TamperBadge />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="text-[13px] leading-[18px] text-muted">An example of saved items in a vault.</figcaption>
    </figure>
  );
}
