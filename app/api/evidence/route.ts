import { gunzipSync } from "node:zlib";
import {
  evidenceListQuery,
  evidenceUpload,
  MAX_EVIDENCE_BYTES,
  MAX_UPLOAD_REQUEST_BYTES,
  tamperReport,
} from "@/lib/validators";
import { requireUser } from "@/server/auth";
import { AppError, badRequest } from "@/server/errors";
import { handle, json } from "@/server/http";
import { createEvidence, listEvidence } from "@/server/services/evidence";

const tooLarge = () => new AppError("too_large", 413, "This capture is too large. Select a smaller area.");

export const GET = handle(async (req) => {
  const user = await requireUser();
  const params = new URL(req.url).searchParams;
  const pick = (key: string) => params.get(key) ?? undefined;
  const { scope, ...filters } = evidenceListQuery.parse({
    scope: pick("scope"),
    q: pick("q"),
    kind: pick("kind"),
    sort: pick("sort"),
  });
  return json({ items: await listEvidence(user, scope, filters) });
});

export const POST = handle(async (req) => {
  const user = await requireUser({ roles: ["student"] });
  // Reject obviously oversized bodies before reading them (64 KB of form overhead allowed).
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_REQUEST_BYTES + 64 * 1024) throw tooLarge();
  const form = await req.formData().catch(() => null);
  if (!form) throw badRequest("Send the capture as multipart form data.");
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("The capture file is missing.");
  if (file.size > MAX_UPLOAD_REQUEST_BYTES) throw tooLarge();
  const gzipped = form.get("encoding") === "gzip";
  const type = file.type.split(";")[0].trim();
  if (type !== (gzipped ? "application/gzip" : "text/html")) throw badRequest("The capture must be an HTML file.");

  let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer());
  if (gzipped) {
    try {
      // maxOutputLength stops a small upload from unpacking into a huge one.
      bytes = new Uint8Array(gunzipSync(bytes, { maxOutputLength: MAX_EVIDENCE_BYTES + 1 }));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ERR_BUFFER_TOO_LARGE") throw tooLarge();
      throw badRequest("The capture could not be unpacked. Please capture it again.");
    }
  }

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
  return json(await createEvidence(user, { ...input, bytes }), 201);
});
