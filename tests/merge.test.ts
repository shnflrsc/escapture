import { describe, expect, it } from "vitest";
import { mapIndex, mergeText } from "@/lib/merge";

describe("mergeText: everyone's changes are kept, the newest wins where they collide", () => {
  it("returns the other side when only one person changed anything", () => {
    expect(mergeText("abc", "abc", "abXc")).toBe("abXc");
    expect(mergeText("abc", "aYbc", "abc")).toBe("aYbc");
  });

  it("keeps both people's edits when they touch different parts", () => {
    const base = "Maya saw the post on Monday.";
    const theirs = "Maya saw the first post on Monday.";
    const mine = "Maya saw the post on Monday night.";
    expect(mergeText(base, theirs, mine)).toBe("Maya saw the first post on Monday night.");
  });

  it("keeps both deletions in different places", () => {
    expect(mergeText("one two three four", "two three four", "one two three")).toBe("two three");
  });

  it("lets the newer edit win where both changed the same words", () => {
    expect(mergeText("It was Monday.", "It was Tuesday.", "It was Friday.")).toBe("It was Friday.");
  });

  it("keeps both insertions at the same spot, the older one first", () => {
    expect(mergeText("ab", "aXb", "aYb")).toBe("aXYb");
  });

  it("drops an older insertion inside text the newer edit removed", () => {
    expect(mergeText("abcdef", "abcXdef", "af")).toBe("af");
  });

  it("drops an older removal the newer edit typed into", () => {
    expect(mergeText("abcdef", "af", "abcZdef")).toBe("abcZdef");
  });

  it("handles an empty base and an emptied text", () => {
    expect(mergeText("", "hello", "")).toBe("hello");
    expect(mergeText("", "a", "b")).toBe("ab");
    expect(mergeText("abc", "abc!", "")).toBe("!");
  });
});

describe("mapIndex: a caret stays on the same character", () => {
  it("moves right past text inserted before it, and stays put for text after it", () => {
    expect(mapIndex("hello world", "dear hello world", 6)).toBe(11);
    expect(mapIndex("hello world", "hello world!!", 6)).toBe(6);
  });

  it("moves left when text before it is removed, and to the edge of a removal it was inside", () => {
    expect(mapIndex("hello big world", "hello world", 13)).toBe(9);
    expect(mapIndex("hello big world", "hello world", 8)).toBe(6);
  });

  it("never goes past the end", () => {
    expect(mapIndex("abc", "a", 3)).toBe(1);
    expect(mapIndex("abc", "", 2)).toBe(0);
  });
});
