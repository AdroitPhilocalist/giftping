/**
 * Pure order-quote maths — no I/O, so it is unit-tested to death and shared by the checkout preview and
 * place-order. Money rules, all decided here and nowhere else:
 *
 *  - Listed prices are GST-INCLUSIVE (the Indian consumer norm). GST is therefore *extracted* from what the
 *    customer pays, never added on top: gst = net × r / (100 + r).
 *  - A coupon applies to its "eligible" lines (its vendor and/or category scope, or everything). Its minimum
 *    order value is judged on that eligible subtotal. The discount is capped, then spread across the
 *    eligible lines proportionally (largest-remainder, in paise, so the parts always sum to the whole).
 *  - Who pays for a coupon: a vendor-scoped coupon is funded by that vendor (their commission base and
 *    payout shrink); a platform-wide coupon is funded by the platform (commission is charged on the full
 *    price, the vendor is paid as if there were no coupon).
 *  - Delivery is charged per vendor shipment (each vendor ships separately): flat fee unless that
 *    shipment's post-discount value reaches the free-delivery threshold. Gift wrap is a flat per-order fee.
 *    Delivery and gift wrap are treated as GST-inclusive too and are not broken out.
 */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface QuoteLineInput {
  key: string;
  vendorId: string;
  categoryId: string | null;
  /** GST-inclusive unit price, from lib/commerce/pricing.ts */
  unitPrice: number;
  quantity: number;
  gstRate: number;
  /** Already resolved via resolveCommissionRate() */
  commissionRate: number;
}

export interface CouponRule {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  vendorId: string | null;
  categoryId: string | null;
}

export interface QuoteSettings {
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  giftWrapCharge: number;
  /** Flat per-vendor-shipment upgrade fee for Express delivery — charged even when standard delivery would be free. */
  expressSurcharge: number;
}

export interface QuoteLine {
  key: string;
  vendorId: string;
  gross: number;
  discount: number;
  net: number;
  gstAmount: number;
  commissionBase: number;
  commissionAmount: number;
  vendorPayout: number;
  vendorFundedDiscount: number;
  platformFundedDiscount: number;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  delivery: number;
  deliveryByVendor: Record<string, number>;
  giftWrap: number;
  gstTotal: number;
  total: number;
  /** Set when a coupon was supplied but could not be applied; no discount is taken in that case. */
  couponError: string | null;
}

/** Splits `total` across `weights` in whole paise; parts always sum to exactly `total`. */
export function allocateProportionally(total: number, weights: number[]): number[] {
  const totalPaise = Math.round(total * 100);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  if (weightSum <= 0 || totalPaise <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (totalPaise * w) / weightSum);
  const floors = exact.map(Math.floor);
  let remainder = totalPaise - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remainder <= 0) break;
    floors[index] += 1;
    remainder -= 1;
  }
  return floors.map((paise) => paise / 100);
}

/** Discount a coupon gives on `eligibleSubtotal`, before allocation. Never exceeds the eligible subtotal. */
export function computeCouponDiscount(coupon: CouponRule, eligibleSubtotal: number): number {
  let discount =
    coupon.discountType === "percentage"
      ? (eligibleSubtotal * coupon.discountValue) / 100
      : coupon.discountValue;
  if (coupon.maxDiscountAmount !== null) discount = Math.min(discount, coupon.maxDiscountAmount);
  return round2(Math.max(0, Math.min(discount, eligibleSubtotal)));
}

export function computeQuote(input: {
  lines: QuoteLineInput[];
  coupon: CouponRule | null;
  giftWrap: boolean;
  settings: QuoteSettings;
  /** Vendor ids whose shipment the shopper upgraded to Express. Omit (or leave empty) for an all-Standard cart. */
  expressVendorIds?: ReadonlySet<string>;
}): Quote {
  const { lines, coupon, settings } = input;
  const expressVendorIds = input.expressVendorIds ?? new Set<string>();
  const gross = lines.map((l) => round2(l.unitPrice * l.quantity));
  const subtotal = round2(gross.reduce((a, b) => a + b, 0));

  let couponError: string | null = null;
  const discounts = lines.map(() => 0);

  if (coupon) {
    const eligible = lines.map(
      (l) =>
        (coupon.vendorId === null || coupon.vendorId === l.vendorId) &&
        (coupon.categoryId === null || coupon.categoryId === l.categoryId),
    );
    const eligibleSubtotal = round2(gross.reduce((sum, g, i) => sum + (eligible[i] ? g : 0), 0));

    if (eligibleSubtotal <= 0) {
      couponError = "That coupon doesn't apply to the items in your cart.";
    } else if (eligibleSubtotal < coupon.minOrderAmount) {
      couponError = `Add ₹${round2(coupon.minOrderAmount - eligibleSubtotal)} more of eligible items to use this coupon.`;
    } else {
      const total = computeCouponDiscount(coupon, eligibleSubtotal);
      const indexes = eligible.flatMap((e, i) => (e ? [i] : []));
      const shares = allocateProportionally(
        total,
        indexes.map((i) => gross[i]),
      );
      indexes.forEach((lineIndex, n) => {
        discounts[lineIndex] = shares[n];
      });
    }
  }

  const quoteLines: QuoteLine[] = lines.map((line, i) => {
    const discount = discounts[i];
    const net = round2(gross[i] - discount);
    const vendorFunded = coupon && !couponError && coupon.vendorId !== null ? discount : 0;
    const commissionBase = round2(gross[i] - vendorFunded);
    const commissionAmount = round2((commissionBase * line.commissionRate) / 100);
    return {
      key: line.key,
      vendorId: line.vendorId,
      gross: gross[i],
      discount,
      net,
      gstAmount: round2((net * line.gstRate) / (100 + line.gstRate)),
      commissionBase,
      commissionAmount,
      vendorPayout: round2(commissionBase - commissionAmount),
      vendorFundedDiscount: vendorFunded,
      platformFundedDiscount: round2(discount - vendorFunded),
    };
  });

  const netByVendor = new Map<string, number>();
  for (const line of quoteLines) netByVendor.set(line.vendorId, round2((netByVendor.get(line.vendorId) ?? 0) + line.net));
  const deliveryByVendor: Record<string, number> = {};
  for (const [vendorId, net] of netByVendor) {
    // Express is a paid upgrade on top of whatever Standard would have cost — including free (a free threshold
    // waives the ordinary delivery fee, not the premium for going faster).
    const base = net >= settings.freeDeliveryThreshold ? 0 : settings.deliveryCharge;
    const express = expressVendorIds.has(vendorId) ? settings.expressSurcharge : 0;
    deliveryByVendor[vendorId] = round2(base + express);
  }

  const discount = round2(discounts.reduce((a, b) => a + b, 0));
  const delivery = round2(Object.values(deliveryByVendor).reduce((a, b) => a + b, 0));
  const giftWrap = input.giftWrap ? settings.giftWrapCharge : 0;

  return {
    lines: quoteLines,
    subtotal,
    discount,
    delivery,
    deliveryByVendor,
    giftWrap,
    gstTotal: round2(quoteLines.reduce((a, l) => a + l.gstAmount, 0)),
    total: round2(subtotal - discount + delivery + giftWrap),
    couponError,
  };
}
