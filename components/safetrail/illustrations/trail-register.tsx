/** The trail, starting: a flag at the first step and the vault still an outline. Decorative only; every colour is a brand or tamper token. */
export function TrailRegister({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 520" aria-hidden="true" focusable="false" className={className}>
      <circle cx="370" cy="170" r="120" fill="var(--brand-100)" />
      <path d="M0 430 C 120 400, 240 460, 520 410" stroke="var(--brand-200)" strokeWidth="1.5" fill="none" />
      <path d="M0 470 C 140 445, 300 500, 520 455" stroke="var(--brand-200)" strokeWidth="1.5" fill="none" />
      <path d="M0 505 C 160 485, 320 530, 520 495" stroke="var(--brand-200)" strokeWidth="1.5" fill="none" />
      <path d="M60 480 C 110 410, 220 440, 240 360" stroke="var(--brand-300)" strokeWidth="18" strokeLinecap="round" fill="none" />
      <path d="M60 480 C 110 410, 220 440, 240 360" stroke="var(--card)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 12" fill="none" />
      <path d="M240 360 C 260 280, 340 260, 370 246" stroke="var(--brand-300)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 12" fill="none" />
      <rect x="310" y="150" width="120" height="96" rx="14" fill="none" stroke="var(--brand-300)" strokeWidth="2.5" strokeDasharray="6 6" />
      <rect x="300" y="126" width="140" height="34" rx="12" fill="none" stroke="var(--brand-300)" strokeWidth="2.5" strokeDasharray="6 6" />
      <path d="M60 480 V 404" stroke="var(--brand-900)" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 406 L 104 419 L 60 432 Z" fill="var(--brand-500)" />
      <circle cx="60" cy="482" r="7" fill="var(--brand-400)" />
      <circle cx="161" cy="424" r="9" fill="var(--card)" stroke="var(--brand-500)" strokeWidth="3" />
      <circle cx="240" cy="360" r="9" fill="var(--card)" stroke="var(--brand-500)" strokeWidth="3" />
      <rect x="150" y="300" width="100" height="64" rx="10" fill="var(--card)" stroke="var(--brand-200)" strokeWidth="1.5" transform="rotate(-4 200 332)" />
      <g transform="rotate(-4 200 332)">
        <circle cx="170" cy="320" r="8" fill="var(--brand-200)" />
        <path d="M186 318 H230" stroke="var(--brand-400)" strokeWidth="4" strokeLinecap="round" />
        <path d="M162 340 H236 M162 350 H210" stroke="var(--brand-200)" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="250" cy="300" r="13" fill="var(--brand-700)" />
      <path d="M250 293 V 307 M243 300 H 257" stroke="var(--card)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
