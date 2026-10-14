"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/client-api";

const CHECK_EVERY_MS = 5000;

/**
 * Keeps the rest of an open draft current (evidence, people, status): asks every
 * few seconds whether the case has changed and reloads the page's data if so.
 * Stops while the tab is hidden. The title and description are kept live
 * separately, by CollabProvider.
 */
export function CaseLive({ caseId, updatedAt }: { caseId: string; updatedAt: string }) {
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const now = await api<{ updatedAt: string; status: string }>(`/api/cases/${caseId}?only=version`);
        if (stopped) return;
        if (now.status !== "draft" || new Date(now.updatedAt).getTime() !== new Date(updatedAt).getTime()) {
          router.refresh();
        }
      } catch (err) {
        if (stopped || !(err instanceof ApiError) || err.status !== 404) return; // offline: try again next time
        stopped = true;
        toast("This case is no longer available to you.");
        router.push("/cases");
        router.refresh();
      }
    };
    const every = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(every);
      document.removeEventListener("visibilitychange", check);
    };
  }, [caseId, updatedAt, router, toast]);

  return null;
}
