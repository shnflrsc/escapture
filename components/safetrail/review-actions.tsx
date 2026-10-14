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
 * Under review -> Closed. Takes the place of "Start review" in the page header
 * once a review has started. It opens a dialog for what was done; closing can't
 * be undone, so nothing happens until Close is pressed there.
 */
export function CloseCaseButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cancel = () => {
    if (loading) return;
    setOpen(false);
    setError(null);
  };

  async function close() {
    if (!note.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/api/review/cases/${caseId}/close`, { body: { note } });
      setOpen(false);
      toast("Case closed. The reporter has been notified.");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      // Someone else closed it meanwhile: show the page as it now is.
      if (err instanceof ApiError && err.status === 409) router.refresh();
    }
    setLoading(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CircleCheck size={18} strokeWidth={1.75} aria-hidden />
        Close case
      </Button>
      <Dialog
        open={open}
        onClose={cancel}
        title="Close this case"
        description="The student and collaborators will see this. A closed case can't be reopened."
        footer={
          <>
            <Button variant="ghost" onClick={cancel}>
              Cancel
            </Button>
            <Button loading={loading} disabled={!note.trim()} onClick={close}>
              Close
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Banner tone="attention">{error}</Banner>}
          <Textarea
            label="Actions taken"
            required
            maxLength={5000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </Dialog>
    </>
  );
}
