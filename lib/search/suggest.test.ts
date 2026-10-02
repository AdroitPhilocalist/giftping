import { describe, expect, it } from "vitest";
import { highlightParts, normaliseSuggestQuery } from "./suggest";

describe("normaliseSuggestQuery", () => {
  it("returns null for empty, whitespace-only and one-character input", () => {
    for (const v of [undefined, null, "", "   ", "a", " a ", "\n\t"]) expect(normaliseSuggestQuery(v)).toBeNull();
  });
  it("trims and collapses whitespace", () => {
    expect(normaliseSuggestQuery("  luxe    mem \n")).toBe("luxe mem");
  });
  it("turns control characters into spaces rather than gluing words together", () => {
    expect(normaliseSuggestQuery("gift\u0000box\u0007x")).toBe("gift box x");
  });
  it("caps the length", () => {
    const q = normaliseSuggestQuery("x".repeat(500));
    expect(q).toHaveLength(60);
  });
  it("keeps punctuation (the database tokenises it safely)", () => {
    expect(normaliseSuggestQuery("Mom's gift & more")).toBe("Mom's gift & more");
  });
});

describe("highlightParts", () => {
  const joined = (p: { text: string }[]) => p.map((x) => x.text).join("");
  it("highlights a prefix at the start of a word, case-insensitively", () => {
    const p = highlightParts("Luxe Memory Hamper", "mem");
    expect(p.filter((x) => x.match).map((x) => x.text)).toEqual(["Mem"]);
    expect(joined(p)).toBe("Luxe Memory Hamper");
  });
  it("does not highlight the middle of a word", () => {
    expect(highlightParts("Premium Hamper", "am").some((x) => x.match)).toBe(false);
  });
  it("highlights every typed word", () => {
    const p = highlightParts("Luxe Memory Hamper", "luxe ham");
    expect(p.filter((x) => x.match).map((x) => x.text)).toEqual(["Luxe", "Ham"]);
  });
  it("is safe with regex metacharacters and punctuation in the query", () => {
    expect(() => highlightParts("Tea (Assam) & Co.", "(a* [")).not.toThrow();
    expect(joined(highlightParts("Tea (Assam) & Co.", ".*+?"))).toBe("Tea (Assam) & Co.");
  });
  it("returns the text untouched for a query with no word characters or empty text", () => {
    expect(highlightParts("Hamper", "&&")).toEqual([{ text: "Hamper", match: false }]);
    expect(highlightParts("", "ham")).toEqual([{ text: "", match: false }]);
  });
  it("works with non-Latin letters", () => {
    const p = highlightParts("उपहार बॉक्स", "उपहा"); // contains a vowel sign (a combining mark) — must not split the word
    expect(p[0]).toEqual({ text: "उपहा", match: true });
    expect(joined(p)).toBe("उपहार बॉक्स");
  });
});
