import { describe, expect, it } from "vitest";
import { computeGiftingScore, type GiftingScoreInput } from "./gifting-score";

const empty: GiftingScoreInput = { contactCount: 0, contactsWithInterests: 0, contactsWithEvents: 0, eventCount: 0, upcoming30d: { total: 0, handled: 0 }, giftsLast12Months: 0 };

describe("computeGiftingScore", () => {
  it("an empty diary scores 0 and is never mistaken for 'perfectly prepared'", () => {
    const s = computeGiftingScore(empty);
    expect(s.score).toBe(0);
    expect(s.label).toBe("Just starting");
    expect(s.nextBestAction).toMatch(/first person/);
  });
  it("a perfect diary scores exactly 100", () => {
    const s = computeGiftingScore({ contactCount: 4, contactsWithInterests: 4, contactsWithEvents: 4, eventCount: 6, upcoming30d: { total: 2, handled: 2 }, giftsLast12Months: 4 });
    expect(s.score).toBe(100);
    expect(s.label).toBe("Gifting pro");
    expect(s.nextBestAction).toMatch(/all set/);
  });
  it("breakdown adds up to the score and respects each component's cap", () => {
    const s = computeGiftingScore({ contactCount: 3, contactsWithInterests: 2, contactsWithEvents: 3, eventCount: 3, upcoming30d: { total: 2, handled: 1 }, giftsLast12Months: 1 });
    expect(s.breakdown.reduce((a, b) => a + b.points, 0)).toBe(s.score);
    for (const b of s.breakdown) expect(b.points).toBeLessThanOrEqual(b.max);
    // 0.5*45 + (2/3)*25 + 1*15 + (1/3)*15 = 22.5→23 (round) + 16.67→17 + 15 + 5
    expect(s.breakdown.map((b) => b.points)).toEqual([23, 17, 15, 5]);
  });
  it("events exist but none are coming up: full preparedness points", () => {
    const s = computeGiftingScore({ ...empty, contactCount: 1, contactsWithEvents: 1, eventCount: 1 });
    expect(s.breakdown.find((b) => b.key === "preparedness")!.points).toBe(45);
  });
  it("never exceeds 100 even with more gifts than people", () => {
    const s = computeGiftingScore({ contactCount: 1, contactsWithInterests: 1, contactsWithEvents: 1, eventCount: 1, upcoming30d: { total: 0, handled: 0 }, giftsLast12Months: 50 });
    expect(s.score).toBe(100);
  });
  it("next best action follows the biggest gap, in priority order", () => {
    expect(computeGiftingScore({ ...empty, contactCount: 2, contactsWithEvents: 1, eventCount: 1 }).nextBestAction).toMatch(/birthday or anniversary/);
    expect(computeGiftingScore({ ...empty, contactCount: 1, contactsWithEvents: 1, eventCount: 1, upcoming30d: { total: 1, handled: 0 } }).nextBestAction).toMatch(/next upcoming moment/);
    expect(computeGiftingScore({ ...empty, contactCount: 1, contactsWithEvents: 1, eventCount: 1, upcoming30d: { total: 1, handled: 1 } }).nextBestAction).toMatch(/interests/);
  });
  it("bands", () => {
    const at = (contactsWithInterests: number) => computeGiftingScore({ ...empty, contactCount: 4, contactsWithInterests, contactsWithEvents: 4, eventCount: 4, upcoming30d: { total: 0, handled: 0 }, giftsLast12Months: 0 });
    expect(at(0).label).toBe("Thoughtful"); // 45 + 0 + 15 + 0 = 60
    expect(at(4).label).toBe("Gifting pro"); // 45 + 25 + 15 = 85
  });
});
