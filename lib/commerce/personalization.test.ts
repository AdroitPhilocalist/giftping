import { describe, expect, it } from "vitest";
import { personalizationLines, personalizationSummary } from "./personalization";

describe("personalizationLines / personalizationSummary", () => {
  const full = { recipientName: "Ishita", occasion: "Birthday", giftMessage: "Many happy returns", engraving: "Meera & Rohan" };
  it("lists engraving FIRST (the boutique has to carry it out exactly), then the rest in a fixed order", () => {
    expect(personalizationLines(full).map((l) => l.key)).toEqual(["engraving", "recipientName", "occasion", "giftMessage"]);
  });
  it("summarises in one line with the engraving leading", () => {
    expect(personalizationSummary(full)).toBe("Engraving “Meera & Rohan” · For Ishita · Birthday · “Many happy returns”");
  });
  it("is empty for no personalisation, junk or blank values", () => {
    for (const v of [null, undefined, {}, "x", [], { engraving: "   " }, { recipientName: 5 }]) {
      expect(personalizationLines(v as never)).toEqual([]);
      expect(personalizationSummary(v as never)).toBe("");
    }
  });
  it("ignores keys it doesn't know (nothing unexpected is ever displayed)", () => {
    expect(personalizationSummary({ engraving: "Aarav", secret: "x", __proto__: { evil: 1 } } as never)).toBe("Engraving “Aarav”");
  });
});
