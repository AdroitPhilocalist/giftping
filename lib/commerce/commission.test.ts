import { describe, expect, it } from "vitest";
import { computeCommission, resolveCommissionRate } from "./commission";

describe("resolveCommissionRate", () => {
  it("uses the vendor override when present", () => {
    expect(resolveCommissionRate({ vendorRate: 7, categoryRate: 12, platformRate: 10 })).toBe(7);
  });

  it("falls back to the category default when the vendor has no override", () => {
    expect(resolveCommissionRate({ vendorRate: null, categoryRate: 12, platformRate: 10 })).toBe(12);
  });

  it("falls back to the platform default when neither vendor nor category override", () => {
    expect(resolveCommissionRate({ vendorRate: null, categoryRate: null, platformRate: 9 })).toBe(9);
  });

  it("falls back to the hard-coded default if even the platform setting is missing", () => {
    expect(resolveCommissionRate({})).toBe(10);
  });

  it("treats a vendor override of 0 as a real value, not as unset", () => {
    expect(resolveCommissionRate({ vendorRate: 0, categoryRate: 12, platformRate: 10 })).toBe(0);
  });

  it("treats a category rate of 0 as a real value too", () => {
    expect(resolveCommissionRate({ vendorRate: null, categoryRate: 0, platformRate: 10 })).toBe(0);
  });
});

describe("computeCommission", () => {
  it("splits a line total into commission and vendor payout", () => {
    expect(computeCommission(1000, 10)).toEqual({ commission: 100, vendorPayout: 900 });
  });

  it("rounds to paise and always sums back to the line total", () => {
    const { commission, vendorPayout } = computeCommission(333.33, 12.5);
    expect(Math.round((commission + vendorPayout) * 100) / 100).toBe(333.33);
  });

  it("charges nothing at 0%", () => {
    expect(computeCommission(2499, 0)).toEqual({ commission: 0, vendorPayout: 2499 });
  });
});
