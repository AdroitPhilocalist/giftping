/**
 * Maps Shiprocket's courier status strings to the shipment statuses this app stores. Pure (no env/IO) and unit-tested.
 * Unknown / exceptional statuses map to null: the raw status is still recorded on the timeline, but the shipment's own
 * status is left alone rather than guessed. (The SQL function also refuses to move a status backwards.)
 */
export type ShipmentStatus =
  | "pending"
  | "confirmed"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "rto_initiated"
  | "cancelled";

const CONFIRMED = new Set([
  "NEW", "INVOICED", "READY TO SHIP", "PICKUP SCHEDULED", "PICKUP GENERATED", "PICKUP QUEUED",
  "AWB ASSIGNED", "MANIFEST GENERATED", "OUT FOR PICKUP",
]);
const IN_TRANSIT = new Set([
  "IN TRANSIT", "SHIPPED", "REACHED AT DESTINATION HUB", "REACHED DESTINATION HUB", "MISROUTED",
  "UNDELIVERED", "DELAYED", "IN TRANSIT-AT DESTINATION HUB",
]);

export function normaliseRawStatus(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toUpperCase() : "";
}

export function mapShiprocketStatus(raw: unknown): ShipmentStatus | null {
  const s = normaliseRawStatus(raw);
  if (!s) return null;
  if (s === "DELIVERED") return "delivered";
  if (s === "OUT FOR DELIVERY") return "out_for_delivery";
  if (s === "PICKED UP") return "picked_up";
  if (s.startsWith("RTO")) return "rto_initiated"; // RTO INITIATED / IN TRANSIT / DELIVERED …: it's coming back
  if (s === "CANCELED" || s === "CANCELLED") return "cancelled";
  if (IN_TRANSIT.has(s)) return "in_transit";
  if (CONFIRMED.has(s)) return "confirmed";
  return null;
}

export const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Preparing",
  confirmed: "Courier booked",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rto_initiated: "Returning to seller",
  cancelled: "Cancelled",
};
