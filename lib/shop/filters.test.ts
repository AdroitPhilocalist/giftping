import { describe, expect, it } from "vitest";
import { CLEAR_ALL, MAX_PAGE, PRICE_PRESETS, activePricePreset, appliedFilters, normalizeSearchParams, pageNumber, priceLabel, priceRange, priceValue, sortValue } from "./filters";

const vendors = [{ slug: "aurelia-gifts", business_name: "Aurelia Gifts" }];

describe("URL parameter parsing", () => {
  it("keeps only the first value when a crawler repeats a query key", () => {
    expect(normalizeSearchParams({ minPrice: "500", maxPrice: ["1000", "2000"], sort: undefined })).toEqual({
      minPrice: "500",
      maxPrice: "1000",
      sort: undefined,
    });
  });

  it("clamps page numbers instead of passing them to PostgREST", () => {
    expect(pageNumber(undefined)).toBe(1);
    expect(pageNumber("2")).toBe(2);
    expect(pageNumber("1.9")).toBe(1);
    expect(pageNumber("0")).toBe(1);
    expect(pageNumber("-3")).toBe(1);
    expect(pageNumber("abc")).toBe(1);
    expect(pageNumber("Infinity")).toBe(1);
    expect(pageNumber("999999")).toBe(MAX_PAGE);
  });

  it("accepts only finite, non-negative prices", () => {
    expect(priceValue("500")).toBe(500);
    expect(priceValue("0")).toBe(0);
    expect(priceValue("")).toBeUndefined();
    expect(priceValue(" ")).toBeUndefined();
    expect(priceValue("abc")).toBeUndefined();
    expect(priceValue("-1")).toBeUndefined();
    expect(priceValue("Infinity")).toBeUndefined();
  });

  it("puts a reversed min/max range back in order", () => {
    expect(priceRange("500", "1000")).toEqual({ minPrice: 500, maxPrice: 1000 });
    expect(priceRange("1000", "500")).toEqual({ minPrice: 500, maxPrice: 1000 });
    expect(priceRange("500", undefined)).toEqual({ minPrice: 500, maxPrice: undefined });
    expect(priceRange("abc", "500")).toEqual({ minPrice: undefined, maxPrice: 500 });
  });

  it("only lets known sort values survive", () => {
    expect(sortValue("price_asc")).toBe("price_asc");
    expect(sortValue("popularity")).toBe("popularity");
    expect(sortValue("price_drop")).toBeUndefined();
    expect(sortValue("")).toBeUndefined();
    expect(sortValue(undefined)).toBeUndefined();
  });
});

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
