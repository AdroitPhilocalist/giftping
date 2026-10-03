import { describe, expect, it } from "vitest";
import { CLEAR_ALL, PRICE_PRESETS, activePricePreset, appliedFilters, priceLabel } from "./filters";

const vendors = [{ slug: "aurelia-gifts", business_name: "Aurelia Gifts" }];

describe("price presets", () => {
  it("finds the preset that exactly matches the URL's min/max", () => {
    expect(activePricePreset({ maxPrice: "500" })).toBe(0);
    expect(activePricePreset({ minPrice: "500", maxPrice: "1000" })).toBe(1);
    expect(activePricePreset({ minPrice: "2500" })).toBe(3);
  });
  it("matches nothing for a custom range, blanks or junk", () => {
    expect(activePricePreset({ minPrice: "500", maxPrice: "900" })).toBe(-1);
    expect(activePricePreset({})).toBe(-1);
    expect(activePricePreset({ minPrice: "abc", maxPrice: "" })).toBe(-1);
  });
  it("every preset is a valid, ascending, non-empty band", () => {
    for (const p of PRICE_PRESETS) {
      expect(p.min !== undefined || p.max !== undefined).toBe(true);
      if (p.min !== undefined && p.max !== undefined) expect(p.min).toBeLessThan(p.max);
    }
  });
});

describe("priceLabel", () => {
  it("words each shape of range", () => {
    expect(priceLabel({ maxPrice: "500" })).toBe("Under ₹500");
    expect(priceLabel({ minPrice: "2500" })).toBe("Over ₹2,500");
    expect(priceLabel({ minPrice: "500", maxPrice: "1000" })).toBe("₹500 – ₹1,000");
    expect(priceLabel({})).toBeNull();
    expect(priceLabel({ minPrice: "x", maxPrice: " " })).toBeNull();
  });
});

describe("appliedFilters", () => {
  it("lists only what narrows the results, never the sort", () => {
    expect(appliedFilters({ sort: "newest" }, vendors)).toEqual([]);
    const all = appliedFilters({ recipient: "for-him", occasion: "wedding", vendor: "aurelia-gifts", maxPrice: "500", inStock: "true", sort: "rating" }, vendors);
    expect(all.map((f) => f.label)).toEqual(["For him", "Wedding", "Aurelia Gifts", "Under ₹500", "In stock"]);
  });
  it("clearing the price chip clears both ends", () => {
    const [price] = appliedFilters({ minPrice: "500", maxPrice: "1000" }, vendors);
    expect(price.clear).toEqual({ minPrice: undefined, maxPrice: undefined });
  });
  it("tolerates a boutique that isn't in the list and an hostile tag", () => {
    expect(appliedFilters({ vendor: "gone" }, vendors)[0].label).toBe("Boutique");
    expect(appliedFilters({ occasion: "<script>" }, vendors)[0].label).toContain("script");
  });
  it("CLEAR_ALL leaves sort alone", () => {
    expect("sort" in CLEAR_ALL).toBe(false);
  });
});
