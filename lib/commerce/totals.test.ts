import { describe, expect, it } from "vitest";
import {
  allocateProportionally,
  computeCouponDiscount,
  computeQuote,
  type CouponRule,
  type QuoteLineInput,
  type QuoteSettings,
} from "./totals";

const settings: QuoteSettings = { deliveryCharge: 79, freeDeliveryThreshold: 999, giftWrapCharge: 49, expressSurcharge: 99 };
const line = (over: Partial<QuoteLineInput> = {}): QuoteLineInput => ({
  key: "a",
  vendorId: "v1",
  categoryId: "c1",
  unitPrice: 1000,
  quantity: 1,
  gstRate: 18,
  commissionRate: 10,
  ...over,
});
const coupon = (over: Partial<CouponRule> = {}): CouponRule => ({
  id: "k1",
  code: "SAVE",
  discountType: "percentage",
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscountAmount: null,
  vendorId: null,
  categoryId: null,
  ...over,
});

describe("allocateProportionally", () => {
  it("always sums exactly to the total", () => {
    const parts = allocateProportionally(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
    expect(parts).toEqual([33.34, 33.33, 33.33]);
  });
  it("is proportional", () => {
    expect(allocateProportionally(30, [100, 200])).toEqual([10, 20]);
  });
  it("handles zero", () => {
    expect(allocateProportionally(0, [5, 5])).toEqual([0, 0]);
    expect(allocateProportionally(10, [])).toEqual([]);
  });
});

describe("computeCouponDiscount", () => {
  it("percentage, capped", () => {
    expect(computeCouponDiscount(coupon({ discountValue: 20, maxDiscountAmount: 150 }), 1000)).toBe(150);
  });
  it("fixed never exceeds the eligible subtotal", () => {
    expect(computeCouponDiscount(coupon({ discountType: "fixed", discountValue: 500 }), 300)).toBe(300);
  });
});

describe("computeQuote — plain cart", () => {
  it("totals, free delivery over the threshold, GST extracted not added", () => {
    const q = computeQuote({ lines: [line({ quantity: 2 })], coupon: null, giftWrap: false, settings });
    expect(q.subtotal).toBe(2000);
    expect(q.delivery).toBe(0);
    expect(q.total).toBe(2000);
    expect(q.gstTotal).toBe(305.08); // 2000 * 18 / 118
  });
  it("charges delivery per vendor shipment below the threshold", () => {
    const q = computeQuote({
      lines: [line({ key: "a", vendorId: "v1", unitPrice: 500 }), line({ key: "b", vendorId: "v2", unitPrice: 300 })],
      coupon: null,
      giftWrap: false,
      settings,
    });
    expect(q.deliveryByVendor).toEqual({ v1: 79, v2: 79 });
    expect(q.total).toBe(800 + 158);
  });
  it("adds gift wrap", () => {
    const q = computeQuote({ lines: [line()], coupon: null, giftWrap: true, settings });
    expect(q.total).toBe(1000 + 49);
  });
  it("charges the Express surcharge on top of the normal delivery charge", () => {
    const q = computeQuote({ lines: [line({ unitPrice: 500 })], coupon: null, giftWrap: false, settings, expressVendorIds: new Set(["v1"]) });
    expect(q.deliveryByVendor).toEqual({ v1: 79 + 99 });
  });
  it("Express still costs the surcharge even when the shipment would otherwise ship free", () => {
    const q = computeQuote({ lines: [line({ unitPrice: 1500 })], coupon: null, giftWrap: false, settings, expressVendorIds: new Set(["v1"]) });
    expect(q.deliveryByVendor).toEqual({ v1: 99 });
  });
  it("Express only applies to the vendor(s) actually selected", () => {
    const q = computeQuote({
      lines: [line({ key: "a", vendorId: "v1", unitPrice: 500 }), line({ key: "b", vendorId: "v2", unitPrice: 500 })],
      coupon: null,
      giftWrap: false,
      settings,
      expressVendorIds: new Set(["v1"]),
    });
    expect(q.deliveryByVendor).toEqual({ v1: 79 + 99, v2: 79 });
  });
  it("defaults to no Express charge when the selection is omitted entirely", () => {
    const q = computeQuote({ lines: [line({ unitPrice: 500 })], coupon: null, giftWrap: false, settings });
    expect(q.deliveryByVendor).toEqual({ v1: 79 });
  });
  it("commission on the full price with no coupon", () => {
    const q = computeQuote({ lines: [line()], coupon: null, giftWrap: false, settings });
    expect(q.lines[0].commissionAmount).toBe(100);
    expect(q.lines[0].vendorPayout).toBe(900);
  });
});

describe("computeQuote — coupons", () => {
  it("platform coupon: platform absorbs the discount, vendor payout unchanged", () => {
    const q = computeQuote({ lines: [line()], coupon: coupon(), giftWrap: false, settings });
    expect(q.discount).toBe(100);
    expect(q.lines[0].net).toBe(900);
    expect(q.lines[0].vendorFundedDiscount).toBe(0);
    expect(q.lines[0].platformFundedDiscount).toBe(100);
    expect(q.lines[0].commissionAmount).toBe(100);
    expect(q.lines[0].vendorPayout).toBe(900);
    expect(q.total).toBe(900 + 79); // 900 < threshold after discount
  });
  it("vendor coupon: vendor funds it, commission base and payout shrink", () => {
    const q = computeQuote({ lines: [line()], coupon: coupon({ vendorId: "v1" }), giftWrap: false, settings });
    expect(q.lines[0].vendorFundedDiscount).toBe(100);
    expect(q.lines[0].commissionBase).toBe(900);
    expect(q.lines[0].commissionAmount).toBe(90);
    expect(q.lines[0].vendorPayout).toBe(810);
  });
  it("vendor-scoped coupon only discounts that vendor's lines", () => {
    const q = computeQuote({
      lines: [line({ key: "a", vendorId: "v1" }), line({ key: "b", vendorId: "v2" })],
      coupon: coupon({ vendorId: "v2" }),
      giftWrap: false,
      settings,
    });
    expect(q.lines.map((l) => l.discount)).toEqual([0, 100]);
  });
  it("category-scoped coupon", () => {
    const q = computeQuote({
      lines: [line({ key: "a", categoryId: "c1" }), line({ key: "b", categoryId: "c2" })],
      coupon: coupon({ categoryId: "c2", discountType: "fixed", discountValue: 250 }),
      giftWrap: false,
      settings,
    });
    expect(q.lines.map((l) => l.discount)).toEqual([0, 250]);
  });
  it("spreads a discount across lines and the parts sum to the whole", () => {
    const q = computeQuote({
      lines: [line({ key: "a", unitPrice: 333 }), line({ key: "b", unitPrice: 333 }), line({ key: "c", unitPrice: 334 })],
      coupon: coupon({ discountType: "fixed", discountValue: 100 }),
      giftWrap: false,
      settings,
    });
    expect(q.lines.reduce((a, l) => a + l.discount, 0)).toBeCloseTo(100, 10);
    expect(q.discount).toBe(100);
  });
  it("rejects a coupon below its minimum order, taking no discount", () => {
    const q = computeQuote({ lines: [line()], coupon: coupon({ minOrderAmount: 1500 }), giftWrap: false, settings });
    expect(q.couponError).toMatch(/500/);
    expect(q.discount).toBe(0);
    expect(q.lines[0].vendorFundedDiscount).toBe(0);
  });
  it("rejects a coupon that matches nothing in the cart", () => {
    const q = computeQuote({ lines: [line()], coupon: coupon({ vendorId: "other" }), giftWrap: false, settings });
    expect(q.couponError).toMatch(/doesn't apply/);
    expect(q.discount).toBe(0);
  });
  it("delivery threshold is judged after the discount", () => {
    const q = computeQuote({
      lines: [line({ unitPrice: 1000 })],
      coupon: coupon({ discountType: "fixed", discountValue: 200 }),
      giftWrap: false,
      settings,
    });
    expect(q.delivery).toBe(79);
  });
  it("total = subtotal - discount + delivery + gift wrap", () => {
    const q = computeQuote({ lines: [line({ unitPrice: 700 })], coupon: coupon(), giftWrap: true, settings });
    expect(q.total).toBe(700 - 70 + 79 + 49);
  });
});
