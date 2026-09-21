/** Customer-facing names for the coarse order status (orders.status is a rollup of the parcels; see recompute_order_status). */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  created: "Awaiting payment",
  payment_initiated: "Payment in progress",
  payment_verified: "Payment received",
  confirmed: "Confirmed",
  processing: "Being prepared",
  partially_shipped: "Partly shipped",
  shipped: "Shipped",
  partially_delivered: "Partly delivered",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
