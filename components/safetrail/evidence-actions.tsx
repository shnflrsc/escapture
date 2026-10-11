"use client";

import { Info, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Banner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { EmailShareButton, LinkShareButton } from "./share-dialogs";

type VerifyResult = { stored: string; recomputed: string; match: boolean; checkedAt: string };

export function VerifyNow({ evidenceId }: { evidenceId: string }) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    setLoading(true);
    setError(null);
    try {
      setResult(await api<VerifyResult>(`/api/evidence/${evidenceId}/verify`));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="soft" onClick={verify} loading={loading}>
        {!loading && <RefreshCw size={16} strokeWidth={1.75} aria-hidden />}
        Verify now
      </Button>
      <div aria-live="polite" className="flex flex-col gap-2">
        {error && <Banner tone="attention">{error}</Banner>}
        {result?.match && (
          <Banner tone="success">
            The saved file matches its hash. It hasn&apos;t changed since it was captured. Checked{" "}
            <span className="tnum">{formatDateTime(result.checkedAt)}</span>.
          </Banner>
        )}
        {result && !result.match && (
          <Banner tone="attention">
            The saved file no longer matches the hash recorded at capture, so it has changed since then.
            <span className="mono mt-2 block break-all">Recorded: {result.stored}</span>
            <span className="mono block break-all">Now: {result.recomputed}</span>
          </Banner>
        )}
      </div>
    </div>
  );
}

export function EvidenceOwnerActions({
  evidenceId,
  label,
  locked,
}: {
  evidenceId: string;
  label: string;
  locked: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(label);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const close = () => {
    setDialog(null);
    setError(null);
    setLoading(false);
  };

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api(`/api/evidence/${evidenceId}`, { method: "PATCH", body: { label: name } });
      close();
      toast("Name updated.");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(errorMessage(err));
    }
  }

  async function remove() {
    setLoading(true);
    setError(null);
    try {
      await api(`/api/evidence/${evidenceId}`, { method: "DELETE" });
      toast("Evidence deleted.");
      router.push("/vault");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <EmailShareButton
        endpoint={`/api/evidence/${evidenceId}/shares`}
        buttonLabel="Share by email"
        title="Share this evidence"
        risk="You are choosing to share this evidence. The person you share it with will be able to see it, and anything shared can be passed on. Sharing can't be undone in this version of SafeTrail."
        successText="Evidence shared."
      />
      <LinkShareButton
        endpoint={`/api/evidence/${evidenceId}/links`}
        title="Create a password link"
        risk="Anyone who has this link, its password and a SafeTrail account will be able to see this evidence, and anything shared can be passed on."
      />
      <Button variant="secondary" disabled={locked} onClick={() => setDialog("rename")}>
        <Pencil size={18} strokeWidth={1.75} aria-hidden />
        Rename
      </Button>
      <Button variant="danger" disabled={locked} onClick={() => setDialog("delete")}>
        <Trash2 size={18} strokeWidth={1.75} aria-hidden />
        Delete
      </Button>
      {locked && (
        <p className="flex items-start gap-1 text-[13px] leading-[18px] text-muted">
          <Info size={16} strokeWidth={1.75} aria-hidden className="mt-px shrink-0" />
          This evidence is part of an escalated case, so it can&apos;t be renamed or deleted.
        </p>
      )}

      <Dialog open={dialog === "rename"} onClose={close} title="Rename this evidence">
        <form onSubmit={rename} className="flex flex-col gap-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} error={error} />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={close}>
              Go back
            </Button>
            <Button type="submit" loading={loading}>
              Save name
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={dialog === "delete"}
        onClose={close}
        title="Delete this evidence?"
        description="You won't be able to get it back. It will also be removed from any draft cases and from anyone you shared it with."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Go back
            </Button>
            <Button variant="danger-solid" loading={loading} onClick={remove}>
              Delete evidence
            </Button>
          </>
        }
      >
        {error && <Banner tone="attention">{error}</Banner>}
      </Dialog>
    </div>
  );
}

