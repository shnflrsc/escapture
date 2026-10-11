import { z } from "zod";

export const MAX_EVIDENCE_BYTES = 4 * 1024 * 1024;

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
export const renameEvidence = z.object({ label: z.string().trim().min(1, "Give it a name.").max(120) });

export const shareByEmail = z.object({ email, acknowledge });
export const createLink = z.object({ password: linkPassword, acknowledge });
export const redeemLink = z.object({ password: z.string().min(1).max(200) });

const title = z.string().trim().min(1, "Give your case a title.").max(160);
const description = z.string().trim().max(10000);
export const createCase = z.object({ title, description: description.default("") });
export const updateCase = z
  .object({ title: title.optional(), description: description.optional() })
  .refine((v) => v.title !== undefined || v.description !== undefined, "Nothing to update.");
export const attachEvidence = z.object({ evidenceId: uuid });
export const escalate = z.object({
  digest: z.string().regex(/^[0-9a-f]{64}$/, "digest must be 64 hex characters."),
  confirm: z.literal(true, { error: "Please confirm before escalating." }),
});

export const boardStatus = z.enum(["escalated", "under_review"]).optional();
export const reviewStatus = z.object({ status: z.literal("under_review") });
export const closeCase = z.object({
  note: z.string().trim().min(1, "Please write a closing note.").max(5000),
});
export const markRead = z.object({ ids: z.array(uuid).max(200).optional() });
