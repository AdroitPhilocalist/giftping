import { describe, expect, it } from "vitest";
import { productSchema } from "./product.schema";

const base = { name: "Rose Perfume", categoryId: "2d96f2c3-566d-420a-8e20-4718a9aca565", basePrice: 999, stockQuantity: 5, productTypeId: null };
const ATTR = "4834ade7-6a8f-4aa3-9dbb-1c40bc1fdf2c";

describe("productSchema — attribute answers", () => {
  it("reads a checkbox group nobody ticked (react-hook-form reports it as false) as an empty list", () => {
    const parsed = productSchema.parse({ ...base, attributeValues: { [ATTR]: false } });
    expect(parsed.attributeValues[ATTR]).toEqual([]);
  });

  it("keeps ticked values, and turns a lone string into a one-item list", () => {
    expect(productSchema.parse({ ...base, attributeValues: { [ATTR]: ["Floral", "Woody"] } }).attributeValues[ATTR]).toEqual(["Floral", "Woody"]);
    expect(productSchema.parse({ ...base, attributeValues: { [ATTR]: "Floral" } }).attributeValues[ATTR]).toEqual(["Floral"]);
  });

  it("re-parsing its own output gives the same answer (it is validated in the browser and again on the server)", () => {
    const once = productSchema.parse({ ...base, attributeValues: { [ATTR]: false } });
    expect(productSchema.parse(once).attributeValues).toEqual(once.attributeValues);
  });

  it("defaults to no answers, and a missing product type to null", () => {
    const parsed = productSchema.parse({ ...base, productTypeId: "" });
    expect(parsed.attributeValues).toEqual({});
    expect(parsed.productTypeId).toBeNull();
  });
});
