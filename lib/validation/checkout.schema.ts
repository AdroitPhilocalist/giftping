import { z } from "zod";

export const placeOrderSchema = z.object({
  addressId: z.string().uuid("Choose a delivery address"),
  giftWrap: z.boolean().default(false),
  giftMessage: z
    .string()
    .trim()
    .max(250, "Keep the gift message under 250 characters")
    .optional()
    .transform((v) => (v ? v : null)),
  // Generated when the checkout page renders; lets a double-click / retry return the same order.
  idempotencyKey: z.string().uuid(),
});

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

export const couponCodeSchema = z
  .string()
  .trim()
  .min(1, "Enter a coupon code")
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/, "Coupon codes use letters, numbers, - and _ only")
  .transform((v) => v.toUpperCase());
