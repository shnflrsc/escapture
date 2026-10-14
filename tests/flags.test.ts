import { describe, expect, it } from "vitest";
import { findFlaggedWords, normalizeWord } from "@/lib/flags";

describe("findFlaggedWords", () => {
  it("finds whole words, ignoring case", () => {
    expect(findFlaggedWords("He talked about SUICIDE again.", ["suicide", "blackmail"])).toEqual(["suicide"]);
  });

  it("never matches inside another word", () => {
    expect(findFlaggedWords("A skill share and a killjoy", ["kill"])).toEqual([]);
  });

  it("accepts common English endings on a single word", () => {
    expect(findFlaggedWords("they kept threatening and stalking her", ["threaten", "stalk"])).toEqual(["threaten", "stalk"]);
    expect(findFlaggedWords("He was killed", ["kill"])).toEqual(["kill"]);
  });

  it("matches phrases across any spacing or punctuation, but not partly", () => {
    expect(findFlaggedWords("said he would kill\nmyself tonight", ["kill myself"])).toEqual(["kill myself"]);
    expect(findFlaggedWords("I want to kill time", ["kill myself"])).toEqual([]);
  });

  it("ignores accents, and works for Filipino entries", () => {
    expect(findFlaggedWords("Sabi niya, magpakamatáy ka na lang", ["magpakamatay"])).toEqual(["magpakamatay"]);
    expect(findFlaggedWords("papatayin kita bukas", ["papatayin kita"])).toEqual(["papatayin kita"]);
  });

  it("keeps the bank's order and lists each word once", () => {
    expect(findFlaggedWords("blackmail, then suicide, then blackmail", ["suicide", "blackmail"])).toEqual(["suicide", "blackmail"]);
  });

  it("treats special characters in a word literally", () => {
    expect(findFlaggedWords("self-harm", ["self-harm"])).toEqual(["self-harm"]);
    expect(findFlaggedWords("self harm", ["self.harm"])).toEqual([]);
  });

  it("normalizes words for storage", () => {
    expect(normalizeWord("  Self   Harm ")).toBe("self harm");
    expect(normalizeWord("Pinatáy")).toBe("pinatay");
  });
});
