ALTER TABLE "case_evidence" DROP CONSTRAINT "case_evidence_evidence_id_evidence_id_fk";
--> statement-breakpoint
ALTER TABLE "case_evidence" ALTER COLUMN "evidence_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "case_evidence" ADD COLUMN "record_label" text;--> statement-breakpoint
ALTER TABLE "case_evidence" ADD COLUMN "record_sha256" char(64);--> statement-breakpoint
ALTER TABLE "case_evidence" ADD COLUMN "record_kind" "evidence_kind";--> statement-breakpoint
ALTER TABLE "case_evidence" ADD COLUMN "record_captured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "case_evidence" ADD COLUMN "record_owner_name" text;--> statement-breakpoint
ALTER TABLE "case_evidence" ADD COLUMN "record_owner_email" text;--> statement-breakpoint
ALTER TABLE "case_evidence" ADD CONSTRAINT "case_evidence_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "case_evidence" SET "record_label" = e."label", "record_sha256" = e."sha256", "record_kind" = e."kind", "record_captured_at" = e."captured_at", "record_owner_name" = u."name", "record_owner_email" = u."email" FROM "evidence" e, "user" u, "cases" c WHERE e."id" = "case_evidence"."evidence_id" AND u."id" = e."owner_id" AND c."id" = "case_evidence"."case_id" AND c."status" = 'closed';