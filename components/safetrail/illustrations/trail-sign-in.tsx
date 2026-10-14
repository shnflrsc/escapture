/** The trail, walked: it ends at a closed vault. Decorative only; every colour is a brand or tamper token. */
export function TrailSignIn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 520" aria-hidden="true" focusable="false" className={className}>
      <circle cx="370" cy="170" r="120" fill="var(--brand-100)" />
      <path d="M0 430 C 120 400, 240 460, 520 410" stroke="var(--brand-200)" strokeWidth="1.5" fill="none" />
      <path d="M0 470 C 140 445, 300 500, 520 455" stroke="var(--brand-200)" strokeWidth="1.5" fill="none" />
      <path d="M0 505 C 160 485, 320 530, 520 495" stroke="var(--brand-200)" strokeWidth="1.5" fill="none" />
      <path d="M40 500 C 90 420, 230 450, 250 360 S 340 260, 370 246" stroke="var(--brand-300)" strokeWidth="18" strokeLinecap="round" fill="none" />
      <path d="M40 500 C 90 420, 230 450, 250 360 S 340 260, 370 246" stroke="var(--card)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 12" fill="none" />
      <circle cx="40" cy="500" r="7" fill="var(--brand-400)" />
      <ellipse cx="370" cy="248" rx="82" ry="8" fill="var(--brand-200)" />
      <rect x="310" y="150" width="120" height="96" rx="14" fill="var(--brand-500)" />
      <rect x="300" y="126" width="140" height="34" rx="12" fill="var(--brand-400)" />
      <rect x="352" y="178" width="36" height="44" rx="10" fill="var(--card)" />
      <circle cx="370" cy="194" r="5" fill="var(--brand-900)" />
      <rect x="368" y="196" width="4" height="13" rx="2" fill="var(--brand-900)" />
      <circle cx="156" cy="434" r="9" fill="var(--card)" stroke="var(--brand-500)" strokeWidth="3" />
      <circle cx="250" cy="360" r="9" fill="var(--card)" stroke="var(--brand-500)" strokeWidth="3" />
      <circle cx="306" cy="274" r="9" fill="var(--card)" stroke="var(--brand-500)" strokeWidth="3" />
      <rect x="62" y="352" width="96" height="62" rx="10" fill="var(--card)" stroke="var(--brand-200)" strokeWidth="1.5" />
      <circle cx="82" cy="372" r="8" fill="var(--brand-200)" />
      <path d="M98 370 H142" stroke="var(--brand-400)" strokeWidth="4" strokeLinecap="round" />
      <path d="M74 391 H146 M74 401 H122" stroke="var(--brand-200)" strokeWidth="4" strokeLinecap="round" />
      <rect x="146" y="268" width="88" height="56" rx="10" fill="var(--card)" stroke="var(--brand-200)" strokeWidth="1.5" />
      <rect x="158" y="280" width="46" height="12" rx="6" fill="var(--brand-200)" />
      <rect x="176" y="300" width="46" height="12" rx="6" fill="var(--brand-400)" />
      <rect x="432" y="246" width="78" height="52" rx="10" fill="var(--card)" stroke="var(--brand-200)" strokeWidth="1.5" />
      <circle cx="455" cy="272" r="12" fill="var(--tamper-bg)" />
      <path d="M449 272 l4.5 4.5 l7.5 -8.5" stroke="var(--tamper-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M474 266 H498 M474 279 H490" stroke="var(--brand-200)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
