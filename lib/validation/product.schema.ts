import { z } from "zod";
import { OCCASION_TAGS, RECIPIENT_TAGS } from "@/lib/catalog/tags";
import { DEFAULT_ENGRAVING, ENGRAVING_LIMITS, ENGRAVING_STYLE_IDS } from "@/lib/personalization/engraving";

const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? undefined : v),
  z.coerce.number().int().min(0).optional(),
);

/**
 * One attribute's chosen values. react-hook-form reports an untouched group of checkboxes as `false` (the first checkbox registers before its siblings, so the
 * group is still a single box then) and a lone value as a string — both mean "a list", so normalise rather than reject a field the vendor never saw.
 */
export const attributeValueList = z.preprocess(
  (v) => (Array.isArray(v) ? v : typeof v === "string" && v !== "" ? [v] : []),
  z.array(z.string().max(100)).max(30),
);

export const variantSchema = z.object({
  // A hidden form input submits "" for a brand-new variant; treat that as "no id yet".
  id: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
  name: z.string().trim().min(1, "Variant type is required").max(60),
  value: z.string().trim().min(1, "Variant value is required").max(60),
  priceAdjustment: z.coerce.number().min(-100000).max(100000).default(0),
  stockQuantity: z.coerce.number().int().min(0).max(100000).default(0),
});

/**
 * The "personalised text on the photo" setup. Lenient while `enabled` is false (the form keeps the other fields around so toggling it back on restores
 * them); the real rules apply only when it's on — see the superRefine below. The result is stored in products.personalization_options via
 * toPersonalizationOptions(), which clamps everything again.
 */
export const engravingSetupSchema = z.object({
  enabled: z.boolean().default(false),
  label: z.string().trim().max(ENGRAVING_LIMITS.labelMax, `Keep the field name under ${ENGRAVING_LIMITS.labelMax} characters`).default(DEFAULT_ENGRAVING.label),
  maxLength: z.coerce.number().int().min(ENGRAVING_LIMITS.minLength, `At least ${ENGRAVING_LIMITS.minLength} characters`).max(ENGRAVING_LIMITS.maxLength, `At most ${ENGRAVING_LIMITS.maxLength} characters`).default(DEFAULT_ENGRAVING.maxLength),
  required: z.boolean().default(true),
  style: z.enum(ENGRAVING_STYLE_IDS).default(DEFAULT_ENGRAVING.style),
  x: z.coerce.number().min(0).max(100).default(DEFAULT_ENGRAVING.x),
  y: z.coerce.number().min(0).max(100).default(DEFAULT_ENGRAVING.y),
  w: z.coerce.number().min(ENGRAVING_LIMITS.minW).max(100).default(DEFAULT_ENGRAVING.w),
  h: z.coerce.number().min(ENGRAVING_LIMITS.minH).max(100).default(DEFAULT_ENGRAVING.h),
  rotate: z.coerce.number().min(-ENGRAVING_LIMITS.maxRotate).max(ENGRAVING_LIMITS.maxRotate).default(0),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(200),
    categoryId: z.string().uuid("Choose a category"),
    productTypeId: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().uuid().nullable()),
    shortDescription: z.string().trim().max(500).optional().or(z.literal("")),
    description: z.string().trim().max(5000).optional().or(z.literal("")),
    basePrice: z.coerce.number().positive("Enter a price").max(10_000_000),
    salePrice: z.preprocess(
      (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? undefined : v),
      z.coerce.number().positive().max(10_000_000).optional(),
    ),
    sku: z.string().trim().max(100).optional().or(z.literal("")),
    stockQuantity: z.coerce.number().int("Whole units only").min(0).max(1_000_000),
    weightGrams: optionalInt,
    gstRate: z.coerce.number().min(0).max(28).default(18),
    hsnCode: z.string().trim().max(12).optional().or(z.literal("")),
    tags: z.string().trim().max(300).optional().or(z.literal("")),
    occasionTags: z.array(z.enum(OCCASION_TAGS)).default([]),
    recipientTags: z.array(z.enum(RECIPIENT_TAGS)).default([]),
    variants: z.array(variantSchema).max(20).default([]),
    // Keyed by product_attributes.id (not its `key` string — a key is only unique within one product type,
    // not globally). Values are re-validated against the live attribute definitions in saveProductAction,
    // since the form's own copy could be stale if an admin edited the attribute since the page loaded.
    attributeValues: z.record(z.string(), attributeValueList).default({}),
    engraving: engravingSetupSchema.optional(),
  })
  .refine((v) => v.salePrice === undefined || v.salePrice < v.basePrice, {
    message: "Sale price must be lower than the regular price",
    path: ["salePrice"],
  })
  .superRefine((v, ctx) => {
    const e = v.engraving;
    if (!e?.enabled) return;
    if (e.label.trim() === "") ctx.addIssue({ code: "custom", path: ["engraving", "label"], message: "Name the text field (for example “Name on the plate”)" });
    if (e.x + e.w > 100.5 || e.y + e.h > 100.5) ctx.addIssue({ code: "custom", path: ["engraving", "x"], message: "The text box has to stay inside the photo — drag it back in" });
  });

export type ProductFormInput = z.input<typeof productSchema>;
export type ProductInput = z.output<typeof productSchema>;

export function parseFreeTags(raw: string | undefined): string[] {
  return Array.from(
    new Set(
      (raw ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .map((t) => t.slice(0, 30)),
    ),
  ).slice(0, 15);
}
