import { describe, expect, it } from "vitest";
import { parseSynonymWords, searchSynonymSchema } from "./search-synonym.schema";

describe("parseSynonymWords", () => {
  it("splits, trims, lowercases and dedupes a comma-separated list", () => {
    expect(parseSynonymWords("Mithai, candy,  Mithai , sweets")).toEqual(["mithai", "candy", "sweets"]);
  });
  it("drops empty entries from stray commas", () => {
    expect(parseSynonymWords("scent,, fragrance,")).toEqual(["scent", "fragrance"]);
  });
  it("caps at 10 words", () => {
    const raw = Array.from({ length: 15 }, (_, i) => `word${i}`).join(",");
    expect(parseSynonymWords(raw)).toHaveLength(10);
  });
  it("handles undefined input", () => {
    expect(parseSynonymWords(undefined)).toEqual([]);
  });
});

describe("searchSynonymSchema", () => {
  const valid = { term: "candle", synonyms: ["scent", "fragrance"] };

  it("accepts a valid group", () => {
    expect(searchSynonymSchema.safeParse(valid).success).toBe(true);
  });
  it("lowercases and trims the term", () => {
    const r = searchSynonymSchema.safeParse({ ...valid, term: "  Candle  " });
    expect(r.success && r.data.term).toBe("candle");
  });
  it("rejects a term or synonym containing a space (single words only — see the migration's comment on why)", () => {
    expect(searchSynonymSchema.safeParse({ ...valid, term: "gift box" }).success).toBe(false);
    expect(searchSynonymSchema.safeParse({ term: "candle", synonyms: ["home fragrance"] }).success).toBe(false);
  });
  it("rejects a term or synonym with tsquery-syntax characters", () => {
    expect(searchSynonymSchema.safeParse({ ...valid, term: "candle|or" }).success).toBe(false);
    expect(searchSynonymSchema.safeParse({ term: "candle", synonyms: ["a&b"] }).success).toBe(false);
  });
  it("requires at least one synonym", () => {
    expect(searchSynonymSchema.safeParse({ term: "candle", synonyms: [] }).success).toBe(false);
  });
  it("caps at 10 synonyms", () => {
    const r = searchSynonymSchema.safeParse({ term: "candle", synonyms: Array.from({ length: 11 }, (_, i) => `syn${i}`) });
    expect(r.success).toBe(false);
  });
  it("survives re-parsing its own output (parsed client-side, then again independently server-side)", () => {
    const first = searchSynonymSchema.parse(valid);
    expect(searchSynonymSchema.parse(first)).toEqual(first);
  });
});
