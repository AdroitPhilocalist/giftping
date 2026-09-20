import { describe, expect, it } from "vitest";
import { couponSchema } from "../validation/coupon.schema";
import { couponStatus, describeCoupon, endOfDayIST, istDate, startOfDayIST, type CouponLike } from "./coupons";

const base: CouponLike = { discount_type: "percentage", discount_value: 10, min_order_amount: 0, max_discount_amount: null, usage_limit: null, used_count: 0, is_active: true, valid_from: "2026-09-01T00:00:00+05:30", valid_until: null };
const now = new Date("2026-09-20T12:00:00+05:30");

describe("couponStatus", () => {
  it("active / paused / scheduled / expired / exhausted", () => {
    expect(couponStatus(base, now)).toBe("active");
    expect(couponStatus({ ...base, is_active: false }, now)).toBe("paused");
    expect(couponStatus({ ...base, valid_from: "2026-10-01T00:00:00+05:30" }, now)).toBe("scheduled");
    expect(couponStatus({ ...base, valid_until: "2026-09-19T23:59:59+05:30" }, now)).toBe("expired");
    expect(couponStatus({ ...base, usage_limit: 5, used_count: 5 }, now)).toBe("exhausted");
    expect(couponStatus({ ...base, usage_limit: 5, used_count: 4 }, now)).toBe("active");
  });
  it("paused wins over everything; the last day is inclusive", () => {
    expect(couponStatus({ ...base, is_active: false, valid_until: "2026-01-01T00:00:00+05:30" }, now)).toBe("paused");
    expect(couponStatus({ ...base, valid_until: endOfDayIST("2026-09-20") }, now)).toBe("active");
  });
});

describe("describeCoupon", () => {
  it("says what it does in plain words", () => {
    expect(describeCoupon({ ...base, discount_value: 10, max_discount_amount: 1000, min_order_amount: 500 })).toBe("10% off, up to ₹1,000 on orders over ₹500");
    expect(describeCoupon({ ...base, discount_type: "fixed", discount_value: 250 })).toBe("₹250 off");
    expect(describeCoupon({ ...base, discount_type: "fixed", discount_value: "99.5" })).toBe("₹99.50 off");
  });
});

describe("IST day boundaries", () => {
  it("round-trips a calendar day", () => {
    expect(istDate(startOfDayIST("2026-10-05"))).toBe("2026-10-05");
    expect(istDate(endOfDayIST("2026-10-05"))).toBe("2026-10-05");
    expect(istDate(null)).toBe("");
  });
});

describe("couponSchema", () => {
  const ok = { code: "welcome10", discountType: "percentage", discountValue: "10" };
  it("uppercases the code and applies sensible defaults", () => {
    const r = couponSchema.parse(ok);
    expect(r).toMatchObject({ code: "WELCOME10", discountValue: 10, minOrderAmount: 0, perUserLimit: 1, maxDiscountAmount: null, usageLimit: null, vendorId: null, isActive: true });
  });
  it("rejects bad codes, >100%, a cap on a fixed coupon, and a backwards date range", () => {
    expect(couponSchema.safeParse({ ...ok, code: "a b" }).success).toBe(false);
    expect(couponSchema.safeParse({ ...ok, code: "AB" }).success).toBe(false);
    expect(couponSchema.safeParse({ ...ok, discountValue: 150 }).success).toBe(false);
    expect(couponSchema.safeParse({ ...ok, discountType: "fixed", discountValue: 100, maxDiscountAmount: 50 }).success).toBe(false);
    expect(couponSchema.safeParse({ ...ok, validFrom: "2026-10-10", validUntil: "2026-10-01" }).success).toBe(false);
    expect(couponSchema.safeParse({ ...ok, validFrom: "2026-10-01", validUntil: "2026-10-10" }).success).toBe(true);
  });
  it("blank optional fields become null; a fixed coupon may exceed 100", () => {
    const r = couponSchema.parse({ ...ok, discountType: "fixed", discountValue: 500, maxDiscountAmount: "", usageLimit: "", validFrom: "", vendorId: "" });
    expect(r).toMatchObject({ discountValue: 500, maxDiscountAmount: null, usageLimit: null, validFrom: null, vendorId: null });
  });
});
