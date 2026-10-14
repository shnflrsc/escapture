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
  attachedToOpenCase: false,
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

  it("staff see evidence only while it is attached to a case that is escalated or under review", () => {
    for (const staff of [reviewer, admin]) {
      expect(authz.canViewEvidence(staff, facts())).toBe("not_found");
      expect(authz.canViewEvidence(staff, facts({ inOwnCaseReporterSide: true }))).toBe("not_found");
      expect(authz.canViewEvidence(staff, facts({ attachedToOpenCase: true }))).toBe("ok");
      // Seeing is not owning: staff can't rename, share or delete it.
      expect(authz.canManageEvidence(staff, facts({ attachedToOpenCase: true }))).toBe("forbidden");
    }
  });

  it("case participants see reporter-side evidence of their cases", () => {
    expect(authz.canViewEvidence(jules, facts({ inOwnCaseReporterSide: true }))).toBe("ok");
  });

  it("reviewers see evidence only once it is on a non-draft case (I1, I2)", () => {
    expect(authz.canViewEvidence(reviewer, facts())).toBe("not_found");
    expect(authz.canViewEvidence(reviewer, facts({ attachedToOpenCase: true }))).toBe("ok");
  });

  it("once every case it is in has closed, staff lose it unless it was shared with them directly", () => {
    // attachedToOpenCase is false again when the only cases holding it are closed.
    const afterClosure = facts({ inOwnCaseReporterSide: true });
    for (const staff of [reviewer, admin]) {
      expect(authz.canViewEvidence(staff, afterClosure)).toBe("not_found");
      expect(authz.canViewEvidence(staff, facts({ sharedWithUser: true }))).toBe("ok");
    }
    // The student and their collaborators keep it.
    expect(authz.canViewEvidence(maya, afterClosure)).toBe("ok");
    expect(authz.canViewEvidence(jules, afterClosure)).toBe("ok");
  });

  it("students never see evidence just because a reviewer attached it (I5)", () => {
    const alexEvidence = facts({ ownerId: "alex", attachedToOpenCase: true });
    expect(authz.canViewEvidence(maya, alexEvidence)).toBe("not_found");
    expect(authz.canViewEvidence(jules, alexEvidence)).toBe("not_found");
  });

  it("only the owner manages; recipients cannot re-share", () => {
    expect(authz.canManageEvidence(maya, facts())).toBe("ok");
    expect(authz.canManageEvidence(jules, facts({ sharedWithUser: true }))).toBe("forbidden");
    expect(authz.canManageEvidence(alex, facts())).toBe("not_found");
  });

  it("evidence on a case under review cannot be deleted or renamed; after closure it can again (I3)", () => {
    expect(authz.canDeleteEvidence(maya, facts())).toBe("ok");
    expect(authz.canDeleteEvidence(maya, facts({ attachedToOpenCase: true }))).toBe("locked");
    expect(authz.canRenameEvidence(maya, facts({ attachedToOpenCase: true }))).toBe("locked");
    expect(authz.canDeleteEvidence(jules, facts({ sharedWithUser: true }))).toBe("forbidden");
    // Closed: the lock is gone for its owner, and only for its owner.
    const afterClosure = facts({ inOwnCaseReporterSide: true });
    expect(authz.canDeleteEvidence(maya, afterClosure)).toBe("ok");
    expect(authz.canRenameEvidence(maya, afterClosure)).toBe("ok");
    expect(authz.canDeleteEvidence(jules, afterClosure)).toBe("forbidden");
    expect(authz.canRenameEvidence(reviewer, afterClosure)).toBe("not_found");
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

  it("the owner removes any collaborator, a collaborator only leaves, only while draft", () => {
    const two = { ...draft, collaboratorIds: ["jules", "alex"] };
    expect(authz.canRemoveCollaborator(maya, two, "jules")).toBe("ok");
    expect(authz.canRemoveCollaborator(jules, two, "jules")).toBe("ok");
    expect(authz.canRemoveCollaborator(jules, two, "alex")).toBe("forbidden");
    expect(authz.canRemoveCollaborator(maya, two, "maya")).toBe("forbidden");
    expect(authz.canRemoveCollaborator(jules, two, "maya")).toBe("forbidden");
    expect(authz.canRemoveCollaborator(maya, draft, "alex")).toBe("not_found");
    expect(authz.canRemoveCollaborator(alex, draft, "jules")).toBe("not_found");
    expect(authz.canRemoveCollaborator(reviewer, escalated, "jules")).toBe("not_found");
    expect(authz.canRemoveCollaborator(maya, escalated, "jules")).toBe("locked");
    expect(authz.canRemoveCollaborator(jules, closed, "jules")).toBe("locked");
  });

  it("only the owner adds collaborators, previews, escalates and deletes, only while draft", () => {
    for (const fn of [authz.canAddCollaborator, authz.canPreviewEscalation, authz.canEscalate, authz.canDeleteCase]) {
      expect(fn(maya, draft)).toBe("ok");
      expect(fn(jules, draft)).toBe("forbidden");
      expect(fn(alex, draft)).toBe("not_found");
      expect(fn(maya, escalated)).toBe("locked");
      expect(fn(maya, closed)).toBe("locked");
    }
  });
});

describe("review", () => {
  it("reviewers and administrators never see drafts (I1); students are forbidden", () => {
    expect(authz.canReviewCase(reviewer, { status: "draft" })).toBe("not_found");
    expect(authz.canReviewCase(reviewer, { status: "escalated" })).toBe("ok");
    expect(authz.canReviewCase(reviewer, { status: "closed" })).toBe("ok");
    expect(authz.canReviewCase(maya, { status: "escalated" })).toBe("forbidden");
    expect(authz.canReviewCase(admin, { status: "draft" })).toBe("not_found");
    expect(authz.canReviewCase(admin, { status: "escalated" })).toBe("ok");
    expect(authz.canReviewCase(admin, { status: "closed" })).toBe("ok");
  });

  it("an administrator can do what a reviewer can on a case", () => {
    expect(authz.canChangeStatus(admin, "escalated", "under_review")).toBe("ok");
    expect(authz.canChangeStatus(admin, "under_review", "closed")).toBe("ok");
    expect(authz.canChangeStatus(admin, "closed", "under_review")).toBe("locked");
    expect(authz.canChangeStatus(admin, "draft", "under_review")).toBe("not_found");
    const open = { status: "under_review" as const };
    expect(authz.canAttachAsReviewer(admin, open, { ownerId: "alex", sharedWithUser: true })).toBe("ok");
    expect(authz.canAttachAsReviewer(admin, open, { ownerId: "alex", sharedWithUser: false })).toBe("not_found");
    // Still nothing a student owns: no editing, escalating or deleting someone's case.
    const c = { ownerId: "maya", status: "draft" as const, collaboratorIds: [] };
    expect(authz.canViewCase(admin, c)).toBe("not_found");
    expect(authz.canEditCase(admin, c)).toBe("not_found");
    expect(authz.canEscalate(admin, c)).toBe("not_found");
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

describe("assigning reviewers", () => {
  it("only an administrator assigns, and only while the case is open", () => {
    expect(authz.canAssignReviewer(admin, { status: "escalated" })).toBe("ok");
    expect(authz.canAssignReviewer(admin, { status: "under_review" })).toBe("ok");
    expect(authz.canAssignReviewer(admin, { status: "closed" })).toBe("locked");
    expect(authz.canAssignReviewer(admin, { status: "draft" })).toBe("not_found");
    expect(authz.canAssignReviewer(reviewer, { status: "escalated" })).toBe("forbidden");
    expect(authz.canAssignReviewer(maya, { status: "escalated" })).toBe("forbidden");
  });
});

describe("administration", () => {
  it("only an administrator provisions reviewer accounts", () => {
    expect(authz.canProvisionReviewer(admin)).toBe("ok");
    expect(authz.canProvisionReviewer(reviewer)).toBe("forbidden");
    expect(authz.canProvisionReviewer(maya)).toBe("forbidden");
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
