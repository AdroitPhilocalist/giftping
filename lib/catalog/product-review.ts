import type { EngravingConfig } from "@/lib/personalization/engraving";
import { formatCurrency } from "@/lib/utils/format";

/**
 * Product changes are recorded in audit_logs as one compact snapshot before and after a vendor edit.
 * Keeping the snapshot shape versioned means an older row can never be mistaken for the current shape.
 */
export const PRODUCT_VENDOR_CHANGE_ACTION = "product.vendor_change";
export const PRODUCT_APPROVED_ACTION = "product.approved";
export const PRODUCT_SNAPSHOT_VERSION = 1;

export interface ProductVariantSnapshot {
  id: string;
  name: string;
  value: string;
  priceAdjustment: number;
  stockQuantity: number;
}

export interface ProductAttributeSnapshot {
  id: string;
  key: string;
  label: string;
  values: string[];
}

export interface ProductImageSnapshot {
  id: string;
  url: string;
  thumbUrl: string | null;
  altText: string | null;
  isPrimary: boolean;
}

/** Everything a vendor can change from the product form, plus photos. System fields (status, ratings, sales) are deliberately absent. */
export interface ProductSnapshot {
  version: typeof PRODUCT_SNAPSHOT_VERSION;
  name: string;
  categoryId: string | null;
  categoryName: string;
  productTypeId: string | null;
  productTypeName: string;
  shortDescription: string;
  description: string;
  basePrice: number;
  salePrice: number | null;
  sku: string;
  stockQuantity: number;
  weightGrams: number | null;
  gstRate: number;
  hsnCode: string;
  tags: string[];
  occasionTags: string[];
  recipientTags: string[];
  engraving: EngravingConfig | null;
  variants: ProductVariantSnapshot[];
  attributes: ProductAttributeSnapshot[];
  images: ProductImageSnapshot[];
}

export interface ProductReviewAuditRow {
  id: string;
  action: string;
  created_at: string;
  before_data: unknown;
  after_data: unknown;
}

export interface ProductReviewSummary {
  /** null means this is the first version of a new product. */
  before: ProductSnapshot | null;
  after: ProductSnapshot;
  /** Number of vendor saves since the last admin approval (or since creation). */
  editCount: number;
  firstChangedAt: string;
  latestChangedAt: string;
}

export type ProductFieldFormat = "text" | "currency" | "integer" | "weight" | "percent" | "list" | "engraving";

export interface ProductFieldChange {
  key: string;
  label: string;
  before: string;
  after: string;
  multiline?: boolean;
}

export interface ProductVariantChange {
  id: string;
  kind: "added" | "removed" | "changed";
  label: string;
  before: ProductVariantSnapshot | null;
  after: ProductVariantSnapshot | null;
  fields: ProductFieldChange[];
}

export interface ProductAttributeChange {
  id: string;
  label: string;
  before: string;
  after: string;
}

export interface ProductImageChange {
  id: string;
  kind: "added" | "removed" | "primary";
  label: string;
  image: ProductImageSnapshot | null;
}

export interface ProductDiff {
  fields: ProductFieldChange[];
  variants: ProductVariantChange[];
  attributes: ProductAttributeChange[];
  images: ProductImageChange[];
  hasChanges: boolean;
}

interface ScalarFieldSpec {
  key: keyof ProductSnapshot;
  label: string;
  format: ProductFieldFormat;
  multiline?: boolean;
  /** Compare this stable id instead of the display value, so an admin renaming a category doesn't look like a vendor edit. */
  compareKey?: keyof ProductSnapshot;
}

const SCALAR_FIELDS: ScalarFieldSpec[] = [
  { key: "name", label: "Product name", format: "text" },
  { key: "categoryName", label: "Category", format: "text", compareKey: "categoryId" },
  { key: "productTypeName", label: "Product type", format: "text", compareKey: "productTypeId" },
  { key: "shortDescription", label: "Short description", format: "text", multiline: true },
  { key: "description", label: "Description", format: "text", multiline: true },
  { key: "basePrice", label: "Regular price", format: "currency" },
  { key: "salePrice", label: "Sale price", format: "currency" },
  { key: "sku", label: "SKU", format: "text" },
  { key: "stockQuantity", label: "Stock", format: "integer" },
  { key: "weightGrams", label: "Weight", format: "weight" },
  { key: "gstRate", label: "GST", format: "percent" },
  { key: "hsnCode", label: "HSN code", format: "text" },
  { key: "tags", label: "Search tags", format: "list" },
  { key: "occasionTags", label: "Occasions", format: "list" },
  { key: "recipientTags", label: "Recipients", format: "list" },
  { key: "engraving", label: "Personalisation", format: "engraving" },
];

/** Safe reader for JSON pulled back out of audit_logs. Unknown/old shapes are ignored rather than crashing the admin page. */
export function parseProductSnapshot(value: unknown): ProductSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Partial<ProductSnapshot>;
  if (snapshot.version !== PRODUCT_SNAPSHOT_VERSION) return null;
  if (typeof snapshot.name !== "string" || typeof snapshot.basePrice !== "number") return null;
  if (snapshot.categoryId === undefined || snapshot.productTypeId === undefined) return null;
  if (!Array.isArray(snapshot.tags) || !Array.isArray(snapshot.occasionTags) || !Array.isArray(snapshot.recipientTags)) return null;
  if (!Array.isArray(snapshot.variants) || !Array.isArray(snapshot.attributes) || !Array.isArray(snapshot.images)) return null;
  return snapshot as ProductSnapshot;
}

/**
 * Collapses the audit trail for one product into the change the reviewer needs to judge:
 * the version before the first edit since the last approval, and the latest submitted version.
 * Later edits therefore produce a cumulative diff rather than hiding earlier changes.
 */
export function summariseProductReview(rows: readonly ProductReviewAuditRow[]): ProductReviewSummary | null {
  const ordered = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  const latestApproval = ordered.findIndex((row) => row.action === PRODUCT_APPROVED_ACTION);
  const sinceApproval = latestApproval === -1 ? ordered : ordered.slice(0, latestApproval);

  const changes = sinceApproval.filter(
    (row) => row.action === PRODUCT_VENDOR_CHANGE_ACTION && parseProductSnapshot(row.after_data) !== null,
  );
  if (changes.length === 0) return null;

  const latest = changes[0];
  const oldest = changes[changes.length - 1];
  const after = parseProductSnapshot(latest.after_data);
  if (!after) return null;

  return {
    before: parseProductSnapshot(oldest.before_data),
    after,
    editCount: changes.length,
    firstChangedAt: oldest.created_at,
    latestChangedAt: latest.created_at,
  };
}

export function describeEngraving(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Off";
  const engraving = value as Partial<EngravingConfig>;
  if (typeof engraving.label !== "string") return "On";
  const bits = [
    engraving.label,
    `${engraving.maxLength ?? "?"} characters`,
    engraving.required ? "required" : "optional",
    engraving.style ?? "default style",
  ];
  if (typeof engraving.w === "number" && typeof engraving.h === "number") {
    bits.push(`${engraving.w}×${engraving.h}% at ${engraving.x ?? 0}%, ${engraving.y ?? 0}%`);
  }
  if (engraving.rotate) bits.push(`${engraving.rotate}°`);
  return bits.join(" · ");
}

function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  const left = [...new Set(a.map((value) => value.trim()).filter(Boolean))].sort();
  const right = [...new Set(b.map((value) => value.trim()).filter(Boolean))].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameFieldValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return sameStringSet(a.map(String), b.map(String));
  if (a && b && typeof a === "object" && typeof b === "object") return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

function formatValue(value: unknown, format: ProductFieldFormat, key?: string): string {
  if (key === "salePrice" && (value === null || value === undefined)) return "No sale price";

  switch (format) {
    case "currency":
      return typeof value === "number" ? formatCurrency(value) : "—";
    case "integer":
      return typeof value === "number" ? String(value) : "—";
    case "weight":
      return typeof value === "number" ? `${value} g` : "—";
    case "percent":
      return typeof value === "number" ? `${value}%` : "—";
    case "list":
      return Array.isArray(value) && value.length > 0 ? value.map(String).join(", ") : "None";
    case "engraving":
      return describeEngraving(value);
    default:
      return typeof value === "string" && value.trim() !== "" ? value : "—";
  }
}

function variantLabel(variant: ProductVariantSnapshot): string {
  return `${variant.name}: ${variant.value}`;
}

function diffVariants(before: readonly ProductVariantSnapshot[], after: readonly ProductVariantSnapshot[]): ProductVariantChange[] {
  const beforeById = new Map(before.map((variant) => [variant.id, variant]));
  const afterById = new Map(after.map((variant) => [variant.id, variant]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
  const changes: ProductVariantChange[] = [];

  for (const id of ids) {
    const previous = beforeById.get(id) ?? null;
    const next = afterById.get(id) ?? null;
    if (!previous && next) {
      changes.push({ id, kind: "added", label: variantLabel(next), before: null, after: next, fields: [] });
      continue;
    }
    if (previous && !next) {
      changes.push({ id, kind: "removed", label: variantLabel(previous), before: previous, after: null, fields: [] });
      continue;
    }
    if (!previous || !next) continue;

    const fields: ProductFieldChange[] = [];
    const specs: Array<{ key: keyof ProductVariantSnapshot; label: string; format: ProductFieldFormat }> = [
      { key: "name", label: "Variant type", format: "text" },
      { key: "value", label: "Variant value", format: "text" },
      { key: "priceAdjustment", label: "Price adjustment", format: "currency" },
      { key: "stockQuantity", label: "Stock", format: "integer" },
    ];
    for (const spec of specs) {
      if (previous[spec.key] === next[spec.key]) continue;
      fields.push({
        key: spec.key,
        label: spec.label,
        before: formatValue(previous[spec.key], spec.format),
        after: formatValue(next[spec.key], spec.format),
      });
    }
    if (fields.length > 0) {
      changes.push({ id, kind: "changed", label: variantLabel(next), before: previous, after: next, fields });
    }
  }

  return changes.sort((a, b) => a.label.localeCompare(b.label));
}

function diffAttributes(before: readonly ProductAttributeSnapshot[], after: readonly ProductAttributeSnapshot[]): ProductAttributeChange[] {
  const beforeById = new Map(before.map((attribute) => [attribute.id, attribute]));
  const afterById = new Map(after.map((attribute) => [attribute.id, attribute]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
  const changes: ProductAttributeChange[] = [];

  for (const id of ids) {
    const previous = beforeById.get(id);
    const next = afterById.get(id);
    if (sameStringSet(previous?.values ?? [], next?.values ?? [])) continue;
    changes.push({
      id,
      label: next?.label ?? previous?.label ?? "Attribute",
      before: formatValue(previous?.values ?? [], "list"),
      after: formatValue(next?.values ?? [], "list"),
    });
  }

  return changes.sort((a, b) => a.label.localeCompare(b.label));
}

function diffImages(before: readonly ProductImageSnapshot[], after: readonly ProductImageSnapshot[]): ProductImageChange[] {
  const beforeById = new Map(before.map((image) => [image.id, image]));
  const afterById = new Map(after.map((image) => [image.id, image]));
  const changes: ProductImageChange[] = [];

  for (const image of after) {
    if (!beforeById.has(image.id)) changes.push({ id: image.id, kind: "added", label: "Photo added", image });
  }
  for (const image of before) {
    if (!afterById.has(image.id)) changes.push({ id: image.id, kind: "removed", label: "Photo removed", image });
  }

  const previousPrimary = before.find((image) => image.isPrimary);
  const nextPrimary = after.find((image) => image.isPrimary);
  if (previousPrimary && nextPrimary && previousPrimary.id !== nextPrimary.id) {
    changes.push({ id: nextPrimary.id, kind: "primary", label: "Main photo changed", image: nextPrimary });
  }

  const order = { added: 0, primary: 1, removed: 2 } as const;
  return changes.sort((a, b) => order[a.kind] - order[b.kind] || a.label.localeCompare(b.label));
}

/** Field-by-field diff of two snapshots, grouped so the review card can show only what actually changed. */
export function diffProductSnapshots(before: ProductSnapshot | null, after: ProductSnapshot): ProductDiff {
  const fields = SCALAR_FIELDS.flatMap((spec): ProductFieldChange[] => {
    const previousValue = before ? before[spec.key] : undefined;
    const nextValue = after[spec.key];
    const previousComparison = before && spec.compareKey ? before[spec.compareKey] : previousValue;
    const nextComparison = spec.compareKey ? after[spec.compareKey] : nextValue;
    if (before && sameFieldValue(previousComparison, nextComparison)) return [];
    return [
      {
        key: spec.key,
        label: spec.label,
        before: formatValue(previousValue, spec.format, spec.key),
        after: formatValue(nextValue, spec.format, spec.key),
        multiline: spec.multiline,
      },
    ];
  });

  const variants = diffVariants(before?.variants ?? [], after.variants);
  const attributes = diffAttributes(before?.attributes ?? [], after.attributes);
  const images = diffImages(before?.images ?? [], after.images);

  return {
    fields,
    variants,
    attributes,
    images,
    hasChanges: fields.length > 0 || variants.length > 0 || attributes.length > 0 || images.length > 0,
  };
}
