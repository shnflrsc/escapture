"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";

/** Runs one removal at a time, says what happened, and reloads the page's lists. */
function useRemoval() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  async function remove(key: string, url: string, done: string) {
    setBusy(key);
    try {
      await api(url, { method: "DELETE" });
      toast(done);
    } catch (err) {
      toast(errorMessage(err));
    }
    setBusy(null);
    router.refresh();
  }
  return { busy, remove };
}

const row = "flex flex-wrap items-center justify-between gap-x-3 gap-y-1";
const small = "h-9 px-3 text-sm";

export type SharedWith = { id: string; name: string; email: string; role: string; via: "email" | "link" };

/** The people an item is shared with. Its owner can stop sharing with any of them. */
export function AccessList({ evidenceId, people }: { evidenceId: string; people: SharedWith[] }) {
  const { busy, remove } = useRemoval();
  return (
    <ul className="flex flex-col gap-2 text-sm leading-[22px]">
      {people.map((p) => (
        <li key={p.id} className={row}>
          <span className="min-w-0 break-words">
            <span className="font-semibold">{p.name}</span>
            {p.role !== "student" && " (reviewer)"}
            <span className="block text-[13px] leading-[18px] text-muted">
              {p.email} · {p.via === "link" ? "Password link" : "Email"}
            </span>
          </span>
          <Button
            variant="ghost"
            className={small}
            loading={busy === p.id}
            disabled={busy !== null}
            aria-label={`Stop sharing with ${p.name}`}
            onClick={() => remove(p.id, `/api/evidence/${evidenceId}/shares/${p.id}`, `${p.name} can no longer open this.`)}
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}

export type ActiveLink = { id: string; createdAt: Date | string; locked: boolean };

/**
 * The password links that still work, by when they were made. `endpoint` is the
 * resource's links address: revoking sends DELETE to `endpoint/{id}`.
 */
export function LinkList({ endpoint, links }: { endpoint: string; links: ActiveLink[] }) {
  const { busy, remove } = useRemoval();
  return (
    <ul className="flex flex-col gap-2 text-sm leading-[22px]">
      {links.map((l) => (
        <li key={l.id} className={row}>
          <span className="min-w-0">
            Created <span className="tnum">{formatDateTime(l.createdAt)}</span>
            {l.locked && <span className="block text-[13px] leading-[18px] text-muted">Locked after wrong passwords</span>}
          </span>
          <Button
            variant="ghost"
            className={small}
            loading={busy === l.id}
            disabled={busy !== null}
            aria-label={`Revoke the link created ${formatDateTime(l.createdAt)}`}
            onClick={() => remove(l.id, `${endpoint}/${l.id}`, "Link revoked. It no longer opens.")}
          >
            Revoke
          </Button>
        </li>
      ))}
    </ul>
  );
}
