"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client-api";
import { initials } from "@/lib/format";

type Person = { id: string; name: string; email: string };

/**
 * Who has been asked to take a case. Everyone on the review side sees the list;
 * an administrator can add to it and take people off while the case is open.
 */
export function AssignReviewers({
  caseId,
  assignees,
  reviewers,
  canEdit,
}: {
  caseId: string;
  assignees: Person[];
  /** Reviewer accounts that could still be assigned. Only sent to an administrator. */
  reviewers: Person[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, work: () => Promise<unknown>, done: string) {
    setBusy(key);
    try {
      await work();
      toast(done);
      setChoice("");
    } catch (err) {
      toast(errorMessage(err));
    }
    setBusy(null);
    router.refresh();
  }

  const chosen = reviewers.find((r) => r.id === choice);

  return (
    <div className="flex flex-col gap-3">
      {assignees.length === 0 ? (
        <p className="text-sm leading-[22px] text-muted">
          No one is assigned yet.{!canEdit && " Any reviewer can still work on this case."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {assignees.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[13px] leading-none font-bold text-brand-800"
              >
                {initials(p.name)}
              </span>
              <span className="min-w-0 flex-1 text-sm leading-5">
                <span className="block font-semibold">{p.name}</span>
                <span className="block text-[13px] leading-[18px] break-all text-muted">{p.email}</span>
              </span>
              {canEdit && (
                <button
                  type="button"
                  aria-label={`Take ${p.name} off this case`}
                  title="Take off this case"
                  disabled={busy !== null}
                  onClick={() =>
                    run(
                      p.id,
                      () => api(`/api/review/cases/${caseId}/assignees/${p.id}`, { method: "DELETE" }),
                      `${p.name} was taken off this case and has been told.`,
                    )
                  }
                  className="grid size-10 shrink-0 place-items-center rounded-md text-muted transition-colors duration-150 ease-out hover:bg-brand-100 hover:text-brand-800 disabled:cursor-not-allowed disabled:text-disabled-fg"
                >
                  <X size={18} strokeWidth={1.75} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit &&
        (reviewers.length > 0 ? (
          <form
            className="flex flex-col gap-3 border-t border-border pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!chosen) return;
              void run(
                "assign",
                () => api(`/api/review/cases/${caseId}/assignees`, { body: { reviewerId: chosen.id } }),
                `${chosen.name} was assigned and has been notified.`,
              );
            }}
          >
            <Select
              label="Assign a reviewer"
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              hint="Other reviewers can still open and work on this case."
            >
              <option value="">Choose a reviewer</option>
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.email})
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" disabled={!chosen} loading={busy === "assign"}>
              Assign
            </Button>
          </form>
        ) : (
          <p className="border-t border-border pt-3 text-sm leading-[22px] text-muted">
            {assignees.length > 0 ? "Every active reviewer is assigned. " : "There are no active reviewer accounts. "}
            <Link href="/admin/reviewers" className="link">
              Reviewer accounts
            </Link>
          </p>
        ))}
    </div>
  );
}
