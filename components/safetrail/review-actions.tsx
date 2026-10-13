"use client";

import { CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Banner } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/client-api";

/** Escalated -> Under review. Shown in the page header while a case is only escalated. */
export function StartReviewButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="secondary"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await api(`/api/review/cases/${caseId}/status`, { body: { status: "under_review" } });
          toast("Case moved to under review. The reporter has been notified.");
        } catch (err) {
          toast(errorMessage(err));
        }
        setLoading(false);
        router.refresh();
      }}
    >
      Start review
    </Button>
  );
}

/**
 * The "Close this case" panel: what was done, then close. Closing can't be
 * undone, so the button asks once more before it happens.
 */
export function CloseCasePanel({ caseId }: { caseId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function close() {
    setLoading(true);
    setError(null);
    try {
      await api(`/api/review/cases/${caseId}/close`, { body: { note } });
      setConfirming(false);
      toast("Case closed. The reporter has been notified.");
      router.refresh();
    } catch (err) {
      setConfirming(false);
      setError(errorMessage(err));
      if (err instanceof ApiError && err.status === 409) router.refresh();
    }
    setLoading(false);
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (note.trim()) setConfirming(true);
      }}
    >
      {error && <Banner tone="attention">{error}</Banner>}
      <Textarea
        label="Actions taken"
        required
        maxLength={5000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What the university did, and any next steps for the student"
        hint="The student who reported and collaborators will see this note. The case then moves to Case Archives."
      />
      <Button type="submit" disabled={!note.trim()} className="self-start">
        <CircleCheck size={18} strokeWidth={1.75} aria-hidden />
        Close case
      </Button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Close this case?"
        description="The student who reported and their collaborators will see your note. A closed case can't be reopened or changed."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Go back
            </Button>
            <Button loading={loading} onClick={close}>
              Close case
            </Button>
          </>
        }
      >
        <div className="rounded-md bg-subtle p-4">
          <p className="text-sm font-semibold">Actions taken</p>
          <p className="max-h-48 overflow-y-auto whitespace-pre-wrap">{note}</p>
        </div>
      </Dialog>
    </form>
  );
}
