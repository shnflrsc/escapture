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

const COPY = {
  // The owner adds their own evidence to one of their draft cases.
  owner: {
    button: "Add to a case",
    none: "You have no draft cases to add this to.",
    title: "Add to a case",
    description:
      "It will be added to that draft case. Reviewers can see a case and its evidence only after you escalate it.",
    submit: "Add",
    done: "Added to the case.",
    endpoint: (caseId: string) => `/api/cases/${caseId}/evidence`,
  },
  // A reviewer attaches evidence that was shared with them to an open case.
  reviewer: {
    button: "Attach to a case",
    none: "There is no open case to attach this to. Cases appear on the Review Board once a student escalates them.",
    title: "Attach to a case",
    description:
      "It will be added under “Added by reviewers” on that case. The student who reported the case and their collaborators never see reviewer attachments.",
    submit: "Attach",
    done: "Attached to the case. Only reviewers can see it there.",
    endpoint: (caseId: string) => `/api/review/cases/${caseId}/evidence`,
  },
};

export function AttachToCase({
  evidenceId,
  cases,
  as,
}: {
  evidenceId: string;
  /** Cases this evidence can be added to and is not in yet. */
  cases: { id: string; title: string; reporterName?: string }[];
  as: keyof typeof COPY;
}) {
  const router = useRouter();
  const toast = useToast();
  const copy = COPY[as];
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
      await api(copy.endpoint(caseId), { body: { evidenceId } });
      close();
      toast(copy.done);
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
        {copy.button}
      </Button>
      {cases.length === 0 && <p className="text-[13px] leading-[18px] text-muted">{copy.none}</p>}
      <Dialog open={open} onClose={close} title={copy.title} description={copy.description}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <Banner tone="attention">{error}</Banner>}
          <Select label="Case" value={caseId} onChange={(e) => setCaseId(e.target.value)} required>
            <option value="">Choose a case</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {c.reporterName ? ` (reported by ${c.reporterName})` : ""}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={close}>
              Go back
            </Button>
            <Button type="submit" loading={loading} disabled={!caseId}>
              {copy.submit}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
