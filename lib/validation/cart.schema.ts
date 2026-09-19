import { z } from "zod";
import { MAX_LINE_QUANTITY } from "@/lib/commerce/pricing";

export const PERSONALIZATION_OCCASIONS = ["Birthday", "Anniversary", "Thank You", "Other"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const personalizationSchema = z
  .object({
    recipientName: optionalText(60),
    giftMessage: optionalText(150),
    occasion: z.enum(PERSONALIZATION_OCCASIONS).optional(),
  })
  .transform((p) => {
    // Only keep what was actually filled in, so "no personalisation" is always `{}` and identical
    // lines compare equal (the merge-by-line logic in cart.ts and merge_guest_cart() relies on that).
    const out: Record<string, string> = {};
    if (p.recipientName) out.recipientName = p.recipientName;
    if (p.giftMessage) out.giftMessage = p.giftMessage;
    if (p.occasion) out.occasion = p.occasion;
    return out;
  });

export type Personalization = z.output<typeof personalizationSchema>;

export const quantitySchema = z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY);

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  variantIds: z
    .array(z.string().uuid())
    .max(5)
    .transform((ids) => Array.from(new Set(ids)).sort()), // sorted so equal selections compare equal
  quantity: quantitySchema,
  personalization: personalizationSchema.default({}),
});

export type AddToCartInput = z.input<typeof addToCartSchema>;
