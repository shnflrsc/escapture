import { sha256Hex } from "./hash";

/** What reviewers will see when a case is escalated (I4). */
export type EscalationContent = {
  caseId: string;
  title: string;
  description: string;
  owner: { id: string; name: string; email: string };
  collaborators: { id: string; name: string; email: string }[];
  evidence: {
    id: string;
    label: string;
    kind: string;
    capturedAt: string;
    sha256: string;
    addedBy: string;
  }[];
};

/** JSON with object keys sorted, so the same content always serializes the same. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Collaborators and evidence are ordered by id so listing order never matters. */
export function escalationDigest(content: EscalationContent): string {
  const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return sha256Hex(
    canonicalJson({
      ...content,
      collaborators: [...content.collaborators].sort(byId),
      evidence: [...content.evidence].sort(byId),
    }),
  );
}
