import { describe, expect, it } from "vitest";
import { canonicalJson, escalationDigest, type EscalationContent } from "@/lib/digest";
import { isAllowedSignupEmail } from "@/lib/email-gate";
import { randomToken, safeEqual, scryptHash, scryptVerify, sha256Hex } from "@/lib/hash";
import { createLink, escalate, evidenceUpload, shareByEmail } from "@/lib/validators";

describe("hash helpers", () => {
  it("sha256Hex matches a known vector", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex(new TextEncoder().encode("abc"))).toBe(sha256Hex("abc"));
  });

  it("any change to the bytes changes the hash (I7)", () => {
    expect(sha256Hex("<p>hello</p>")).not.toBe(sha256Hex("<p>hello</p> "));
  });

  it("random tokens are long and unique", () => {
    const a = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(a);
  });

  it("scrypt verifies the right password only, with a salt per hash", async () => {
    const stored = await scryptHash("correct horse");
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(await scryptVerify("correct horse", stored)).toBe(true);
    expect(await scryptVerify("wrong horse", stored)).toBe(false);
    expect(await scryptVerify("correct horse", "garbage")).toBe(false);
    expect(await scryptHash("correct horse")).not.toBe(stored);
  });

  it("safeEqual compares strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("email-domain gate (I9)", () => {
  const domain = "bulsu.edu.ph";
  it("accepts BulSU addresses, case-insensitively", () => {
    expect(isAllowedSignupEmail("maya@bulsu.edu.ph", domain)).toBe(true);
    expect(isAllowedSignupEmail("  Maya@BulSU.edu.ph ", domain)).toBe(true);
  });
  it("rejects other domains and look-alikes", () => {
    expect(isAllowedSignupEmail("maya@gmail.com", domain)).toBe(false);
    expect(isAllowedSignupEmail("maya@evil-bulsu.edu.ph", domain)).toBe(false);
    expect(isAllowedSignupEmail("maya@bulsu.edu.ph.evil.com", domain)).toBe(false);
    expect(isAllowedSignupEmail("maya@sub.bulsu.edu.ph", domain)).toBe(false);
    expect(isAllowedSignupEmail("bulsu.edu.ph", domain)).toBe(false);
    expect(isAllowedSignupEmail("@bulsu.edu.ph", domain)).toBe(false);
  });
  it("honours the explicit demo allow-list only for exact addresses", () => {
    const allow = "demo@example.com, Other@Example.com";
    expect(isAllowedSignupEmail("demo@example.com", domain, allow)).toBe(true);
    expect(isAllowedSignupEmail("other@example.com", domain, allow)).toBe(true);
    expect(isAllowedSignupEmail("someone@example.com", domain, allow)).toBe(false);
  });
});

describe("escalation digest (I4)", () => {
  const base: EscalationContent = {
    caseId: "c1",
    title: "Group chat messages",
    description: "What happened",
    owner: { id: "u1", name: "Maya", email: "maya@bulsu.edu.ph" },
    collaborators: [
      { id: "u2", name: "Jules", email: "jules@bulsu.edu.ph" },
      { id: "u3", name: "Sam", email: "sam@bulsu.edu.ph" },
    ],
    evidence: [
      { id: "e1", label: "Post", kind: "facebook_post", capturedAt: "2026-10-12T06:03:00.000Z", sha256: "a".repeat(64), addedBy: "Maya" },
      { id: "e2", label: "Chat", kind: "facebook_message", capturedAt: "2026-10-12T06:10:00.000Z", sha256: "b".repeat(64), addedBy: "Jules" },
    ],
  };

  it("is stable regardless of key or list order", () => {
    const shuffled: EscalationContent = {
      evidence: [...base.evidence].reverse(),
      collaborators: [...base.collaborators].reverse(),
      owner: { email: base.owner.email, name: base.owner.name, id: base.owner.id },
      description: base.description,
      title: base.title,
      caseId: base.caseId,
    };
    expect(escalationDigest(shuffled)).toBe(escalationDigest(base));
    expect(escalationDigest(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when anything reviewers would see changes", () => {
    const d = escalationDigest(base);
    expect(escalationDigest({ ...base, title: "Other" })).not.toBe(d);
    expect(escalationDigest({ ...base, description: "Edited" })).not.toBe(d);
    expect(escalationDigest({ ...base, collaborators: base.collaborators.slice(0, 1) })).not.toBe(d);
    expect(escalationDigest({ ...base, evidence: base.evidence.slice(0, 1) })).not.toBe(d);
    expect(
      escalationDigest({ ...base, evidence: [{ ...base.evidence[0], label: "Renamed" }, base.evidence[1]] }),
    ).not.toBe(d);
    expect(
      escalationDigest({ ...base, evidence: [{ ...base.evidence[0], sha256: "c".repeat(64) }, base.evidence[1]] }),
    ).not.toBe(d);
  });

  it("canonicalJson sorts keys and keeps array order", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
  });
});

describe("request validation", () => {
  it("sharing requires an explicit acknowledgment (I10)", () => {
    expect(shareByEmail.safeParse({ email: "a@bulsu.edu.ph" }).success).toBe(false);
    expect(shareByEmail.safeParse({ email: "a@bulsu.edu.ph", acknowledge: false }).success).toBe(false);
    expect(shareByEmail.parse({ email: " A@BulSU.edu.ph", acknowledge: true }).email).toBe("a@bulsu.edu.ph");
    expect(createLink.safeParse({ password: "long enough", acknowledge: false }).success).toBe(false);
    expect(createLink.safeParse({ password: "short", acknowledge: true }).success).toBe(false);
  });

  it("escalation requires a digest and an explicit confirm", () => {
    expect(escalate.safeParse({ digest: "a".repeat(64) }).success).toBe(false);
    expect(escalate.safeParse({ digest: "nope", confirm: true }).success).toBe(false);
    expect(escalate.safeParse({ digest: "a".repeat(64), confirm: true }).success).toBe(true);
  });

  it("evidence uploads need a well-formed hash, kind and tamper report", () => {
    const ok = {
      sha256: "A".repeat(64),
      kind: "facebook_post",
      sourceUrl: "https://www.facebook.com/x/posts/1",
      tamperReport: { checks: [{ id: "design-mode", passed: true }], allPassed: true },
    };
    expect(evidenceUpload.parse(ok).sha256).toBe("a".repeat(64));
    expect(evidenceUpload.safeParse({ ...ok, sha256: "abc" }).success).toBe(false);
    expect(evidenceUpload.safeParse({ ...ok, kind: "tweet" }).success).toBe(false);
    expect(evidenceUpload.safeParse({ ...ok, tamperReport: { checks: [], allPassed: true } }).success).toBe(false);
  });
});
