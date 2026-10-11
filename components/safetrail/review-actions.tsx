"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Banner } from "@/components/ui/feedback";
import { Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/client-api";

export function ReviewStatusControls({
  caseId,
  status,
}: {
  caseId: string;
  status: "draft" | "escalated" | "under_review" | "closed";
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"start" | "close" | null>(null);

  if (status === "closed" || status === "draft") return null;

  const closeDialog = () => {
    setOpen(false);
    setError(null);
    setLoading(null);
  };

  async function start() {
    setLoading("start");
    try {
      await api(`/api/review/cases/${caseId}/status`, { body: { status: "under_review" } });
      toast("Case moved to under review. The reporter has been notified.");
    } catch (err) {
      toast(errorMessage(err));
    }
    setLoading(null);
    router.refresh();
  }

  async function close(e: React.FormEvent) {
    e.preventDefault();
    setLoading("close");
    setError(null);
    try {
      await api(`/api/review/cases/${caseId}/close`, { body: { note } });
      closeDialog();
      toast("Case closed. The reporter has been notified.");
      router.refresh();
    } catch (err) {
      setLoading(null);
      setError(errorMessage(err));
      if (err instanceof ApiError && err.status === 409) router.refresh();
    }
  }

  return (
    <div className="flex gap-3">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Close case
      </Button>
      {status === "escalated" && (
        <Button loading={loading === "start"} onClick={start}>
          Start review
        </Button>
      )}
      <Dialog
        open={open}
        onClose={closeDialog}
        title="Close this case"
        description="The closing note is shown to the student who reported and their collaborators. A closed case can't be reopened."
      >
        <form onSubmit={close} className="flex flex-col gap-4">
          {error && <Banner tone="attention">{error}</Banner>}
          <Textarea
            label="Closing note"
            required
            maxLength={5000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            hint="Say what was decided or where the case was referred, in plain language."
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={closeDialog}>
              Go back
            </Button>
            <Button type="submit" loading={loading === "close"} disabled={!note.trim()}>
              Close case
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function ReviewerAttach({
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
        Nothing to attach. Evidence that someone shares with you by email or link can be attached here.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/api/review/cases/${caseId}/evidence`, { body: { evidenceId: selected } });
      setSelected("");
      toast("Attached. Only reviewers can see it.");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <Select
          label="Attach evidence shared with you"
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
        Attach
      </Button>
    </form>
  );
}
