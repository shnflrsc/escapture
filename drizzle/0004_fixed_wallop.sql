CREATE TABLE "case_presence" (
	"case_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"field" text,
	"selection_start" integer,
	"selection_end" integer,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_presence_case_id_user_id_pk" PRIMARY KEY("case_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "case_presence" ADD CONSTRAINT "case_presence_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_presence" ADD CONSTRAINT "case_presence_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;