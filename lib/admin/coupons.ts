/** Pure coupon presentation rules (unit-tested): what state a coupon is in right now, and how to say what it does. */
export interface CouponLike {
  discount_type: string;
  discount_value: number | string;
  min_order_amount: number | string;
  max_discount_amount: number | string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
}

export type CouponStatus = "active" | "paused" | "scheduled" | "expired" | "exhausted";

export function couponStatus(c: CouponLike, now: Date = new Date()): CouponStatus {
  if (!c.is_active) return "paused";
  if (new Date(c.valid_from).getTime() > now.getTime()) return "scheduled";
  if (c.valid_until && new Date(c.valid_until).getTime() < now.getTime()) return "expired";
  if (c.usage_limit !== null && c.used_count >= c.usage_limit) return "exhausted";
  return "active";
}

const rupees = (n: number) => `₹${Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toFixed(2)}`;

export function describeCoupon(c: CouponLike): string {
  const value = Number(c.discount_value);
  const head = c.discount_type === "percentage" ? `${value}% off` : `${rupees(value)} off`;
  const cap = c.discount_type === "percentage" && c.max_discount_amount !== null ? `, up to ${rupees(Number(c.max_discount_amount))}` : "";
  const min = Number(c.min_order_amount) > 0 ? ` on orders over ${rupees(Number(c.min_order_amount))}` : "";
  return `${head}${cap}${min}`;
}

const IST = "Asia/Kolkata";
/** "2026-10-05" (IST calendar day) <-> timestamptz. A coupon runs from 00:00 IST on its first day to 23:59:59 IST on its last. */
export const startOfDayIST = (d: string) => `${d}T00:00:00+05:30`;
export const endOfDayIST = (d: string) => `${d}T23:59:59+05:30`;
export const istDate = (iso: string | null): string => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(new Date(iso)) : "");
