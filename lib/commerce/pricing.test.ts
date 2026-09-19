import { describe, expect, it } from "vitest";
import { computeUnitPrice, effectiveStock, lineTotal, maxPurchasable, MAX_LINE_QUANTITY } from "./pricing";

describe("computeUnitPrice", () => {
  it("uses the base price when there is no sale", () => {
    expect(computeUnitPrice({ basePrice: 3499, salePrice: null, adjustments: [] })).toBe(3499);
  });
  it("prefers the sale price and adds variant adjustments on top", () => {
    expect(computeUnitPrice({ basePrice: 3499, salePrice: 2999, adjustments: [150] })).toBe(3149);
  });
  it("sums adjustments across several variant groups, including negative ones", () => {
    expect(computeUnitPrice({ basePrice: 1000, salePrice: null, adjustments: [200, -50] })).toBe(1150);
  });
  it("never goes below zero", () => {
    expect(computeUnitPrice({ basePrice: 100, salePrice: null, adjustments: [-500] })).toBe(0);
  });
  it("rounds to paise", () => {
    expect(computeUnitPrice({ basePrice: 10.1, salePrice: null, adjustments: [0.2] })).toBe(10.3);
  });
});

describe("stock", () => {
  it("is limited by the scarcest variant", () => {
    expect(effectiveStock(50, [20, 3])).toBe(3);
  });
  it("is the product stock when there are no variants", () => {
    expect(effectiveStock(7, [])).toBe(7);
  });
  it("is never negative", () => {
    expect(effectiveStock(-2, [])).toBe(0);
  });
  it("caps purchasable quantity at the per-line maximum", () => {
    expect(maxPurchasable(500)).toBe(MAX_LINE_QUANTITY);
    expect(maxPurchasable(4)).toBe(4);
    expect(maxPurchasable(0)).toBe(0);
  });
});

describe("lineTotal", () => {
  it("multiplies and rounds", () => {
    expect(lineTotal(33.33, 3)).toBe(99.99);
  });
});
