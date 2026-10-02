import { z } from "zod";

// Preprocesses blank → null rather than a union with z.literal("") — a union reports a bare "Invalid input"
// when Zod v4 re-parses its own already-transformed output, which this form's value genuinely goes through
// twice (client-side zodResolver-equivalent check, then the server action independently). See
// lib/validation/profile.schema.ts for the same fix, found the same way.
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v !== "string" ? v : v.trim() === "" ? null : v.trim()),
    z.string().max(max).nullable(),
  );

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(60),
  // A clean, admin-chosen slug (not auto-random like a vendor/product slug) — categories are few and
  // curated, and the slug is a real, memorable URL segment (/categories/birthday), not just a unique key.
  slug: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.string().min(2, "Enter a slug").max(60).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only, e.g. corporate-gifting"),
  ),
  description: optionalText(300),
  // A plain hex string — the form uses a native <input type="color">, which only ever produces valid hex,
  // so no format check is needed here.
  themeColor: optionalText(7),
  metaTitle: optionalText(70),
  metaDescription: optionalText(160),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

export type CategoryInput = z.input<typeof categorySchema>;
export type CategoryData = z.output<typeof categorySchema>;
