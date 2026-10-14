ALTER TYPE "public"."case_event_type" ADD VALUE 'assigned';--> statement-breakpoint
ALTER TYPE "public"."case_event_type" ADD VALUE 'unassigned';--> statement-breakpoint
CREATE TABLE "case_assignments" (
	"case_id" uuid NOT NULL,
	"reviewer_id" text NOT NULL,
	"assigned_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_assignments_case_id_reviewer_id_pk" PRIMARY KEY("case_id","reviewer_id")
);
--> statement-breakpoint
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_assignments_reviewer_idx" ON "case_assignments" USING btree ("reviewer_id");