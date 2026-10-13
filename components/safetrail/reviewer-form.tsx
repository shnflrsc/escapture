"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog } from "@/components/ui/dialog";
import { Banner } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/client-api";
import { REVIEWER_OFFICES } from "@/lib/validators";

/** The one-time setup link, shown once to the administrator so they can pass it on. */
export function SetupLinkDialog({ link, onClose }: { link: { name: string; url: string } | null; onClose: () => void }) {
  return (
    <Dialog
      open={link !== null}
      onClose={onClose}
      title={link ? `Setup link for ${link.name}` : "Setup link"}
      description="Send this link to the reviewer through your office's usual channel. They use it to choose their own password. It works once and stops working after 7 days."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      {link && (
        <>
          <Banner tone="info">Copy this link now. For safety we can&apos;t show it again, but you can make a new one.</Banner>
          <div className="flex items-center gap-2 rounded-md bg-subtle px-3 py-2">
            <Lock size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
            <code className="mono min-w-0 flex-1 break-all">{link.url}</code>
            <CopyButton value={link.url} label="Copy link" />
          </div>
        </>
      )}
    </Dialog>
  );
}

type Errors = { name?: string; email?: string; form?: string };

/** The administrator's "Create a reviewer account" panel. */
export function ReviewerForm() {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<{ name: string; url: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const body = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      office: String(data.get("office") ?? "") || undefined,
    };
    setLoading(true);
    setErrors({});
    try {
      const made = await api<{ name: string; setupUrl: string }>("/api/admin/reviewers", { body });
      form.reset();
      toast("Reviewer account created");
      setLink({ name: made.name, url: made.setupUrl });
      router.refresh();
    } catch (err) {
      const message = errorMessage(err);
      // The server says which field is wrong; put the sentence under it.
      const field = /^(name|email): /.exec(message)?.[1] as keyof Errors | undefined;
      if (err instanceof ApiError && err.status === 409) setErrors({ email: message });
      else if (field) setErrors({ [field]: message.replace(/^\w+: /, "") });
      else setErrors({ form: message });
    }
    setLoading(false);
  }

  return (
    <>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {errors.form && <Banner tone="attention">{errors.form}</Banner>}
        <Input label="Full name" name="name" autoComplete="off" required maxLength={80} error={errors.name} />
        <Input
          label="University email"
          name="email"
          type="email"
          autoComplete="off"
          required
          error={errors.email}
        />
        <Select label="Office" name="office" defaultValue="">
          <option value="">Not specified</option>
          {REVIEWER_OFFICES.map((office) => (
            <option key={office} value={office}>
              {office}
            </option>
          ))}
        </Select>
        <Button type="submit" loading={loading}>
          Create account and get setup link
        </Button>
      </form>
      <SetupLinkDialog link={link} onClose={() => setLink(null)} />
    </>
  );
}

/** What an administrator can do to one reviewer account, by its status. */
export function ReviewerRowActions({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: "active" | "pending" | "expired" | "deactivated";
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [link, setLink] = useState<{ name: string; url: string } | null>(null);
  const small = "h-9 px-3 text-sm";

  async function run(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
      router.refresh();
    } catch (err) {
      toast(errorMessage(err));
    }
    setBusy(false);
  }
  const setActive = (active: boolean) =>
    run(async () => {
      await api(`/api/admin/reviewers/${id}`, { method: "PATCH", body: { active } });
      setConfirming(false);
      toast(active ? `${name} can sign in again.` : `${name} has been deactivated and signed out.`);
    });

  return (
    <>
      {(status === "pending" || status === "expired") && (
        <Button
          variant="ghost"
          className={small}
          loading={busy}
          onClick={() =>
            run(async () => {
              const made = await api<{ setupUrl: string }>(`/api/admin/reviewers/${id}/setup-link`, { body: {} });
              setLink({ name, url: made.setupUrl });
            })
          }
        >
          New setup link
        </Button>
      )}
      {status === "deactivated" ? (
        <Button variant="ghost" className={small} loading={busy} onClick={() => setActive(true)}>
          Reactivate
        </Button>
      ) : (
        <Button variant="ghost" className={small} onClick={() => setConfirming(true)}>
          Deactivate
        </Button>
      )}
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Deactivate ${name}?`}
        description="They will be signed out and won't be able to sign in. Cases and closing notes they wrote stay on record. You can reactivate the account later."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Go back
            </Button>
            <Button loading={busy} onClick={() => setActive(false)}>
              Deactivate account
            </Button>
          </>
        }
      />
      <SetupLinkDialog link={link} onClose={() => setLink(null)} />
    </>
  );
}
