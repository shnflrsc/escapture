import { EVIDENCE_FILE_HEADERS } from "@/lib/evidence-headers";
import { uuid } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { handle } from "@/server/http";
import { getEvidenceFile } from "@/server/services/evidence";

export const GET = handle<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  const bytes = await getEvidenceFile(user, uuid.parse(id));
  return new Response(new Blob([bytes as BlobPart]), { status: 200, headers: EVIDENCE_FILE_HEADERS });
});
