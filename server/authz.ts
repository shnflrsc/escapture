// ALL permission checks live here. Functions are pure: services load the
// facts, these decide. "not_found" is returned instead of "forbidden" for
// resources the user shouldn't know exist.
import { AppError, conflict, forbidden, notFound } from "./errors";

export type Role = "student" | "reviewer" | "admin";
export type CaseStatus = "draft" | "escalated" | "under_review" | "closed";
export type Decision = "ok" | "not_found" | "forbidden" | "locked";

type U = { id: string; role: Role };

/** The roles that handle escalated cases. An administrator can do everything a reviewer can. */
export const STAFF: Role[] = ["reviewer", "admin"];
export const isStaff = (u: { role: Role }) => u.role === "reviewer" || u.role === "admin";
type CaseFacts = { ownerId: string; status: CaseStatus; collaboratorIds: string[] };

export type EvidenceFacts = {
  ownerId: string;
  /** Directly shared with the user (email or redeemed link). */
  sharedWithUser: boolean;
  /** On the reporter side of a case the user owns or collaborates on. */
  inOwnCaseReporterSide: boolean;
  /** Attached (either side) to a case that is no longer a draft. */
  attachedToNonDraftCase: boolean;
};

export function enforce(decision: Decision, lockedMessage = "This case is locked and can't be changed.") {
  if (decision === "ok") return;
  if (decision === "not_found") throw notFound();
  if (decision === "locked") throw conflict(lockedMessage, "locked");
  throw forbidden();
}

export function assertRole(user: U, ...roles: Role[]) {
  if (!roles.includes(user.role)) throw new AppError("forbidden", 403, "You don't have access to this.");
}

// ---- Evidence ----

export const canCaptureEvidence = (u: U): Decision => (u.role === "student" ? "ok" : "forbidden");

export function canViewEvidence(u: U, e: EvidenceFacts): Decision {
  if (e.ownerId === u.id) return "ok";
  if (e.sharedWithUser) return "ok";
  if (u.role === "student" && e.inOwnCaseReporterSide) return "ok";
  if (isStaff(u) && e.attachedToNonDraftCase) return "ok";
  return "not_found";
}

/** Owner-only actions (rename, share, link). Recipients cannot re-share. */
export function canManageEvidence(u: U, e: EvidenceFacts): Decision {
  if (e.ownerId === u.id) return "ok";
  return canViewEvidence(u, e) === "ok" ? "forbidden" : "not_found";
}

export function canDeleteEvidence(u: U, e: EvidenceFacts): Decision {
  const manage = canManageEvidence(u, e);
  if (manage !== "ok") return manage;
  return e.attachedToNonDraftCase ? "locked" : "ok";
}

/** A label is part of what reviewers were shown at escalation (I3, I4). */
export const canRenameEvidence = canDeleteEvidence;

// ---- Cases (student side) ----

export const canCreateCase = (u: U): Decision => (u.role === "student" ? "ok" : "forbidden");

export function caseRole(u: U, c: CaseFacts): "owner" | "collaborator" | null {
  if (u.role !== "student") return null;
  if (c.ownerId === u.id) return "owner";
  return c.collaboratorIds.includes(u.id) ? "collaborator" : null;
}

export const canViewCase = (u: U, c: CaseFacts): Decision => (caseRole(u, c) ? "ok" : "not_found");

export function canEditCase(u: U, c: CaseFacts): Decision {
  if (!caseRole(u, c)) return "not_found";
  return c.status === "draft" ? "ok" : "locked";
}

/** Reporter-side attach: participant, draft, and the actor's OWN evidence. */
export function canAttachEvidence(u: U, c: CaseFacts, e: { ownerId: string } | null): Decision {
  const edit = canEditCase(u, c);
  if (edit !== "ok") return edit;
  if (!e) return "not_found";
  return e.ownerId === u.id ? "ok" : "forbidden";
}

export function canDetachEvidence(u: U, c: CaseFacts, a: { attachedBy: string }): Decision {
  const role = caseRole(u, c);
  if (!role) return "not_found";
  if (c.status !== "draft") return "locked";
  return role === "owner" || a.attachedBy === u.id ? "ok" : "forbidden";
}

function ownerOnlyWhileDraft(u: U, c: CaseFacts): Decision {
  const role = caseRole(u, c);
  if (!role) return "not_found";
  if (role !== "owner") return "forbidden";
  return c.status === "draft" ? "ok" : "locked";
}

export const canAddCollaborator = ownerOnlyWhileDraft;
/** A draft can be deleted by the person who started it. After escalation it is a record (I3). */
export const canDeleteCase = ownerOnlyWhileDraft;

/** The owner may take any collaborator off a draft; a collaborator may only leave. */
export function canRemoveCollaborator(u: U, c: CaseFacts, targetId: string): Decision {
  const role = caseRole(u, c);
  if (!role) return "not_found";
  if (c.status !== "draft") return "locked";
  if (targetId === c.ownerId) return "forbidden";
  if (role !== "owner" && targetId !== u.id) return "forbidden";
  return c.collaboratorIds.includes(targetId) ? "ok" : "not_found";
}
export const canPreviewEscalation = ownerOnlyWhileDraft;

export function canEscalate(u: U, c: CaseFacts): Decision {
  return ownerOnlyWhileDraft(u, c);
}

// ---- Administration ----

/** Only an administrator creates reviewer accounts. */
export function canProvisionReviewer(u: U): Decision {
  return u.role === "admin" ? "ok" : "forbidden";
}

/**
 * Only an administrator assigns reviewers to a case, and only while it is open.
 * Assigning routes the work: it never limits which reviewers can see or act on a case.
 */
export function canAssignReviewer(u: U, c: { status: CaseStatus }): Decision {
  if (u.role !== "admin") return "forbidden";
  if (c.status === "draft") return "not_found";
  return c.status === "closed" ? "locked" : "ok";
}

// ---- Review (reviewers and administrators) ----

/** Staff never see drafts (I1). */
export function canReviewCase(u: U, c: { status: CaseStatus }): Decision {
  if (!isStaff(u)) return "forbidden";
  return c.status === "draft" ? "not_found" : "ok";
}

export function canChangeStatus(u: U, from: CaseStatus, to: CaseStatus): Decision {
  const review = canReviewCase(u, { status: from });
  if (review !== "ok") return review;
  if (to === "under_review") return from === "escalated" ? "ok" : "locked";
  if (to === "closed") return from === "escalated" || from === "under_review" ? "ok" : "locked";
  return "locked";
}

export function canAttachAsReviewer(
  u: U,
  c: { status: CaseStatus },
  e: { ownerId: string; sharedWithUser: boolean } | null,
): Decision {
  const review = canReviewCase(u, c);
  if (review !== "ok") return review;
  if (c.status === "closed") return "locked";
  if (!e) return "not_found";
  return e.ownerId === u.id || e.sharedWithUser ? "ok" : "not_found";
}
