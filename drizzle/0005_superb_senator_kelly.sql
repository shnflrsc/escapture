CREATE TABLE "case_flags" (
	"case_id" uuid NOT NULL,
	"word" text NOT NULL,
	CONSTRAINT "case_flags_case_id_word_pk" PRIMARY KEY("case_id","word")
);
--> statement-breakpoint
CREATE TABLE "flagged_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"word" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flagged_words_word_unique" UNIQUE("word")
);
--> statement-breakpoint
ALTER TABLE "case_flags" ADD CONSTRAINT "case_flags_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flagged_words" ADD CONSTRAINT "flagged_words_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- A starting list for the team and the Guidance office to edit on the admin Word bank page.
INSERT INTO "flagged_words" ("word") VALUES ('suicide'), ('suicidal'), ('kill myself'), ('end my life'), ('want to die'), ('self-harm'), ('self harm'), ('cut myself'), ('kill you'), ('hurt you'), ('threaten'), ('stalk'), ('rape'), ('nudes'), ('blackmail'), ('magpakamatay'), ('papatayin kita'), ('patayin kita'), ('mamatay ka na'), ('saktan kita'), ('ikakalat ko'), ('hubad') ON CONFLICT DO NOTHING;