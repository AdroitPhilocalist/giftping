import { z } from "zod";

// Same blank->null preprocessing as lib/validation/category.schema.ts (not a z.literal("") union — that
// reports a bare "Invalid input" when Zod v4 re-parses its own already-transformed output, and this value
// genuinely gets parsed twice: client-side, then independently server-side).
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v !== "string" ? v : v.trim() === "" ? null : v.trim()), z.string().max(max).nullable());

export const productTypeSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(60),
  // A clean, admin-chosen slug, same convention as categorySchema — product types are few and curated, not
  // auto-random like a vendor/product slug.
  slug: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.string().min(2, "Enter a slug").max(60).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only, e.g. gift-hampers"),
  ),
  description: optionalText(300),
  iconUrl: optionalText(300),
  metaTitle: optionalText(70),
  metaDescription: optionalText(160),
  isActive: z.boolean(),
  parentId: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().uuid().nullable()),
});
export type ProductTypeInput = z.input<typeof productTypeSchema>;
export type ProductTypeData = z.output<typeof productTypeSchema>;

// One row in a type's attribute editor (e.g. "Flavor" on "Chocolates & Sweets"). `key` mirrors the DB's
// product_attributes_key_format CHECK constraint exactly.
export const productAttributeSchema = z.object({
  id: z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.string().uuid().optional()),
  key: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") : v),
    z.string().min(2, "Enter a key").max(40).regex(/^[a-z0-9]+(_[a-z0-9]+)*$/, "Lowercase letters, numbers and underscores only"),
  ),
  label: z.string().trim().min(1, "Enter a label").max(40),
  inputType: z.enum(["select", "multi_select"]).default("select"),
  options: z.array(z.string().trim().min(1).max(60)).min(1, "Add at least one option").max(30),
});
export type ProductAttributeInput = z.input<typeof productAttributeSchema>;
export type ProductAttributeData = z.output<typeof productAttributeSchema>;

/** A comma-separated textbox ("Chocolate, Vanilla, Red Velvet") into a clean, deduped word list — same shape as lib/validation/product.schema.ts's parseFreeTags. */
export function parseAttributeOptions(raw: string | undefined): string[] {
  return Array.from(new Set((raw ?? "").split(",").map((w) => w.trim()).filter(Boolean))).slice(0, 30);
}
