import { z } from "zod";
import { WRAP_STYLE_IDS } from "../commerce/wrap-styles";

export const placeOrderSchema = z.object({
  addressId: z.string().uuid("Choose a delivery address"),
  giftWrap: z.boolean().default(false),
  // only meaningful when giftWrap is on; validated against the fixed list so nothing else can be stored
  wrapStyle: z.enum(WRAP_STYLE_IDS).optional(),
  giftMessage: z
    .string()
    .trim()
    .max(250, "Keep the gift message under 250 characters")
    .optional()
    .transform((v) => (v ? v : null)),
  // Generated when the checkout page renders; lets a double-click / retry return the same order.
  idempotencyKey: z.string().uuid(),
  // Vendor ids the shopper chose to upgrade to Express delivery. Re-validated server-side against a fresh
  // serviceability check — a requested vendor with no real Express option on this route is silently dropped,
  // never trusted or errored on.
  expressVendorIds: z.array(z.string().uuid()).default([]),
});

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

export const couponCodeSchema = z
  .string()
  .trim()
  .min(1, "Enter a coupon code")
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/, "Coupon codes use letters, numbers, - and _ only")
  .transform((v) => v.toUpperCase());
