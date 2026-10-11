/** Fingerprint inside a shield, single colour. Only ever used as the logo. */
export function Logo({ size = 32, withName = true }: { size?: number; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" role="img" aria-label="SafeTrail logo">
        <g stroke="var(--brand-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3 5 7v8.5c0 6.4 4.4 11.200 11 13.500 6.600-2.300 11-7.100 11-13.500V7L16 3Z" />
          <path d="M11 17.500v-2.200a5 5 0 0 1 10 0v3.200" />
          <path d="M13.600 20.500v-5.200a2.400 2.400 0 0 1 4.800 0v6.200" />
          <path d="M16 15.800v6.700" />
          <path d="M11.200 20.500c.300 1.200.900 2.200 1.700 3" />
          <path d="M20.800 21.500c-.200.800-.600 1.500-1.100 2.100" />
        </g>
      </svg>
      {withName && (
        <span className="text-[20px] leading-7 font-semibold text-ink" style={{ fontFamily: "var(--font-heading)" }}>
          SafeTrail
        </span>
      )}
    </span>
  );
}
