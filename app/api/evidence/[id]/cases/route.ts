import { uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle, json } from "@/server/http";
import { casesForEvidence } from "@/server/services/cases";
import { getEvidence } from "@/server/services/evidence";

/** A student's own cases that hold this evidence, and the drafts it could be added to. */
export const GET = handle<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser({ roles: ["student"] });
  // 404 unless the viewer may see the evidence at all.
  const ev = await getEvidence(user, uuid.parse(id));
  return json(await casesForEvidence(user, ev));
});
