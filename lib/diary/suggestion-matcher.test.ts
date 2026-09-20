import { describe, expect, it } from "vitest";
import { occasionTagFor, recipientTagsFor, suggestGifts, type SuggestionCandidate } from "./suggestion-matcher";

const p = (over: Partial<SuggestionCandidate> & { id: string }): SuggestionCandidate => ({
  name: "Gift", tags: [], occasionTags: [], recipientTags: [], categoryName: null, price: 1000, averageRating: 0, reviewCount: 0, ...over,
});

describe("relationship / occasion mapping", () => {
  it("maps relationships to recipient tags", () => {
    expect(recipientTagsFor("Mother")).toEqual(["for-parents", "for-her"]);
    expect(recipientTagsFor("Dad")).toEqual(["for-parents", "for-him"]);
    expect(recipientTagsFor("wife")).toEqual(["for-her"]);
    expect(recipientTagsFor("Boss")).toEqual(["for-colleagues"]);
    expect(recipientTagsFor("best friend")).toEqual([]);
    expect(recipientTagsFor(null)).toEqual([]);
  });
  it("maps event types to the storefront's occasions", () => {
    expect(occasionTagFor("Birthday")).toBe("birthday");
    expect(occasionTagFor("Wedding anniversary")).toBe("anniversary");
    expect(occasionTagFor("Housewarming")).toBe("housewarming");
    expect(occasionTagFor("Graduation")).toBeNull();
    expect(occasionTagFor(null)).toBeNull();
  });
});

describe("suggestGifts", () => {
  const person = { relationship: "Mother", interests: ["coffee", "gardening"], giftPreferences: "loves handmade things" };
  const candidates = [
    p({ id: "hamper", name: "Premium Gift Hamper", tags: ["hamper"], occasionTags: ["birthday", "anniversary"], recipientTags: ["for-her", "for-parents"] }),
    p({ id: "coffee", name: "Artisan Coffee Box", tags: ["coffee", "handmade"], occasionTags: ["birthday"], recipientTags: ["for-him"] }),
    p({ id: "wallet", name: "Leather Wallet", tags: ["leather"], occasionTags: ["birthday"], recipientTags: ["for-him"] }),
    p({ id: "irrelevant", name: "Desk Lamp", tags: ["office"], occasionTags: [], recipientTags: [] }),
  ];
  it("ranks by occasion + recipient + interest signals and explains each pick", () => {
    const out = suggestGifts({ person, context: { eventType: "Birthday" }, candidates });
    expect(out.map((s) => s.productId)).toEqual(["hamper", "coffee"]); // the "for him" wallet is left out; the "for him" coffee box stays because it matches an interest
    expect(out[0].reasons).toEqual(expect.arrayContaining(["Great for a birthday", "Suits your mother"]));
    expect(out[1].reasons.join(" ")).toMatch(/love of coffee/);
    expect(out[1].reasons.join(" ")).toMatch(/preferences \(handmade\)/);
  });
  it("never suggests a product meant for a different recipient unless it matches an interest", () => {
    const out = suggestGifts({ person: { relationship: "Sister", interests: [], giftPreferences: null }, context: { eventType: "Birthday" }, candidates: [p({ id: "wallet", occasionTags: ["birthday"], recipientTags: ["for-him"] }), p({ id: "bag", occasionTags: ["birthday"], recipientTags: ["for-her"] }), p({ id: "generic", occasionTags: ["birthday"] })] });
    expect(out.map((s) => s.productId)).toEqual(["bag", "generic"]);
  });
  it("never suggests a product with no real signal, however well rated", () => {
    const out = suggestGifts({ person, context: { eventType: "Birthday" }, candidates: [p({ id: "x", averageRating: 5, reviewCount: 500 })] });
    expect(out).toEqual([]);
  });
  it("excludes anything this person has already been gifted", () => {
    const out = suggestGifts({ person, context: { eventType: "Birthday" }, candidates, alreadyGiftedProductIds: new Set(["hamper"]) });
    expect(out.map((s) => s.productId)).not.toContain("hamper");
  });
  it("budget: rewards affordable picks, penalises ones over budget, and a budget alone never qualifies", () => {
    const cands = [p({ id: "cheap", price: 500, occasionTags: ["birthday"] }), p({ id: "pricey", price: 5000, occasionTags: ["birthday"] }), p({ id: "onlybudget", price: 100 })];
    const out = suggestGifts({ person: { relationship: null, interests: [], giftPreferences: null }, context: { eventType: "Birthday", budgetMax: 1000 }, candidates: cands });
    expect(out.map((s) => s.productId)).toEqual(["cheap", "pricey"]);
    expect(out[0].score).toBeGreaterThan(out[1].score);
  });
  it("interest matching is whole-word, so 'art' doesn't match 'party'", () => {
    const out = suggestGifts({ person: { relationship: null, interests: ["art"], giftPreferences: null }, context: { eventType: null }, candidates: [p({ id: "party", name: "Party Popper", tags: ["party"] })] });
    expect(out).toEqual([]);
  });
  it("honours the limit and is deterministic on ties", () => {
    const cands = ["b", "a", "c"].map((id) => p({ id, occasionTags: ["birthday"] }));
    const out = suggestGifts({ person: { relationship: null, interests: [], giftPreferences: null }, context: { eventType: "Birthday" }, candidates: cands, limit: 2 });
    expect(out.map((s) => s.productId)).toEqual(["a", "b"]);
  });
});
