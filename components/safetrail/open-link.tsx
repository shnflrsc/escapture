"use client";

import { Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";

/**
 * "Open a password link": paste a SafeTrail link someone sent you. It only ever
 * leads to this site's own link page, where the password is asked for.
 */
export function OpenLinkButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setError(null);
  };

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pasted = String(new FormData(e.currentTarget).get("link") ?? "").trim();
    // Accept a whole link or just its path; never follow it anywhere else.
    const path = /\/s\/[A-Za-z0-9_-]{20,100}$/.exec(pasted.split(/[?#]/)[0])?.[0];
    if (!path) return setError("That doesn't look like a SafeTrail link. It should end in /s/ and a long code.");
    close();
    router.push(path);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Link2 size={18} strokeWidth={1.75} aria-hidden />
        Open a password link
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Open a password link"
        description="Paste the link someone sent you. You will be asked for its password next."
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Input label="Link" name="link" autoComplete="off" required error={error} placeholder="https://…/s/…" />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={close}>
              Go back
            </Button>
            <Button type="submit">Open link</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
