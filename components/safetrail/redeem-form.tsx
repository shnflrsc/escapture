"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { api, errorMessage } from "@/lib/client-api";

export function RedeemForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ path: string }>(`/api/links/${encodeURIComponent(token)}/redeem`, {
        body: { password: String(new FormData(e.currentTarget).get("password") ?? "") },
      });
      router.push(res.path);
    } catch (err) {
      setLoading(false);
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <Banner tone="attention">{error}</Banner>}
      <Input label="Link password" name="password" type="password" required autoComplete="off" />
      <Button type="submit" loading={loading}>
        <Lock size={16} strokeWidth={1.75} aria-hidden />
        Open
      </Button>
    </form>
  );
}
