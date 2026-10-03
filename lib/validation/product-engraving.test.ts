import { describe, expect, it } from "vitest";
import { productSchema } from "./product.schema";

const base = { name: "Engraved Keepsake Box", categoryId: "11111111-1111-4111-8111-111111111111", basePrice: 1499, stockQuantity: 5 };
const on = { enabled: true, label: "Name on the box", maxLength: 18, required: true, style: "gold", x: 20, y: 40, w: 60, h: 14, rotate: 0 };

describe("productSchema — engraving setup", () => {
  it("accepts a product with no engraving section at all", () => {
    expect(productSchema.safeParse(base).success).toBe(true);
  });
  it("accepts a complete setup and keeps its values", () => {
    const r = productSchema.parse({ ...base, engraving: on });
    expect(r.engraving).toMatchObject({ enabled: true, label: "Name on the box", maxLength: 18, style: "gold", x: 20, w: 60 });
  });
  it("ignores an incomplete setup while it is switched OFF (the form keeps the fields around)", () => {
    expect(productSchema.safeParse({ ...base, engraving: { ...on, enabled: false, label: "", x: 90, w: 40 } }).success).toBe(true);
  });
  it("requires a field name once it is switched on", () => {
    const r = productSchema.safeParse({ ...base, engraving: { ...on, label: "   " } });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["engraving", "label"]);
  });
  it("refuses a text box that runs off the photo", () => {
    expect(productSchema.safeParse({ ...base, engraving: { ...on, x: 70, w: 40 } }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, engraving: { ...on, y: 95, h: 12 } }).success).toBe(false);
  });
  it("accepts numbers that arrive as strings from the form, and rejects out-of-range ones", () => {
    expect(productSchema.parse({ ...base, engraving: { ...on, maxLength: "25", x: "10" } }).engraving?.maxLength).toBe(25);
    for (const bad of [{ maxLength: 2 }, { maxLength: 61 }, { rotate: 45 }, { w: 2 }, { style: "neon" }]) {
      expect(productSchema.safeParse({ ...base, engraving: { ...on, ...bad } }).success, JSON.stringify(bad)).toBe(false);
    }
  });
  it("its own output re-parses as input (the round-trip lesson)", () => {
    const once = productSchema.parse({ ...base, engraving: on });
    expect(productSchema.parse(once)).toEqual(once);
  });
});
