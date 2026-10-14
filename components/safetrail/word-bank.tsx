"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/client-api";

/** Adds a word or phrase to the word bank. Every escalated and closed case is checked again. */
export function AddWordForm() {
  const router = useRouter();
  const toast = useToast();
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const added = await api<{ word: string }>("/api/admin/word-bank", { body: { word } });
      toast(`"${added.word}" added. Cases were checked again.`);
      setWord("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message.replace(/^word: /, "") : errorMessage(err));
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Input
        label="Word or phrase"
        name="word"
        value={word}
        maxLength={60}
        autoComplete="off"
        onChange={(e) => {
          setWord(e.target.value);
          setError(null);
        }}
        error={error}
      />
      <Button type="submit" loading={loading} disabled={word.trim().length < 2}>
        Add to word bank
      </Button>
    </form>
  );
}

export function RemoveWordButton({ id, word }: { id: string; word: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="ghost"
      className="h-9 w-9 px-0"
      aria-label={`Remove "${word}"`}
      title="Remove"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await api(`/api/admin/word-bank/${id}`, { method: "DELETE" });
          toast(`"${word}" removed.`);
        } catch (err) {
          toast(errorMessage(err));
        }
        setLoading(false);
        router.refresh();
      }}
    >
      {!loading && <X size={18} strokeWidth={1.75} aria-hidden />}
    </Button>
  );
}
