import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import type { CouponRule } from "@/lib/commerce/totals";

export type CouponLookup = { ok: true; coupon: CouponRule } | { ok: false; error: string };

/**
 * Asks the database whether `code` is usable by this shopper right now (validity window, usage caps, their
 * own redemptions — see resolve_coupon in the Stage 6 migration). Scope and money are judged by
 * computeQuote(). Coupons stay unlistable: there's no client SELECT on the table and this is service-role only.
 */
export async function lookupCoupon(code: string, userId: string): Promise<CouponLookup> {
  const { data, error } = await createAdminClient().rpc("resolve_coupon", { p_code: code, p_user_id: userId });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Couldn't check that coupon right now. Please try again." };
  }
  const result = data as { ok: boolean; error?: string; coupon?: Record<string, unknown> };
  if (!result.ok || !result.coupon) return { ok: false, error: result.error ?? "That coupon code isn't valid." };

  const c = result.coupon;
  return {
    ok: true,
    coupon: {
      id: String(c.id),
      code: String(c.code),
      discountType: c.discountType === "fixed" ? "fixed" : "percentage",
      discountValue: Number(c.discountValue),
      minOrderAmount: Number(c.minOrderAmount ?? 0),
      maxDiscountAmount: c.maxDiscountAmount === null || c.maxDiscountAmount === undefined ? null : Number(c.maxDiscountAmount),
      vendorId: c.vendorId ? String(c.vendorId) : null,
      categoryId: c.categoryId ? String(c.categoryId) : null,
    },
  };
}
