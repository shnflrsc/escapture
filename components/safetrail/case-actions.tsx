"use client";

import { Lock, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TamperBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Banner, Skeleton } from "@/components/ui/feedback";
import { Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/client-api";
import { formatDateTime, kindLabel } from "@/lib/format";

export function NewCaseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const close = () => {
    setOpen(false);
    setError(null);
    setLoading(false);
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const c = await api<{ id: string }>("/api/cases", {
        body: { title: form.get("title"), description: form.get("description") },
      });
      router.push(`/cases/${c.id}`);
    } catch (err) {
      setLoading(false);
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={18} strokeWidth={1.75} aria-hidden />
        New case
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Start a new case"
        description="This creates a private draft. Nothing reaches reviewers until you escalate, and you can change everything until then."
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <Banner tone="attention">{error}</Banner>}
          <Input label="Title" name="title" required maxLength={160} hint="A short name so you can find it later." />
          <Textarea
            label="What happened"
            name="description"
            maxLength={10000}
            hint="Optional for now. Write as much or as little as you want."
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={close}>
              Go back
            </Button>
            <Button type="submit" loading={loading}>
              Create draft
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function CaseDetailsForm({
  caseId,
  title,
  description,
}: {
  caseId: string;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState({ title, description });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dirty = values.title !== title || values.description !== description;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api(`/api/cases/${caseId}`, { method: "PATCH", body: values });
      toast("Changes saved.");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError && err.status === 409) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <Banner tone="attention">{error}</Banner>}
      <Input
        label="Title"
        value={values.title}
        onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        required
        maxLength={160}
      />
      <Textarea
        label="What happened"
        value={values.description}
        onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        maxLength={10000}
        hint="Describe it in your own words. You can keep editing until you escalate."
      />
      <div>
        <Button type="submit" variant="secondary" loading={loading} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

export function AttachEvidence({
  caseId,
  available,
}: {
  caseId: string;
  available: { id: string; label: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (available.length === 0) {
    return (
      <p className="text-sm leading-[22px] text-muted">
        There is nothing else in your vault to add. Evidence you capture with the extension will appear here.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/api/cases/${caseId}/evidence`, { body: { evidenceId: selected } });
      setSelected("");
      toast("Added to the case.");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError && err.status === 409) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <Select
          label="Add evidence from your vault"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          error={error}
        >
          <option value="">Choose an item</option>
          {available.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="soft" loading={loading} disabled={!selected}>
        Add to case
      </Button>
    </form>
  );
}

export function DetachButton({ caseId, evidenceId }: { caseId: string; evidenceId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="ghost"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await api(`/api/cases/${caseId}/evidence/${evidenceId}`, { method: "DELETE" });
          toast("Removed from the case. It is still in the vault.");
        } catch (err) {
          toast(errorMessage(err));
        }
        setLoading(false);
        router.refresh();
      }}
    >
      Remove
    </Button>
  );
}

type Preview = {
  title: string;
  description: string;
  owner: { name: string; email: string };
  collaborators: { id: string; name: string; email: string }[];
  evidence: { id: string; label: string; kind: "facebook_post" | "facebook_message"; capturedAt: string; sha256: string; addedBy: string }[];
  digest: string;
};

/** The one irreversible step: preview exactly what reviewers will see, then confirm (I4). */
export function EscalateButton({ caseId, disabled }: { caseId: string; disabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api<Preview>(`/api/cases/${caseId}/escalation-preview`)
      .then((p) => !cancelled && setPreview(p))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [open, caseId, reload]);

  const close = () => {
    setOpen(false);
    setPreview(null);
    setUnderstood(false);
    setError(null);
    setLoading(false);
  };

  async function confirm() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/api/cases/${caseId}/escalate`, { body: { digest: preview.digest, confirm: true } });
      close();
      toast("Your case has been escalated to reviewers.");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(errorMessage(err));
      if (err instanceof ApiError && err.code === "preview_changed") {
        // Show the new content and ask for confirmation again.
        setPreview(null);
        setUnderstood(false);
        setReload((n) => n + 1);
        router.refresh();
      }
    }
  }

  return (
    <>
      <Button variant="weighty" disabled={disabled} onClick={() => setOpen(true)}>
        Escalate to reviewers
      </Button>
      <Dialog
        open={open}
        onClose={close}
        wide
        title="Review what reviewers will see"
        description="This is exactly what will be sent. Take your time."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Go back
            </Button>
            <Button variant="weighty" disabled={!preview || !understood} loading={loading} onClick={confirm}>
              Escalate to reviewers
            </Button>
          </>
        }
      >
        {error && <Banner tone="attention">{error}</Banner>}
        {!preview && !error && <Skeleton className="h-48 w-full" />}
        {preview && (
          <>
            <div>
              <h4>{preview.title}</h4>
              <p className="mt-1 max-w-prose text-sm leading-[22px] whitespace-pre-wrap">
                {preview.description || "No description was added."}
              </p>
            </div>
            <div>
              <h4>People reviewers will see</h4>
              <ul className="mt-1 flex flex-col gap-1 text-sm leading-[22px]">
                <li>
                  {preview.owner.name} <span className="text-muted">{preview.owner.email} · Reported this case</span>
                </li>
                {preview.collaborators.map((p) => (
                  <li key={p.id}>
                    {p.name} <span className="text-muted">{p.email} · Added to this case</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Evidence reviewers will see</h4>
              <ul className="mt-1 flex flex-col gap-2">
                {preview.evidence.map((e) => (
                  <li key={e.id} className="rounded-md bg-subtle p-3 text-sm leading-[22px]">
                    <p className="font-semibold">{e.label}</p>
                    <p className="text-muted">
                      {kindLabel(e.kind)} · Captured <span className="tnum">{formatDateTime(e.capturedAt)}</span> ·
                      Added by {e.addedBy}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2">
                      <TamperBadge />
                      <span className="mono break-all text-muted">{e.sha256}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-start gap-2 rounded-md bg-brand-50 p-4 text-sm leading-[22px]">
              <Lock size={18} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-brand-800" />
              <p>
                Once you escalate, this case is locked. You can&apos;t edit or withdraw it, and attached evidence
                can&apos;t be deleted.
              </p>
            </div>
            <label className="flex items-start gap-3 text-sm leading-[22px] font-semibold">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-1 size-4 accent-[var(--brand-700)]"
              />
              I understand this can&apos;t be undone.
            </label>
          </>
        )}
      </Dialog>
    </>
  );
}
