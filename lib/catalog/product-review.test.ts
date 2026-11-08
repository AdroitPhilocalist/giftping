import { describe, expect, it } from "vitest";
import {
  PRODUCT_APPROVED_ACTION,
  PRODUCT_VENDOR_CHANGE_ACTION,
  diffProductSnapshots,
  parseProductSnapshot,
  summariseProductReview,
  type ProductReviewAuditRow,
  type ProductSnapshot,
} from "./product-review";

function snapshot(overrides: Partial<ProductSnapshot> = {}): ProductSnapshot {
  return {
    version: 1,
    name: "Ceramic mug",
    categoryId: "category-home",
    categoryName: "Home",
    productTypeId: "type-mugs",
    productTypeName: "Mugs",
    shortDescription: "A mug",
    description: "A lovely ceramic mug.",
    basePrice: 499,
    salePrice: null,
    sku: "MUG-1",
    stockQuantity: 10,
    weightGrams: 250,
    gstRate: 18,
    hsnCode: "6912",
    tags: ["mug", "ceramic"],
    occasionTags: ["birthday"],
    recipientTags: ["friends"],
    engraving: null,
    variants: [{ id: "v1", name: "Colour", value: "White", priceAdjustment: 0, stockQuantity: 10 }],
    attributes: [{ id: "a1", key: "material", label: "Material", values: ["Ceramic"] }],
    images: [{ id: "i1", url: "https://example.com/one.jpg", thumbUrl: null, altText: null, isPrimary: true }],
    ...overrides,
  };
}

function auditRow(overrides: Partial<ProductReviewAuditRow>): ProductReviewAuditRow {
  return {
    id: "row",
    action: PRODUCT_VENDOR_CHANGE_ACTION,
    created_at: "2026-04-01T10:00:00.000Z",
    before_data: null,
    after_data: null,
    ...overrides,
  };
}

describe("summariseProductReview", () => {
  it("measures the cumulative change from the oldest edit since the latest approval", () => {
    const approved = snapshot({ name: "Approved name" });
    const firstEdit = snapshot({ name: "First edit" });
    const latestEdit = snapshot({ name: "Latest edit" });

    const summary = summariseProductReview([
      auditRow({ id: "c3", created_at: "2026-04-03T10:00:00.000Z", before_data: firstEdit, after_data: latestEdit }),
      auditRow({ id: "c2", created_at: "2026-04-02T10:00:00.000Z", before_data: approved, after_data: firstEdit }),
      auditRow({
        id: "a1",
        action: PRODUCT_APPROVED_ACTION,
        created_at: "2026-04-01T10:00:00.000Z",
        before_data: { status: "pending" },
        after_data: { status: "active" },
      }),
      // This edit belongs to a previous review cycle and must not widen the diff again.
      auditRow({ id: "c1", created_at: "2026-03-31T10:00:00.000Z", before_data: snapshot({ name: "Older" }), after_data: approved }),
    ]);

    expect(summary?.before?.name).toBe("Approved name");
    expect(summary?.after.name).toBe("Latest edit");
    expect(summary?.editCount).toBe(2);
    expect(summary?.firstChangedAt).toBe("2026-04-02T10:00:00.000Z");
    expect(summary?.latestChangedAt).toBe("2026-04-03T10:00:00.000Z");
  });

  it("keeps a new product's before as null and returns null when there are no vendor changes", () => {
    const created = snapshot({ name: "New mug" });
    const summary = summariseProductReview([
      auditRow({ id: "c1", created_at: "2026-04-02T10:00:00.000Z", before_data: null, after_data: created }),
    ]);
    expect(summary?.before).toBeNull();
    expect(summary?.after.name).toBe("New mug");

    expect(summariseProductReview([auditRow({ action: PRODUCT_APPROVED_ACTION, after_data: created })])).toBeNull();
  });
});

describe("diffProductSnapshots", () => {
  it("lists changed scalar fields with readable before/after values", () => {
    const before = snapshot();
    const after = snapshot({
      name: "Hand-painted mug",
      basePrice: 599,
      salePrice: 549,
      stockQuantity: 4,
      tags: ["mug", "ceramic", "hand-painted"],
      description: "A hand-painted ceramic mug.",
    });

    const diff = diffProductSnapshots(before, after);
    const field = (label: string) => diff.fields.find((item) => item.label === label);

    expect(field("Product name")).toMatchObject({ before: "Ceramic mug", after: "Hand-painted mug" });
    expect(field("Regular price")).toMatchObject({ before: "₹499", after: "₹599" });
    expect(field("Sale price")).toMatchObject({ before: "No sale price", after: "₹549" });
    expect(field("Stock")).toMatchObject({ before: "10", after: "4" });
    expect(field("Search tags")).toMatchObject({ before: "mug, ceramic", after: "mug, ceramic, hand-painted" });
    expect(field("Description")).toMatchObject({ multiline: true });
    expect(diff.hasChanges).toBe(true);
  });

  it("ignores an admin category/type rename when the stable id has not changed", () => {
    const before = snapshot({ categoryName: "Home", productTypeName: "Mugs" });
    const after = snapshot({ categoryName: "Home & Living", productTypeName: "Drinkware" });

    expect(diffProductSnapshots(before, after).fields).toEqual([]);
  });

  it("shows a category change when the vendor actually moves the product", () => {
    const before = snapshot();
    const after = snapshot({ categoryId: "category-kitchen", categoryName: "Kitchen" });

    expect(diffProductSnapshots(before, after).fields).toEqual([
      expect.objectContaining({ label: "Category", before: "Home", after: "Kitchen" }),
    ]);
  });

  it("groups added, removed and changed variants", () => {
    const before = snapshot();
    const after = snapshot({
      variants: [
        { id: "v1", name: "Colour", value: "White", priceAdjustment: 0, stockQuantity: 3 },
        { id: "v2", name: "Size", value: "Large", priceAdjustment: 100, stockQuantity: 5 },
      ],
    });

    const diff = diffProductSnapshots(before, after);
    expect(diff.variants).toHaveLength(2);
    expect(diff.variants.find((variant) => variant.id === "v1")).toMatchObject({
      kind: "changed",
      label: "Colour: White",
      fields: [expect.objectContaining({ label: "Stock", before: "10", after: "3" })],
    });
    expect(diff.variants.find((variant) => variant.id === "v2")).toMatchObject({ kind: "added", label: "Size: Large" });

    const removal = diffProductSnapshots(after, before).variants.find((variant) => variant.id === "v2");
    expect(removal).toMatchObject({ kind: "removed", label: "Size: Large" });
  });

  it("groups changed specifications and photo additions/removals/main-photo changes", () => {
    const before = snapshot();
    const after = snapshot({
      attributes: [{ id: "a1", key: "material", label: "Material", values: ["Porcelain"] }],
      images: [
        { id: "i2", url: "https://example.com/two.jpg", thumbUrl: "https://example.com/two-thumb.jpg", altText: "New main", isPrimary: true },
        { id: "i3", url: "https://example.com/three.jpg", thumbUrl: null, altText: null, isPrimary: false },
      ],
    });

    const diff = diffProductSnapshots(before, after);
    expect(diff.attributes).toEqual([
      { id: "a1", label: "Material", before: "Ceramic", after: "Porcelain" },
    ]);
    expect(diff.images.map((image) => image.kind)).toEqual(["added", "added", "primary", "removed"]);
    expect(diff.images.find((image) => image.kind === "primary")?.image?.id).toBe("i2");
  });

  it("reports no changes for two identical snapshots", () => {
    const before = snapshot();
    expect(diffProductSnapshots(before, before).hasChanges).toBe(false);
  });
});

describe("parseProductSnapshot", () => {
  it("accepts the current shape and rejects unknown or partial JSON", () => {
    expect(parseProductSnapshot(snapshot())?.name).toBe("Ceramic mug");
    expect(parseProductSnapshot({ ...snapshot(), version: 99 })).toBeNull();
    expect(parseProductSnapshot({ version: 1, name: "Only a name" })).toBeNull();
    expect(parseProductSnapshot(null)).toBeNull();
  });
});
