"use server";

import { revalidatePath } from "next/cache";
import { checkoutRateLimit, checkRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { loadCheckoutSnapshot, persistOrder, quoteFor } from "@/lib/commerce/checkout";
import { lookupCoupon } from "@/lib/commerce/coupons";
import { computeQuote } from "@/lib/commerce/totals";
import { createClient } from "@/lib/db/server";
import { couponCodeSchema, placeOrderSchema, type PlaceOrderInput } from "@/lib/validation/checkout.schema";

const TOO_MANY = "You're doing that a little fast — please wait a moment.";

async function limited() {
  return !(await checkRateLimit(checkoutRateLimit, await getRequestIp())).success;
}

export interface CheckoutActionResult {
  error?: string;
  message?: string;
  orderId?: string;
}

export async function applyCouponAction(rawCode: string): Promise<CheckoutActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Sign in to apply a coupon." };
  if (await limited()) return { error: TOO_MANY };

  const parsed = couponCodeSchema.safeParse(rawCode);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid coupon code." };

  const found = await lookupCoupon(parsed.data, user.id);
  if (!found.ok) return { error: found.error };

  // Dry-run it against the real cart so scope / minimum-order problems are reported now, not at payment.
  const snapshot = await loadCheckoutSnapshot(user.id);
  if (!snapshot) return { error: "Your cart is empty." };
  const preview = computeQuote({ lines: snapshot.lines, coupon: found.coupon, giftWrap: false, settings: snapshot.settings });
  if (preview.couponError) return { error: preview.couponError };

  const client = await createClient();
  const { error } = await client.from("cart").update({ coupon_code: found.coupon.code }).eq("id", snapshot.cartId);
  if (error) return { error: "Couldn't apply that coupon. Please try again." };

  revalidatePath("/checkout");
  return { message: `Coupon ${found.coupon.code} applied — you save ₹${preview.discount}.` };
}

export async function removeCouponAction(): Promise<CheckoutActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Sign in first." };
  const client = await createClient();
  const { error } = await client.from("cart").update({ coupon_code: null }).eq("user_id", user.id);
  if (error) return { error: "Couldn't remove the coupon. Please try again." };
  revalidatePath("/checkout");
  return {};
}

export async function placeOrderAction(raw: PlaceOrderInput): Promise<CheckoutActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Please sign in to place your order." };
  if (await limited()) return { error: TOO_MANY };

  const parsed = placeOrderSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  const input = parsed.data;

  const client = await createClient();
  const { data: address } = await client
    .from("addresses")
    .select("label, recipient_name, phone, address_line1, address_line2, landmark, city, state, pincode, country")
    .eq("id", input.addressId)
    .eq("user_id", user.id) // RLS also lets admins read any address; an order may only ship to the buyer's own
    .maybeSingle();
  if (!address) return { error: "Choose a delivery address." };

  const snapshot = await loadCheckoutSnapshot(user.id);
  if (!snapshot) return { error: "Your cart is empty." };
  if (snapshot.issues.length > 0) return { error: `${snapshot.issues[0]} Please review your cart.` };
  if (snapshot.couponLookupError) return { error: `${snapshot.couponLookupError} Remove the coupon to continue.` };

  const quote = quoteFor(snapshot, input.giftWrap);
  if (quote.couponError) return { error: `${quote.couponError} Remove the coupon to continue.` };

  const outcome = await persistOrder({
    userId: user.id,
    snapshot,
    quote,
    address,
    giftWrap: input.giftWrap,
    giftMessage: input.giftMessage,
    idempotencyKey: input.idempotencyKey,
  });
  if (!outcome.ok) return { error: outcome.error };

  revalidatePath("/", "layout");
  return { orderId: outcome.orderId };
}
