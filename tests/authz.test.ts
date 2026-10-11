import { describe, expect, it } from "vitest";
import * as authz from "@/server/authz";

const student = (id: string) => ({ id, role: "student" as const });
const maya = student("maya");
const jules = student("jules");
const alex = student("alex");
const reviewer = { id: "rev", role: "reviewer" as const };
const admin = { id: "adm", role: "admin" as const };

const draft = { ownerId: "maya", status: "draft" as const, collaboratorIds: ["jules"] };
const escalated = { ...draft, status: "escalated" as const };
const underReview = { ...draft, status: "under_review" as const };
const closed = { ...draft, status: "closed" as const };

const facts = (over: Partial<authz.EvidenceFacts> = {}): authz.EvidenceFacts => ({
  ownerId: "maya",
  sharedWithUser: false,
  inOwnCaseReporterSide: false,
  attachedToNonDraftCase: false,
  ...over,
});

describe("evidence", () => {
  it("only students capture", () => {
    expect(authz.canCaptureEvidence(maya)).toBe("ok");
    expect(authz.canCaptureEvidence(reviewer)).toBe("forbidden");
    expect(authz.canCaptureEvidence(admin)).toBe("forbidden");
  });

  it("owner and direct recipients can view; strangers get not_found", () => {
    expect(authz.canViewEvidence(maya, facts())).toBe("ok");
    expect(authz.canViewEvidence(jules, facts({ sharedWithUser: true }))).toBe("ok");
    expect(authz.canViewEvidence(alex, facts())).toBe("not_found");
    expect(authz.canViewEvidence(admin, facts())).toBe("not_found");
  });

  it("case participants see reporter-side evidence of their cases", () => {
    expect(authz.canViewEvidence(jules, facts({ inOwnCaseReporterSide: true }))).toBe("ok");
  });

  it("reviewers see evidence only once it is on a non-draft case (I1, I2)", () => {
    expect(authz.canViewEvidence(reviewer, facts())).toBe("not_found");
    expect(authz.canViewEvidence(reviewer, facts({ attachedToNonDraftCase: true }))).toBe("ok");
  });

  it("students never see evidence just because a reviewer attached it (I5)", () => {
    const alexEvidence = facts({ ownerId: "alex", attachedToNonDraftCase: true });
    expect(authz.canViewEvidence(maya, alexEvidence)).toBe("not_found");
    expect(authz.canViewEvidence(jules, alexEvidence)).toBe("not_found");
  });

  it("only the owner manages; recipients cannot re-share", () => {
    expect(authz.canManageEvidence(maya, facts())).toBe("ok");
    expect(authz.canManageEvidence(jules, facts({ sharedWithUser: true }))).toBe("forbidden");
    expect(authz.canManageEvidence(alex, facts())).toBe("not_found");
  });

  it("evidence on an escalated case cannot be deleted or renamed (I3)", () => {
    expect(authz.canDeleteEvidence(maya, facts())).toBe("ok");
    expect(authz.canDeleteEvidence(maya, facts({ attachedToNonDraftCase: true }))).toBe("locked");
    expect(authz.canRenameEvidence(maya, facts({ attachedToNonDraftCase: true }))).toBe("locked");
    expect(authz.canDeleteEvidence(jules, facts({ sharedWithUser: true }))).toBe("forbidden");
  });
});

describe("cases, student side", () => {
  it("only students create cases", () => {
    expect(authz.canCreateCase(maya)).toBe("ok");
    expect(authz.canCreateCase(reviewer)).toBe("forbidden");
  });

  it("owner and collaborators view; everyone else gets not_found (I6)", () => {
    expect(authz.canViewCase(maya, draft)).toBe("ok");
    expect(authz.canViewCase(jules, draft)).toBe("ok");
    expect(authz.canViewCase(alex, draft)).toBe("not_found");
    expect(authz.canViewCase(alex, escalated)).toBe("not_found");
    expect(authz.canViewCase(reviewer, escalated)).toBe("not_found");
  });

  it("editing is draft only (I3)", () => {
    expect(authz.canEditCase(maya, draft)).toBe("ok");
    expect(authz.canEditCase(jules, draft)).toBe("ok");
    for (const c of [escalated, underReview, closed]) {
      expect(authz.canEditCase(maya, c)).toBe("locked");
      expect(authz.canEditCase(jules, c)).toBe("locked");
    }
    expect(authz.canEditCase(alex, draft)).toBe("not_found");
  });

  it("participants attach only their own evidence, only while draft", () => {
    expect(authz.canAttachEvidence(maya, draft, { ownerId: "maya" })).toBe("ok");
    expect(authz.canAttachEvidence(jules, draft, { ownerId: "jules" })).toBe("ok");
    expect(authz.canAttachEvidence(jules, draft, { ownerId: "maya" })).toBe("forbidden");
    expect(authz.canAttachEvidence(maya, draft, null)).toBe("not_found");
    expect(authz.canAttachEvidence(maya, escalated, { ownerId: "maya" })).toBe("locked");
    expect(authz.canAttachEvidence(alex, draft, { ownerId: "alex" })).toBe("not_found");
  });

  it("the attacher or the owner detaches, only while draft", () => {
    expect(authz.canDetachEvidence(maya, draft, { attachedBy: "jules" })).toBe("ok");
    expect(authz.canDetachEvidence(jules, draft, { attachedBy: "jules" })).toBe("ok");
    expect(authz.canDetachEvidence(jules, draft, { attachedBy: "maya" })).toBe("forbidden");
    expect(authz.canDetachEvidence(maya, escalated, { attachedBy: "maya" })).toBe("locked");
  });

  it("only the owner adds collaborators, previews and escalates, only while draft", () => {
    for (const fn of [authz.canAddCollaborator, authz.canPreviewEscalation, authz.canEscalate]) {
      expect(fn(maya, draft)).toBe("ok");
      expect(fn(jules, draft)).toBe("forbidden");
      expect(fn(alex, draft)).toBe("not_found");
      expect(fn(maya, escalated)).toBe("locked");
      expect(fn(maya, closed)).toBe("locked");
    }
  });
});

describe("review", () => {
  it("reviewers never see drafts (I1); non-reviewers are forbidden", () => {
    expect(authz.canReviewCase(reviewer, { status: "draft" })).toBe("not_found");
    expect(authz.canReviewCase(reviewer, { status: "escalated" })).toBe("ok");
    expect(authz.canReviewCase(reviewer, { status: "closed" })).toBe("ok");
    expect(authz.canReviewCase(maya, { status: "escalated" })).toBe("forbidden");
    expect(authz.canReviewCase(admin, { status: "escalated" })).toBe("forbidden");
  });

  it("allows only the documented status transitions, with no reopening", () => {
    expect(authz.canChangeStatus(reviewer, "escalated", "under_review")).toBe("ok");
    expect(authz.canChangeStatus(reviewer, "escalated", "closed")).toBe("ok");
    expect(authz.canChangeStatus(reviewer, "under_review", "closed")).toBe("ok");
    expect(authz.canChangeStatus(reviewer, "under_review", "under_review")).toBe("locked");
    expect(authz.canChangeStatus(reviewer, "closed", "under_review")).toBe("locked");
    expect(authz.canChangeStatus(reviewer, "closed", "closed")).toBe("locked");
    expect(authz.canChangeStatus(reviewer, "closed", "escalated")).toBe("locked");
    expect(authz.canChangeStatus(reviewer, "draft", "under_review")).toBe("not_found");
    expect(authz.canChangeStatus(maya, "escalated", "closed")).toBe("forbidden");
  });

  it("reviewers attach only evidence they own or were given", () => {
    const open = { status: "under_review" as const };
    expect(authz.canAttachAsReviewer(reviewer, open, { ownerId: "alex", sharedWithUser: true })).toBe("ok");
    expect(authz.canAttachAsReviewer(reviewer, open, { ownerId: "rev", sharedWithUser: false })).toBe("ok");
    expect(authz.canAttachAsReviewer(reviewer, open, { ownerId: "alex", sharedWithUser: false })).toBe("not_found");
    expect(authz.canAttachAsReviewer(reviewer, open, null)).toBe("not_found");
    expect(authz.canAttachAsReviewer(reviewer, { status: "closed" }, { ownerId: "rev", sharedWithUser: false })).toBe("locked");
    expect(authz.canAttachAsReviewer(reviewer, { status: "draft" }, { ownerId: "rev", sharedWithUser: false })).toBe("not_found");
    expect(authz.canAttachAsReviewer(maya, open, { ownerId: "maya", sharedWithUser: false })).toBe("forbidden");
  });
});

describe("enforce", () => {
  it("maps decisions to HTTP errors", () => {
    expect(() => authz.enforce("ok")).not.toThrow();
    expect(() => authz.enforce("not_found")).toThrow(expect.objectContaining({ status: 404 }));
    expect(() => authz.enforce("forbidden")).toThrow(expect.objectContaining({ status: 403 }));
    expect(() => authz.enforce("locked")).toThrow(expect.objectContaining({ status: 409 }));
  });
});
