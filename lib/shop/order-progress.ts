/** How far an order has come, for the tracking page's stepper and headline. Pure so it can be tested. */

export const ORDER_STEPS = ["Order placed", "Confirmed", "Packed", "On the way", "Delivered"] as const;

export type OrderTone = "waiting" | "progress" | "done" | "cancelled";

export interface OrderProgress {
  /** number of steps fully done (0–5); null when the order was cancelled/refunded */
  completed: number | null;
  tone: OrderTone;
  eyebrow: string;
  headline: string;
  subline: string;
}

// `orders.status` is a coarse rollup (recompute_order_status), so this is the order-level picture; per-boutique detail sits below it on the page.
const COMPLETED: Record<string, number> = {
  created: 0,
  payment_initiated: 0,
  payment_verified: 2,
  confirmed: 2,
  processing: 2,
  partially_shipped: 3,
  shipped: 3,
  partially_delivered: 3,
  delivered: 5,
};

export function describeOrderProgress(status: string): OrderProgress {
  if (status === "cancelled" || status === "refunded") {
    return { completed: null, tone: "cancelled", eyebrow: "Order closed", headline: "This order was cancelled", subline: "Any payment taken is refunded to the original payment method, usually within 5–7 working days." };
  }
  const completed = COMPLETED[status] ?? 0;
  switch (status) {
    case "created":
    case "payment_initiated":
      return { completed, tone: "waiting", eyebrow: "Nearly there", headline: "Your gift is waiting for you", subline: "Your order is saved and the total is locked in. Complete the payment to confirm it — nothing has been charged yet." };
    case "payment_verified":
    case "confirmed":
      return { completed, tone: "progress", eyebrow: "Payment received", headline: "Thank you — we're on it", subline: "Each boutique is now preparing its part of your order." };
    case "processing":
      return { completed, tone: "progress", eyebrow: "In the workshop", headline: "Your gift is being wrapped", subline: "The boutique is packing your gift and will hand it to the courier soon." };
    case "partially_shipped":
      return { completed, tone: "progress", eyebrow: "On its way", headline: "Part of your surprise is on its way", subline: "Boutiques ship separately, so your gifts may arrive on different days." };
    case "shipped":
      return { completed, tone: "progress", eyebrow: "On its way", headline: "Your surprise is on its way", subline: "It has left the boutique and is travelling to you." };
    case "partially_delivered":
      return { completed, tone: "progress", eyebrow: "Arriving", headline: "Part of your order has arrived", subline: "The rest is still on the way." };
    case "delivered":
      return { completed, tone: "done", eyebrow: "Delivered", headline: "It has arrived — enjoy the moment", subline: "We hope it brings a smile. If something isn't right, you can ask for a return below." };
    default:
      return { completed, tone: "progress", eyebrow: "Your order", headline: "We're keeping an eye on your order", subline: "" };
  }
}
