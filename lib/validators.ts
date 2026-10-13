import { z } from "zod";

/** Largest evidence file stored (the HTML itself). */
export const MAX_EVIDENCE_BYTES = 12 * 1024 * 1024;
/** Largest upload request body. Captures may arrive gzip-compressed to fit in it. */
export const MAX_UPLOAD_REQUEST_BYTES = 4 * 1024 * 1024;

const email = z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email."));
const acknowledge = z.literal(true, {
  error: "Please confirm that you understand before sharing.",
});
const linkPassword = z
  .string()
  .min(8, "Use a password with at least 8 characters.")
  .max(200, "That password is too long.");

export const uuid = z.uuid("That id isn't valid.");

export const evidenceKind = z.enum(["facebook_post", "facebook_message"]);

export const tamperReport = z.object({
  checks: z
    .array(
      z.object({
        id: z.string().max(64),
        passed: z.boolean(),
        detail: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(32),
  allPassed: z.boolean(),
  warnings: z.array(z.string().max(500)).max(32).optional(),
  extensionVersion: z.string().max(32).optional(),
  // Size of the captured area on the original page. Only used to size the viewer.
  size: z
    .object({
      width: z.number().int().min(1).max(20_000),
      height: z.number().int().min(1).max(2_000_000),
      // How tall the finished capture is when laid out at a few frame widths.
      fit: z.array(z.object({ w: z.number().int().min(100).max(4000), h: z.number().int().min(1).max(2_000_000) })).max(6).optional(),
    })
    .optional(),
});

export const evidenceUpload = z.object({
  sha256: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "sha256 must be 64 hex characters.")
    .transform((s) => s.toLowerCase()),
  kind: evidenceKind,
  sourceUrl: z.url("sourceUrl must be a URL.").max(2048),
  clientCapturedAt: z.iso.datetime({ offset: true }).optional(),
  tamperReport,
  extensionVersion: z.string().max(32).optional(),
});

export const evidenceScope = z.enum(["mine", "shared"]).default("mine");
export const evidenceSort = z.enum(["newest", "oldest", "name"]);
export const evidenceListQuery = z.object({
  scope: evidenceScope,
  q: z.string().trim().max(120).optional(),
  kind: evidenceKind.optional(),
  sort: evidenceSort.optional(),
});
export const renameEvidence = z.object({ label: z.string().trim().min(1, "Give it a name.").max(120) });

export const shareByEmail = z.object({ email, acknowledge });
export const createLink = z.object({ password: linkPassword, acknowledge });
export const redeemLink = z.object({ password: z.string().min(1).max(200) });

const title = z.string().trim().min(1, "Give your case a title.").max(160);
const description = z.string().trim().max(10000);
export const createCase = z.object({ title, description: description.default("") });
export const updateCase = z
  .object({
    title: title.optional(),
    description: description.optional(),
    // What each field held when the edit began. Not trimmed: it is compared with the stored text.
    base: z.object({ title: z.string().max(160).optional(), description: z.string().max(10000).optional() }).optional(),
  })
  .refine((v) => v.title !== undefined || v.description !== undefined, "Nothing to update.");
export const attachOneEvidence = z.object({ evidenceId: uuid });
export const attachEvidence = z.union([
  attachOneEvidence,
  z.object({ evidenceIds: z.array(uuid).min(1, "Choose at least one item.").max(100) }),
]);
export const escalate = z.object({
  digest: z.string().regex(/^[0-9a-f]{64}$/, "digest must be 64 hex characters."),
  confirm: z.literal(true, { error: "Please confirm before escalating." }),
});

export const boardStatus = z.enum(["escalated", "under_review"]).optional();
export const boardQuery = z.object({
  status: boardStatus,
  q: z.string().trim().max(120).optional(),
  sort: z.enum(["escalated", "-escalated", "status", "-status", "reporter", "-reporter"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
});
export const reviewStatus = z.object({ status: z.literal("under_review") });
export const closeCase = z.object({
  note: z.string().trim().min(1, "Please write a closing note.").max(5000),
});
export const createReviewer = z.object({
  name: z.string().trim().min(1, "Enter the reviewer's name.").max(80),
  email,
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});
export const markRead = z.object({ ids: z.array(uuid).max(200).optional() });
