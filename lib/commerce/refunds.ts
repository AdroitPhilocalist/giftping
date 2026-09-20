/**
 * Refund maths — pure and unit-tested. The DATABASE is the authority (begin_refund / complete_refund enforce every cap and apply the
 * vendor/commission split atomically); these helpers exist so the UI can suggest amounts and preview the impact, and so the rules
 * are written down once and tested. All money is handled in whole paise internally to avoid float drift.
 *
 * Rules:
 *  - A line can never be refunded for more than the customer PAID for it (price × qty minus its share of any coupon).
 *    Delivery and gift-wrap charges are only ever returned by cancelling the whole order before it ships.
 *  - The vendor's payout and GiftPing's commission on the line shrink in the same proportion as the refund, so a 40% refund
 *    costs the vendor 40% of what they earned and GiftPing gives back 40% of its commission.
 */
const toPaise = (rupees: number | string) => Math.round(Number(rupees) * 100);
const toRupees = (paise: number) => paise / 100;

export interface LineMoney {
  /** total_price − discount_amount: what the customer actually paid for this line */
  paid: number | string;
  /** already refunded (processed) plus reserved by pending refunds */
  alreadyRefunded: number | string;
}

/** How much more can still be refunded on a line. Never negative. */
export function refundableRemaining(line: LineMoney): number {
  return toRupees(Math.max(0, toPaise(line.paid) - toPaise(line.alreadyRefunded)));
}

/**
 * The amount to pre-fill when returning `returnQty` of `quantity` units: their proportional share of what was paid, and the whole
 * remainder when this return takes the last of the units (so rounding never leaves a stray paisa behind).
 */
export function suggestRefundAmount(args: { paid: number | string; quantity: number; returnQty: number; alreadyRefunded: number | string; alreadyReturnedQty: number }): number {
  const paid = toPaise(args.paid);
  const remaining = Math.max(0, paid - toPaise(args.alreadyRefunded));
  if (args.returnQty <= 0 || args.quantity <= 0) return 0;
  if (args.alreadyReturnedQty + args.returnQty >= args.quantity) return toRupees(remaining);
  return toRupees(Math.min(remaining, Math.round((paid * args.returnQty) / args.quantity)));
}

/**
 * Cumulative reduction of commission and vendor payout once `cumulativeRefunded` of `paid` has been refunded. Cumulative (not per-refund) on
 * purpose: several partial refunds add up to exactly the full amounts when the line is refunded in full, with no rounding drift.
 */
export function refundShare(args: { commission: number | string; payout: number | string; paid: number | string; cumulativeRefunded: number | string }): { commission: number; payout: number } {
  const paid = toPaise(args.paid);
  if (paid <= 0) return { commission: 0, payout: 0 };
  const ratio = Math.min(1, Math.max(0, toPaise(args.cumulativeRefunded) / paid));
  return {
    commission: toRupees(Math.round(toPaise(args.commission) * ratio)),
    payout: toRupees(Math.round(toPaise(args.payout) * ratio)),
  };
}

/** Can a customer still ask to return something delivered at `deliveredAt`? The window is counted from the delivery scan. */
export function returnWindow(args: { deliveredAt: string | Date | null; windowDays: number; now?: Date }): { open: boolean; closesAt: Date | null } {
  if (!args.deliveredAt) return { open: false, closesAt: null };
  const closesAt = new Date(new Date(args.deliveredAt).getTime() + args.windowDays * 86_400_000);
  return { open: (args.now ?? new Date()) <= closesAt, closesAt };
}

export const RETURN_REASONS = {
  damaged: "Arrived damaged",
  wrong_item: "Wrong item received",
  not_as_described: "Not as described",
  quality: "Quality problem",
  changed_mind: "Changed my mind",
  other: "Something else",
} as const;
export type ReturnReason = keyof typeof RETURN_REASONS;
export const RETURN_REASON_KEYS = Object.keys(RETURN_REASONS) as [ReturnReason, ...ReturnReason[]];
