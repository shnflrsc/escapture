import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const evidenceKind = pgEnum("evidence_kind", ["facebook_post", "facebook_message"]);
export const linkResourceType = pgEnum("link_resource_type", ["evidence", "case"]);
export const caseStatus = pgEnum("case_status", ["draft", "escalated", "under_review", "closed"]);
export const collaboratorVia = pgEnum("collaborator_via", ["email", "link"]);
export const evidenceSide = pgEnum("evidence_side", ["reporter", "reviewer"]);
export const caseEventType = pgEnum("case_event_type", [
  "created",
  "escalated",
  "status_changed",
  "closed",
  "assigned",
  "unassigned",
]);

export type TamperReport = {
  checks: { id: string; passed: boolean; detail?: string }[];
  allPassed: boolean;
  warnings?: string[];
  extensionVersion?: string;
  size?: { width: number; height: number; fit?: { w: number; h: number }[] };
};

export const evidence = pgTable(
  "evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id),
    kind: evidenceKind("kind").notNull(),
    label: text("label").notNull(),
    sourceUrl: text("source_url").notNull(),
    storagePath: text("storage_path").notNull().unique(),
    sha256: char("sha256", { length: 64 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    // Server-side capture time (I7). Never taken from the client.
    capturedAt: ts("captured_at").notNull().defaultNow(),
    clientCapturedAt: ts("client_captured_at"),
    tamperReport: jsonb("tamper_report").$type<TamperReport>().notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("evidence_owner_idx").on(t.ownerId)],
).enableRLS();

export const evidenceShares = pgTable(
  "evidence_shares",
  {
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => evidence.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    sharedBy: text("shared_by")
      .notNull()
      .references(() => user.id),
    acknowledgedAt: ts("acknowledged_at").notNull(),
    // How it reached them: shared to their email, or through a password link they opened.
    via: collaboratorVia("via").notNull().default("email"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.evidenceId, t.userId] })],
).enableRLS();

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: caseStatus("status").notNull().default("draft"),
    escalatedAt: ts("escalated_at"),
    closedAt: ts("closed_at"),
    closedBy: text("closed_by").references(() => user.id),
    closingNote: text("closing_note"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("cases_owner_idx").on(t.ownerId), index("cases_status_idx").on(t.status)],
).enableRLS();

export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
    resourceType: linkResourceType("resource_type").notNull(),
    evidenceId: uuid("evidence_id").references(() => evidence.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    acknowledgedAt: ts("acknowledged_at").notNull(),
    revokedAt: ts("revoked_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "share_links_one_resource",
      sql`(${t.resourceType} = 'evidence' AND ${t.evidenceId} IS NOT NULL AND ${t.caseId} IS NULL) OR (${t.resourceType} = 'case' AND ${t.caseId} IS NOT NULL AND ${t.evidenceId} IS NULL)`,
    ),
  ],
).enableRLS();

// The owner is NOT in this table.
export const caseCollaborators = pgTable(
  "case_collaborators",
  {
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    addedBy: text("added_by")
      .notNull()
      .references(() => user.id),
    via: collaboratorVia("via").notNull(),
    acknowledgedAt: ts("acknowledged_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.caseId, t.userId] })],
).enableRLS();

// The words administrators keep for flagging escalated cases (see lib/flags.ts). Stored normalized:
// lowercase, without accents, single spaces.
export const flaggedWords = pgTable("flagged_words", {
  id: uuid("id").primaryKey().defaultRandom(),
  word: text("word").notNull().unique(),
  // Null for the words Escapture starts with.
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
}).enableRLS();

// Which bank words a case's title or description contains. Worked out at escalation, and again for
// every escalated or closed case whenever the bank changes. Drafts are never checked.
export const caseFlags = pgTable(
  "case_flags",
  {
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
  },
  (t) => [primaryKey({ columns: [t.caseId, t.word] })],
).enableRLS();

// Who has a case open right now, and where their caret is. A row older than a few seconds means
// they have left; rows are overwritten, never accumulated.
export const casePresence = pgTable(
  "case_presence",
  {
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The field their caret is in ("title" or "description"), or empty when they are only looking.
    field: text("field"),
    selectionStart: integer("selection_start"),
    selectionEnd: integer("selection_end"),
    seenAt: ts("seen_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.caseId, t.userId] })],
).enableRLS();

// Reviewers an administrator has asked to take a case. It routes work; it does not limit who can review.
export const caseAssignments = pgTable(
  "case_assignments",
  {
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assignedBy: text("assigned_by")
      .notNull()
      .references(() => user.id),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.caseId, t.reviewerId] }), index("case_assignments_reviewer_idx").on(t.reviewerId)],
).enableRLS();

// While a case is a draft, escalated or under review, evidence_id is always set
// and the evidence service refuses to delete the item (I3). When the case is
// closed, the columns below record what it was; after that its owner may rename
// or delete it, and a deleted item leaves evidence_id empty.
export const caseEvidence = pgTable(
  "case_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    evidenceId: uuid("evidence_id").references(() => evidence.id, { onDelete: "set null" }),
    attachedBy: text("attached_by")
      .notNull()
      .references(() => user.id),
    side: evidenceSide("side").notNull(),
    // The record kept when the case closes. Empty until then.
    recordLabel: text("record_label"),
    recordSha256: char("record_sha256", { length: 64 }),
    recordKind: evidenceKind("record_kind"),
    recordCapturedAt: ts("record_captured_at"),
    recordOwnerName: text("record_owner_name"),
    recordOwnerEmail: text("record_owner_email"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [unique("case_evidence_unique").on(t.caseId, t.evidenceId)],
).enableRLS();

export const caseEvents = pgTable(
  "case_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    type: caseEventType("type").notNull(),
    fromStatus: caseStatus("from_status"),
    toStatus: caseStatus("to_status"),
    note: text("note"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("case_events_case_idx").on(t.caseId)],
).enableRLS();

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
    evidenceId: uuid("evidence_id").references(() => evidence.id, { onDelete: "set null" }),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_read_idx").on(t.userId, t.readAt)],
).enableRLS();
