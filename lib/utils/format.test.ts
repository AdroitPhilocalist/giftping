import { describe, expect, it } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("keeps whole rupees clean", () => {
    expect(formatCurrency(1499)).toBe("₹1,499");
  });
  it("shows paise when present so totals never silently round", () => {
    expect(formatCurrency(949.05)).toBe("₹949.05");
    expect(formatCurrency(679.8)).toBe("₹679.80");
  });
});
