import { Logo } from "@/components/safetrail/logo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-center gap-6 px-4 py-12">
      <Logo size={36} />
      {children}
    </main>
  );
}
