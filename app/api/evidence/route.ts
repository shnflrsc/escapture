import { evidenceScope, evidenceUpload, MAX_EVIDENCE_BYTES, tamperReport } from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { AppError, badRequest } from "@/server/errors";
import { handle, json } from "@/server/http";
import { createEvidence, listEvidence } from "@/server/services/evidence";

const tooLarge = () => new AppError("too_large", 413, "This capture is too large. Select a smaller area.");

export const GET = handle(async (req) => {
  const user = await requireUser();
  const scope = evidenceScope.parse(new URL(req.url).searchParams.get("scope") ?? undefined);
  return json({ items: await listEvidence(user, scope) });
});

export const POST = handle(async (req) => {
  const user = await requireUser({ roles: ["student"] });
  // Reject obviously oversized bodies before reading them (64 KB of form overhead allowed).
  if (Number(req.headers.get("content-length") ?? 0) > MAX_EVIDENCE_BYTES + 64 * 1024) throw tooLarge();
  const form = await req.formData().catch(() => null);
  if (!form) throw badRequest("Send the capture as multipart form data.");
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("The capture file is missing.");
  if (file.type.split(";")[0].trim() !== "text/html") throw badRequest("The capture must be an HTML file.");
  if (file.size > MAX_EVIDENCE_BYTES) throw tooLarge();

  let report: unknown;
  try {
    report = JSON.parse(String(form.get("tamperReport") ?? ""));
  } catch {
    throw badRequest("tamperReport must be JSON.");
  }
  const text = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };
  const input = evidenceUpload.parse({
    sha256: text("sha256"),
    kind: text("kind"),
    sourceUrl: text("sourceUrl"),
    clientCapturedAt: text("clientCapturedAt"),
    tamperReport: tamperReport.parse(report),
    extensionVersion: text("extensionVersion"),
  });
  const bytes = new Uint8Array(await file.arrayBuffer());
  return json(await createEvidence(user, { ...input, bytes }), 201);
});
