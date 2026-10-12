"use client";

import { Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Banner } from "@/components/ui/feedback";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client-api";

/** Reviewer only: attach evidence that was shared with them to one of the open cases. */
export function AttachToCase({
  evidenceId,
  cases,
}: {
  evidenceId: string;
  /** Open cases this evidence is not attached to yet. */
  cases: { id: string; title: string; reporterName: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const close = () => {
    setOpen(false);
    setCaseId("");
    setError(null);
    setLoading(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/api/review/cases/${caseId}/evidence`, { body: { evidenceId } });
      close();
      toast("Attached to the case. Only reviewers can see it there.");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={cases.length === 0}>
        <Paperclip size={18} strokeWidth={1.75} aria-hidden />
        Attach to a case
      </Button>
      {cases.length === 0 && (
        <p className="text-[13px] leading-[18px] text-muted">
          There is no open case to attach this to. Cases appear on the Review Board once a student escalates them.
        </p>
      )}
      <Dialog
        open={open}
        onClose={close}
        title="Attach to a case"
        description="It will be added under “Added by reviewers” on that case. The student who reported the case and their collaborators never see reviewer attachments."
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <Banner tone="attention">{error}</Banner>}
          <Select label="Case" value={caseId} onChange={(e) => setCaseId(e.target.value)} required>
            <option value="">Choose a case</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} (reported by {c.reporterName})
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={close}>
              Go back
            </Button>
            <Button type="submit" loading={loading} disabled={!caseId}>
              Attach
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
