import { describe, expect, it } from "vitest";
import { ordersWaitingOnSuspendedVendors, type BookedShipmentRow, type WaitingItemRow } from "./waiting-orders";

const item = (over: Partial<WaitingItemRow> = {}): WaitingItemRow => ({
  order_id: "o1", vendor_id: "v1", fulfilment_status: "pending", order_number: "GP-1", order_status: "confirmed", placed_at: "2026-09-10T10:00:00Z", vendor_name: "Aurelia", vendor_status: "suspended", ...over,
});
const ship = (over: Partial<BookedShipmentRow> = {}): BookedShipmentRow => ({ order_id: "o1", vendor_id: "v1", awb_number: "AWB1", status: "confirmed", is_return: false, ...over });

describe("ordersWaitingOnSuspendedVendors", () => {
  it("flags a paid order whose suspended boutique hasn't shipped, counting its items once per order", () => {
    const r = ordersWaitingOnSuspendedVendors([item(), item({ fulfilment_status: "confirmed" })], []);
    expect(r).toEqual([{ orderId: "o1", orderNumber: "GP-1", vendorId: "v1", vendorName: "Aurelia", itemCount: 2, placedAt: "2026-09-10T10:00:00Z" }]);
  });
  it("ignores boutiques that aren't suspended", () => {
    expect(ordersWaitingOnSuspendedVendors([item({ vendor_status: "approved" })], [])).toEqual([]);
  });
  it("ignores unpaid, cancelled and refunded orders", () => {
    for (const status of ["created", "payment_initiated", "cancelled", "refunded"]) expect(ordersWaitingOnSuspendedVendors([item({ order_status: status })], []), status).toEqual([]);
  });
  it("ignores items already shipped, delivered, cancelled or returned", () => {
    for (const status of ["shipped", "delivered", "cancelled", "returned", "return_requested"]) expect(ordersWaitingOnSuspendedVendors([item({ fulfilment_status: status })], []), status).toEqual([]);
  });
  it("stops flagging once a courier is booked for THAT boutique's part", () => {
    expect(ordersWaitingOnSuspendedVendors([item()], [ship()])).toEqual([]);
    expect(ordersWaitingOnSuspendedVendors([item()], [ship({ vendor_id: "v2" })])).toHaveLength(1); // another boutique's shipment doesn't count
    expect(ordersWaitingOnSuspendedVendors([item()], [ship({ status: "cancelled" })])).toHaveLength(1); // a cancelled booking isn't a booking
    expect(ordersWaitingOnSuspendedVendors([item()], [ship({ awb_number: null })])).toHaveLength(1); // claimed but no courier yet
    expect(ordersWaitingOnSuspendedVendors([item()], [ship({ is_return: true })])).toHaveLength(1);
  });
  it("lists each order+boutique separately, oldest order first", () => {
    const r = ordersWaitingOnSuspendedVendors([
      item({ order_id: "new", order_number: "GP-9", placed_at: "2026-09-19T00:00:00Z" }),
      item({ order_id: "old", order_number: "GP-2", placed_at: "2026-09-01T00:00:00Z" }),
      item({ order_id: "old", order_number: "GP-2", vendor_id: "v2", vendor_name: "Other", placed_at: "2026-09-01T00:00:00Z" }),
    ], []);
    expect(r.map((x) => `${x.orderNumber}/${x.vendorName}`)).toEqual(["GP-2/Aurelia", "GP-2/Other", "GP-9/Aurelia"]);
  });
});
