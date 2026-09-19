import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { parseTrackingPayload } from "@/lib/integrations/shiprocket-webhook";
import { SHIPMENT_STATUS_LABEL } from "@/lib/integrations/shiprocket-status";

export interface TrackingOutcome {
  result: string;
  notified: boolean;
}

/** Statuses worth a customer notification (not every hub scan). */
const NOTIFY: Record<string, (vendor: string, order: string) => string> = {
  picked_up: (v, o) => `${v} has handed over order ${o} to the courier — it's on its way.`,
  out_for_delivery: (v, o) => `Your items from ${v} (order ${o}) are out for delivery today.`,
  delivered: (v, o) => `Your items from ${v} (order ${o}) were delivered. We hope they bring a smile!`,
  rto_initiated: (v, o) => `The courier couldn't deliver your items from ${v} (order ${o}) and they're returning to the seller. We'll be in touch.`,
};

/**
 * Applies one courier tracking webhook body: parse -> apply_shipment_update() (atomic, idempotent, monotonic) -> notify
 * the customer only when the shipment's status really changed. Unknown AWBs are answered "ok" (the next delivery carries the
 * full scan history, so nothing is lost if this one raced ahead of us saving the AWB).
 */
export async function applyTrackingWebhook(body: unknown): Promise<TrackingOutcome> {
  const parsed = parseTrackingPayload(body);
  if (!parsed) return { result: "ignored:no_awb", notified: false };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("apply_shipment_update", {
    p_awb: parsed.awb,
    // NULL is meaningful to the function ("record the scan, don't touch the status"); the generated arg types just can't say so.
    p_new_status: parsed.status as string,
    p_raw_status: parsed.rawStatus,
    p_etd: parsed.etd as string,
    p_events: parsed.events as never,
  });
  if (error) throw error;

  const r = data as { result: string; order_id?: string; vendor_id?: string; new_status?: string } | null;
  if (!r) throw new Error("apply_shipment_update returned nothing");
  if (r.result !== "updated" || !r.order_id || !r.vendor_id || !r.new_status) return { result: r.result, notified: false };

  const template = NOTIFY[r.new_status];
  if (!template) return { result: r.result, notified: false };

  const [{ data: order }, { data: vendor }] = await Promise.all([
    admin.from("orders").select("order_number, customer_id").eq("id", r.order_id).single(),
    admin.from("vendors").select("business_name, user_id").eq("id", r.vendor_id).single(),
  ]);
  if (!order || !vendor) return { result: r.result, notified: false };

  await admin.from("notifications").insert({
    user_id: order.customer_id,
    title: SHIPMENT_STATUS_LABEL[r.new_status] ?? "Shipment update",
    message: template(vendor.business_name, order.order_number),
    type: "shipment_update",
    link_url: `/orders/${r.order_id}`,
  });
  if (r.new_status === "rto_initiated" && vendor.user_id) {
    await admin.from("notifications").insert({
      user_id: vendor.user_id,
      title: "Shipment returning to you",
      message: `Order ${order.order_number} couldn't be delivered and is coming back to your warehouse.`,
      type: "shipment_rto",
      link_url: "/vendor/orders",
    });
  }
  return { result: r.result, notified: true };
}
