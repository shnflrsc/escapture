import Image from "next/image";

/**
 * The SafeTrail logo: the shield-and-fingerprint mark from public/brand, with the name beside it.
 * Next.js serves the mark resized and compressed for the size it is shown at.
 */
export function Logo({ size = 32, withName = true }: { size?: number; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/brand/logo-mark.png"
        width={size}
        height={size}
        // Beside the name, the mark adds nothing for a screen reader; on its own it is the name.
        alt={withName ? "" : "SafeTrail"}
        priority
        className="shrink-0"
      />
      {withName && (
        <span className="text-[20px] leading-7 font-semibold text-ink" style={{ fontFamily: "var(--font-heading)" }}>
          SafeTrail
        </span>
      )}
    </span>
  );
}
