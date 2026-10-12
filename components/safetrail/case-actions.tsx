"use client";

import { Lock, LogOut, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TamperBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Banner, Skeleton } from "@/components/ui/feedback";
import { Input, Textarea } from "@/components/ui/field";
import { Menu } from "@/components/ui/menu";
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
      close(); // the dialog must not stay open behind the next page
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

/** A confirm dialog for the actions that take a case, or a person, away. */
function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  danger = false,
  run,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  /** Does it. Throwing keeps the dialog open with the message. */
  run: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const close = () => {
    onClose();
    setError(null);
    setLoading(false);
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Go back
          </Button>
          <Button
            variant={danger ? "danger-solid" : "primary"}
            loading={loading}
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                await run();
                close();
              } catch (err) {
                setLoading(false);
                setError(errorMessage(err));
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error && <Banner tone="attention">{error}</Banner>}
    </Dialog>
  );
}

/** The header's "More" menu on a draft: the owner can delete it, a collaborator can leave it. */
export function CaseMenu({
  caseId,
  title,
  ownerName,
  role,
}: {
  caseId: string;
  title: string;
  ownerName: string;
  role: "owner" | "collaborator";
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const owner = role === "owner";

  // The case is gone for this person either way: back to the list.
  const leavePage = (message: string) => {
    toast(message);
    router.push("/cases");
    router.refresh();
  };

  return (
    <>
      <Menu
        label="More actions for this case"
        items={[
          owner
            ? {
                label: "Delete case",
                icon: <Trash2 size={18} strokeWidth={1.75} aria-hidden />,
                danger: true,
                onSelect: () => setOpen(true),
              }
            : {
                label: "Leave case",
                icon: <LogOut size={18} strokeWidth={1.75} aria-hidden />,
                onSelect: () => setOpen(true),
              },
        ]}
      />
      {owner ? (
        <ConfirmDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Delete this case?"
          description={`“${title}” will be deleted for everyone on it, and you won't be able to get it back. The evidence stays in each person's vault.`}
          confirmLabel="Delete case"
          danger
          run={async () => {
            await api(`/api/cases/${caseId}`, { method: "DELETE" });
            leavePage("Case deleted.");
          }}
        />
      ) : (
        <ConfirmDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Leave this case?"
          description={`You will no longer be able to open it, and the evidence you added will be removed from it. Your evidence stays in your vault. ${ownerName} will be told that you left.`}
          confirmLabel="Leave case"
          run={async () => {
            await api(`/api/cases/${caseId}/collaborators/me`, { method: "DELETE" });
            leavePage("You left the case.");
          }}
        />
      )}
    </>
  );
}

/** Owner only: take a collaborator off a draft. */
export function RemovePersonButton({ caseId, userId, name }: { caseId: string; userId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" className="h-9 px-3" onClick={() => setOpen(true)} aria-label={`Remove ${name}`}>
        Remove
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Remove ${name} from this case?`}
        description={`${name} will no longer be able to open it, and the evidence they added will be removed from it. They will be told.`}
        confirmLabel="Remove"
        run={async () => {
          await api(`/api/cases/${caseId}/collaborators/${userId}`, { method: "DELETE" });
          toast(`${name} was removed from the case.`);
          router.refresh();
        }}
      />
    </>
  );
}

export function DetachButton({ caseId, evidenceId, label }: { caseId: string; evidenceId: string; label: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="ghost"
      className="h-9 px-3"
      loading={loading}
      aria-label={`Remove ${label} from this case`}
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

/**
 * The one irreversible step: preview exactly what reviewers will see, then confirm (I4).
 * Before the preview it says what is still missing: no evidence stops it, no description
 * is only pointed out.
 */
export function EscalateButton({ caseId, hasEvidence }: { caseId: string; hasEvidence: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!open || !hasEvidence) return;
    let cancelled = false;
    api<Preview>(`/api/cases/${caseId}/escalation-preview`)
      .then((p) => !cancelled && setPreview(p))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [open, caseId, reload, hasEvidence]);

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
      <Button variant="weighty" onClick={() => setOpen(true)}>
        Escalate to reviewers
      </Button>
      <Dialog
        open={open && !hasEvidence}
        onClose={close}
        title="Not ready to escalate yet"
        description="Add at least one piece of evidence first. Reviewers need something to look at."
        footer={
          <Button variant="secondary" onClick={close}>
            Go back
          </Button>
        }
      />
      <Dialog
        open={open && hasEvidence}
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
            {!preview.description && (
              <Banner tone="info">
                This case has no description. You can escalate without one, but reviewers will only have the evidence
                to go on.
              </Banner>
            )}
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
