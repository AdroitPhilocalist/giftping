import { describe, expect, it } from "vitest";
import { resolveProductSpecifications, type ProductAttributeDefinition } from "./product-attributes";
import type { ProductTypeRow } from "./product-types";

const type = (id: string, parent_id: string | null): ProductTypeRow => ({ id, parent_id, name: id, slug: id, sort_order: 0, is_active: true });
const attr = (id: string, product_type_id: string, label: string, sort_order: number, options: string[] = []): ProductAttributeDefinition => ({
  id,
  product_type_id,
  key: id,
  label,
  options,
  sort_order,
});

// Cakes & Bakery (bakery)
//   Cakes (cakes)
// Candles (candles)
const TYPES: ProductTypeRow[] = [type("bakery", null), type("cakes", "bakery"), type("candles", null)];

const ATTRIBUTES: ProductAttributeDefinition[] = [
  attr("flavor", "bakery", "Flavor", 0, ["Chocolate", "Vanilla"]),
  attr("egg", "bakery", "Eggless or With Egg", 1, ["Eggless", "With Egg"]),
  attr("dietary", "bakery", "Dietary", 2, ["Sugar-free", "Vegan"]),
  attr("weight", "cakes", "Weight", 0, ["500 g", "1 kg"]),
  attr("shape", "cakes", "Shape", 1, ["Round", "Heart"]),
  attr("scent", "candles", "Scent", 0),
];

describe("resolveProductSpecifications", () => {
  it("collects a product's own type and inherited ancestor attributes, with parent attributes first", () => {
    const specs = resolveProductSpecifications(
      "cakes",
      TYPES,
      ATTRIBUTES,
      [
        { attribute_id: "shape", value: "Round" },
        { attribute_id: "flavor", value: "Chocolate" },
        { attribute_id: "weight", value: "500 g" },
        { attribute_id: "egg", value: "Eggless" },
      ],
    );

    expect(specs.map((s) => [s.label, s.values])).toEqual([
      ["Flavor", ["Chocolate"]],
      ["Eggless or With Egg", ["Eggless"]],
      ["Weight", ["500 g"]],
      ["Shape", ["Round"]],
    ]);
  });

  it("leaves out attributes from unrelated types and attributes with no value", () => {
    const specs = resolveProductSpecifications("cakes", TYPES, ATTRIBUTES, [
      { attribute_id: "flavor", value: "Vanilla" },
      { attribute_id: "scent", value: "Rose" },
    ]);

    expect(specs).toEqual([{ attributeId: "flavor", key: "flavor", label: "Flavor", values: ["Vanilla"] }]);
  });

  it("groups multi-select values in option order, de-duplicates them, and appends unknown values", () => {
    const dietary = resolveProductSpecifications("cakes", TYPES, ATTRIBUTES, [
      { attribute_id: "dietary", value: "Vegan" },
      { attribute_id: "dietary", value: "Legacy value" },
      { attribute_id: "dietary", value: "Sugar-free" },
      { attribute_id: "dietary", value: "Vegan" },
    ]);

    expect(dietary[0].values).toEqual(["Sugar-free", "Vegan", "Legacy value"]);
  });

  it("ignores blank values and returns nothing when the product has no type or no answers", () => {
    expect(resolveProductSpecifications("cakes", TYPES, ATTRIBUTES, [{ attribute_id: "flavor", value: "   " }])).toEqual([]);
    expect(resolveProductSpecifications(null, TYPES, ATTRIBUTES, [{ attribute_id: "flavor", value: "Chocolate" }])).toEqual([]);
    expect(resolveProductSpecifications("cakes", TYPES, ATTRIBUTES, [])).toEqual([]);
  });
});
