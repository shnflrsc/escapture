-- Row-level security on every table, with no policies. The app connects as the tables' owner, which
-- RLS does not restrict (no FORCE), so it works as before. Any other role, such as the anon and
-- authenticated roles behind Supabase's public Data API, can read and change nothing.
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "case_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "case_collaborators" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "case_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "case_evidence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "case_flags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "case_presence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evidence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evidence_shares" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "flagged_words" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "share_links" ENABLE ROW LEVEL SECURITY;