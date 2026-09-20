/**
 * Paid orders that can no longer be fulfilled because the boutique was suspended before it shipped — pure and unit-tested. Suspending a boutique hides its
 * products and locks it out of the portal, but orders customers ALREADY paid for stay open; nobody is dispatching them, so an admin must either reinstate the
 * boutique or cancel and refund. An item counts as "waiting" until a courier has actually been booked for that boutique's part of the order.
 */
export const PAID_ORDER_STATES = ["confirmed", "processing", "partially_shipped", "partially_delivered"] as const;
export const NOT_YET_SHIPPED = ["pending", "confirmed"] as const;

export interface WaitingItemRow {
  order_id: string;
  vendor_id: string;
  fulfilment_status: string;
  order_number: string;
  order_status: string;
  placed_at: string | null;
  vendor_name: string;
  vendor_status: string;
}
export interface BookedShipmentRow { order_id: string; vendor_id: string; awb_number: string | null; status: string; is_return: boolean }

export interface WaitingOrder {
  orderId: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  itemCount: number;
  placedAt: string | null;
}

export function ordersWaitingOnSuspendedVendors(items: WaitingItemRow[], shipments: BookedShipmentRow[]): WaitingOrder[] {
  const booked = new Set(shipments.filter((s) => !s.is_return && s.status !== "cancelled" && s.awb_number).map((s) => `${s.order_id}:${s.vendor_id}`));
  const groups = new Map<string, WaitingOrder>();
  for (const i of items) {
    if (i.vendor_status !== "suspended") continue;
    if (!(PAID_ORDER_STATES as readonly string[]).includes(i.order_status)) continue;
    if (!(NOT_YET_SHIPPED as readonly string[]).includes(i.fulfilment_status)) continue;
    if (booked.has(`${i.order_id}:${i.vendor_id}`)) continue;
    const key = `${i.order_id}:${i.vendor_id}`;
    const g = groups.get(key);
    if (g) g.itemCount += 1;
    else groups.set(key, { orderId: i.order_id, orderNumber: i.order_number, vendorId: i.vendor_id, vendorName: i.vendor_name, itemCount: 1, placedAt: i.placed_at });
  }
  // oldest first: the customer who has waited longest is at the top
  return [...groups.values()].sort((a, b) => (a.placedAt ?? "").localeCompare(b.placedAt ?? ""));
}
