"use client";

import { FileText, MessagesSquare, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Banner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/client-api";
import { formatDateTime, kindLabel } from "@/lib/format";

type Item = { id: string; label: string; kind: "facebook_post" | "facebook_message"; capturedAt: Date | string };

const control = "h-10 rounded-md border border-border-strong bg-card text-[15px] leading-5 text-ink placeholder:text-muted";

/** Add evidence to a draft: your vault as a list you tick, one or several at a time. */
export function EvidencePicker({
  caseId,
  available,
  vaultEmpty,
}: {
  caseId: string;
  /** Your own items that are not in this case yet, newest first. */
  available: Item[];
  vaultEmpty: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const close = () => {
    setOpen(false);
    setQ("");
    setKind("");
    setPicked(new Set());
    setError(null);
    setLoading(false);
  };

  const needle = q.trim().toLowerCase();
  const shown = available.filter(
    (e) => (!kind || e.kind === kind) && (!needle || e.label.toLowerCase().includes(needle)),
  );
  // Ticks survive a search, but only what can still be added counts.
  const chosen = available.filter((e) => picked.has(e.id)).map((e) => e.id);

  const toggle = (id: string) =>
    setPicked((old) => {
      const next = new Set(old);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  async function add() {
    if (chosen.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/api/cases/${caseId}/evidence`, { body: { evidenceIds: chosen } });
      close();
      toast(chosen.length === 1 ? "Added to the case." : `${chosen.length} items added to the case.`);
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(errorMessage(err));
      // Already added from somewhere else, or the case was escalated: show what is true now.
      if (err instanceof ApiError && err.status === 409) router.refresh();
    }
  }

  return (
    <>
      <Button variant="soft" onClick={() => setOpen(true)}>
        <Plus size={18} strokeWidth={1.75} aria-hidden />
        Add evidence
      </Button>
      <Dialog
        open={open}
        onClose={close}
        wide
        title="Add evidence from your vault"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Go back
            </Button>
            <Button loading={loading} disabled={chosen.length === 0} onClick={add}>
              {chosen.length === 0 ? "Add" : chosen.length === 1 ? "Add 1 item" : `Add ${chosen.length} items`}
            </Button>
          </>
        }
      >
        {error && <Banner tone="attention">{error}</Banner>}
        {available.length === 0 ? (
          <p className="text-sm leading-[22px] text-muted">
            {vaultEmpty
              ? "Your vault is empty. Evidence you capture with the Escrow Capture extension will appear here."
              : "Everything in your vault is already in this case."}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <label className="relative min-w-[180px] flex-1">
                <span className="sr-only">Search your vault by name</span>
                <Search
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name"
                  className={`${control} w-full pr-3 pl-10`}
                />
              </label>
              <label>
                <span className="sr-only">Kind</span>
                <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${control} px-3`}>
                  <option value="">All kinds</option>
                  <option value="facebook_post">Posts</option>
                  <option value="facebook_message">Messages</option>
                </select>
              </label>
            </div>
            {shown.length === 0 ? (
              <p className="text-sm leading-[22px] text-muted">Nothing in your vault matches.</p>
            ) : (
              <ul
                aria-label="Evidence you can add"
                className="max-h-[45vh] overflow-y-auto rounded-md border border-border"
              >
                {shown.map((e) => {
                  const KindIcon = e.kind === "facebook_post" ? FileText : MessagesSquare;
                  return (
                    <li key={e.id} className="border-b border-border last:border-b-0">
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-brand-50 has-[:checked]:bg-brand-50">
                        <input
                          type="checkbox"
                          checked={picked.has(e.id)}
                          onChange={() => toggle(e.id)}
                          className="size-4 shrink-0 accent-[var(--brand-700)]"
                        />
                        <KindIcon size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-brand-700" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] leading-[22px] font-semibold">{e.label}</span>
                          <span className="block text-[13px] leading-[18px] text-muted">
                            {kindLabel(e.kind)} · Captured <span className="tnum">{formatDateTime(e.capturedAt)}</span>
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
