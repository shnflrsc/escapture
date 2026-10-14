ALTER TABLE "user" ADD COLUMN "office" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "evidence_shares" ADD COLUMN "via" "collaborator_via" DEFAULT 'email' NOT NULL;