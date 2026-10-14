// Sign in and register bring their own full-width shell (AuthShell), so this group adds nothing around them.
// It exists to keep them out of (public)'s narrow centred column.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
