import { describe, expect, it } from "vitest";
import { BUDGETS, INTERESTS, MAX_LIKES, MIN_RESULTS, OCCASIONS, WHO, parseQuiz, quizQuery, rankQuiz, type QuizAnswers } from "./quiz";
import type { SuggestionCandidate } from "../diary/suggestion-matcher";

const cand = (id: string, o: Partial<SuggestionCandidate> = {}): SuggestionCandidate => ({ id, name: `Product ${id}`, tags: [], occasionTags: [], recipientTags: [], categoryName: null, price: 1500, averageRating: 4, reviewCount: 10, ...o });
const base: QuizAnswers = { who: "mother", occasion: "birthday", budget: "any", likes: [] };

describe("parseQuiz", () => {
  it("accepts a complete, valid set of answers", () => {
    const { answers } = parseQuiz({ who: "mother", occasion: "birthday", budget: "2500", likes: "flowers,personalised" });
    expect(answers).toEqual({ who: "mother", occasion: "birthday", budget: "2500", likes: ["flowers", "personalised"] });
  });
  it("is incomplete until who, occasion and budget are all answered (interests are optional)", () => {
    expect(parseQuiz({ who: "mother" }).answers).toBeNull();
    expect(parseQuiz({ who: "mother", occasion: "birthday" }).answers).toBeNull();
    expect(parseQuiz({ who: "mother", occasion: "birthday", budget: "any" }).answers).not.toBeNull();
    expect(parseQuiz({}).answers).toBeNull();
  });
  it("keeps partial answers so the quiz can resume where the person left off", () => {
    expect(parseQuiz({ who: "friend", budget: "1000" }).partial).toEqual({ who: "friend", budget: "1000", likes: [] });
  });
  it("drops anything not in the lists — the URL is user-controlled", () => {
    const { answers, partial } = parseQuiz({ who: "<script>", occasion: "birthday", budget: "999999", likes: "flowers,__proto__,constructor,hampers" });
    expect(answers).toBeNull();
    expect(partial).toEqual({ occasion: "birthday", likes: ["flowers", "hampers"] });
  });
  it("accepts repeated and comma-separated interests, de-duplicates, and keeps at most three", () => {
    expect(parseQuiz({ likes: ["flowers", "flowers,sweets", "jewellery", "home"] }).partial.likes).toEqual(["flowers", "sweets", "jewellery"]);
    expect(parseQuiz({ likes: "flowers,flowers,flowers" }).partial.likes).toEqual(["flowers"]);
    expect(parseQuiz({ likes: INTERESTS.map((i) => i.id).join(",") }).partial.likes).toHaveLength(MAX_LIKES);
  });
  it("takes the first value when a single-choice param is repeated", () => {
    expect(parseQuiz({ who: ["father", "mother"], occasion: "wedding", budget: "5000" }).answers?.who).toBe("father");
  });
});

describe("quizQuery", () => {
  it("round-trips through parseQuiz", () => {
    const a: QuizAnswers = { who: "colleague", occasion: "thank-you", budget: "1000", likes: ["craft", "luxury"] };
    expect(parseQuiz(Object.fromEntries(new URLSearchParams(quizQuery(a)))).answers).toEqual(a);
  });
  it("leaves out an empty interests list", () => {
    expect(quizQuery(base)).toBe("who=mother&occasion=birthday&budget=any");
  });
});

describe("option lists", () => {
  it("have unique ids, and every interest names at least one keyword", () => {
    for (const list of [WHO, OCCASIONS, BUDGETS, INTERESTS]) expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    for (const i of INTERESTS) expect(i.keywords.length).toBeGreaterThan(0);
  });
});

describe("rankQuiz", () => {
  it("ranks an occasion + recipient match above an unrelated product, with reasons", () => {
    const r = rankQuiz({ answers: base, candidates: [cand("a", { occasionTags: ["birthday"], recipientTags: ["for-parents", "for-her"] }), cand("b")] });
    expect(r[0].productId).toBe("a");
    expect(r[0].reasons).toEqual(expect.arrayContaining(["Great for a birthday", "Suits your mother"]));
  });
  it("treats the budget as a HARD limit — nothing over it ever appears", () => {
    const candidates = [cand("cheap", { price: 800, occasionTags: ["birthday"] }), cand("pricey", { price: 4000, occasionTags: ["birthday"] }), cand("edge", { price: 1000, occasionTags: ["birthday"] })];
    const r = rankQuiz({ answers: { ...base, budget: "1000" }, candidates });
    expect(r.map((x) => x.productId).sort()).toEqual(["cheap", "edge"]);
    expect(r.every((x) => x.reasons.includes("Within your budget"))).toBe(true);
  });
  it("with no limit it neither filters nor claims a budget", () => {
    const r = rankQuiz({ answers: base, candidates: [cand("a", { price: 99999, occasionTags: ["birthday"] })] });
    expect(r.map((x) => x.productId)).toEqual(["a"]);
    expect(r[0].reasons).not.toContain("Within your budget");
  });
  it("rewrites the interest reason into the shopper's own words", () => {
    const r = rankQuiz({ answers: { ...base, likes: ["sweets", "flowers"] }, candidates: [cand("a", { tags: ["chocolate", "sweet", "bouquet"], occasionTags: ["birthday"] })] });
    const love = r[0].reasons.find((x) => x.startsWith("Matches their love of "))!;
    expect(love).toBe("Matches their love of chocolates & sweets, flowers"); // the shopper's own order and words
    expect(love).not.toMatch(/chocolate, sweet/);
  });
  it("keeps the popular-picks fallback from re-adding products meant for someone else", () => {
    const r = rankQuiz({ answers: { ...base, who: "father" }, candidates: [cand("him", { occasionTags: ["birthday"], recipientTags: ["for-parents", "for-him"] }), cand("her", { recipientTags: ["for-her"], averageRating: 5, reviewCount: 99 }), cand("neutral", { averageRating: 4, reviewCount: 5 })] });
    expect(r.map((x) => x.productId)).toEqual(["him", "neutral"]);
  });
  it("drops products clearly meant for someone else", () => {
    const r = rankQuiz({ answers: { ...base, who: "father" }, candidates: [cand("him", { occasionTags: ["birthday"], recipientTags: ["for-parents", "for-him"] }), cand("her", { occasionTags: ["birthday"], recipientTags: ["for-her"] })] });
    expect(r.map((x) => x.productId)).toEqual(["him"]);
  });
  it("fills a thin result with honestly-labelled popular picks, best first, still within budget", () => {
    const candidates = [cand("star", { averageRating: 5, reviewCount: 40 }), cand("ok", { averageRating: 3.5, reviewCount: 2 }), cand("pricey", { averageRating: 5, reviewCount: 99, price: 9000 }), cand("fit", { occasionTags: ["birthday"] })];
    const r = rankQuiz({ answers: { ...base, budget: "2500" }, candidates });
    expect(r.length).toBeGreaterThanOrEqual(MIN_RESULTS);
    expect(r[0].productId).toBe("fit"); // a real match still leads
    expect(r.slice(1).every((x) => x.reasons[0] === "Popular with shoppers")).toBe(true);
    expect(r.map((x) => x.productId)).not.toContain("pricey");
    expect(r[1].productId).toBe("star");
  });
  it("returns an empty shelf (not an error) for an empty catalogue or when nothing fits the budget", () => {
    expect(rankQuiz({ answers: base, candidates: [] })).toEqual([]);
    expect(rankQuiz({ answers: { ...base, budget: "1000" }, candidates: [cand("a", { price: 5000 })] })).toEqual([]);
  });
  it("respects the limit and is deterministic for equal scores", () => {
    const candidates = Array.from({ length: 20 }, (_, i) => cand(`p${String(i).padStart(2, "0")}`, { occasionTags: ["birthday"] }));
    const a = rankQuiz({ answers: base, candidates, limit: 5 });
    const b = rankQuiz({ answers: base, candidates: [...candidates].reverse(), limit: 5 });
    expect(a).toHaveLength(5);
    expect(a.map((x) => x.productId)).toEqual(b.map((x) => x.productId));
  });
});
