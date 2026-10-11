"use client";

import { Link2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog } from "@/components/ui/dialog";
import { Banner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client-api";

/** Share by email. The confirm button is the acknowledgment (I10). */
export function EmailShareButton({
  endpoint,
  buttonLabel,
  title,
  risk,
  confirmLabel = "I understand, share",
  successText,
}: {
  endpoint: string;
  buttonLabel: string;
  title: string;
  risk: string;
  confirmLabel?: string;
  successText: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function close() {
    setOpen(false);
    setEmail("");
    setError(null);
    setLoading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api(endpoint, { body: { email, acknowledge: true } });
      close();
      toast(successText);
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Mail size={18} strokeWidth={1.75} aria-hidden />
        {buttonLabel}
      </Button>
      <Dialog open={open} onClose={close} title={title} description={risk}>
        <form id="email-share-form" onSubmit={submit} className="flex flex-col gap-4">
          <Input
            label="Their SafeTrail email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            hint="They need to have a SafeTrail account already."
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={close}>
              Go back
            </Button>
            <Button type="submit" loading={loading}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/** Password-protected link. The URL is shown once, here. */
export function LinkShareButton({
  endpoint,
  title,
  risk,
}: {
  endpoint: string;
  title: string;
  risk: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setPassword("");
    setError(null);
    setLoading(false);
    setUrl(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ url: string }>(endpoint, { body: { password, acknowledge: true } });
      setUrl(res.url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Link2 size={18} strokeWidth={1.75} aria-hidden />
        Create a password link
      </Button>
      <Dialog open={open} onClose={close} title={url ? "Your link is ready" : title} description={url ? undefined : risk}>
        {url ? (
          <>
            <Banner tone="info">
              Copy this link now. For your safety we can&apos;t show it again. Send the password separately.
            </Banner>
            <div className="flex items-center gap-2 rounded-md bg-subtle px-3 py-2">
              <Lock size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
              <code className="mono min-w-0 flex-1 break-all">{url}</code>
              <CopyButton value={url} label="Copy link" />
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={close}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Input
              label="Choose a password for this link"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error}
              hint="At least 8 characters. Anyone with the link also needs this password and a SafeTrail account."
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={close}>
                Go back
              </Button>
              <Button type="submit" loading={loading}>
                I understand, create link
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
