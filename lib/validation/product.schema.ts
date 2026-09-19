import { z } from "zod";
import { OCCASION_TAGS, RECIPIENT_TAGS } from "@/lib/catalog/tags";

const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? undefined : v),
  z.coerce.number().int().min(0).optional(),
);

export const variantSchema = z.object({
  // A hidden form input submits "" for a brand-new variant; treat that as "no id yet".
  id: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
  name: z.string().trim().min(1, "Variant type is required").max(60),
  value: z.string().trim().min(1, "Variant value is required").max(60),
  priceAdjustment: z.coerce.number().min(-100000).max(100000).default(0),
  stockQuantity: z.coerce.number().int().min(0).max(100000).default(0),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(200),
    categoryId: z.string().uuid("Choose a category"),
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
  })
  .refine((v) => v.salePrice === undefined || v.salePrice < v.basePrice, {
    message: "Sale price must be lower than the regular price",
    path: ["salePrice"],
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
