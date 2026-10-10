import { createClient } from "@/lib/db/server";

/** Read with the admin's OWN session, so RLS (is_admin) is the enforcement. */
export const RETURN_STATUSES = ["requested", "approved", "refunded", "rejected", "cancelled"] as const;

export async function listReturnRequests(status: string | undefined) {
  const supabase = await createClient();
  let query = supabase
    .from("return_requests")
    .select(
      `id, status, quantity, reason, details, created_at, order_id, order_item_id, vendor_id,
       order:orders ( order_number ), item:order_items ( product_name ),
       customer:users!return_requests_customer_id_fkey ( full_name, email ), vendor:vendors ( business_name )`,
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (status && (RETURN_STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  const requests = data ?? [];

  // The reverse-pickup shipment for an approved return (if any has been booked) — matched by (order_id, vendor_id),
  // same as a forward shipment, just is_return = true.
  const approvedOrderVendorPairs = requests.filter((r) => r.status === "approved" || r.status === "refunded");
  const orderIds = Array.from(new Set(approvedOrderVendorPairs.map((r) => r.order_id)));
  const { data: returnShipments } = orderIds.length
    ? await supabase.from("shipments").select("order_id, vendor_id, status, awb_number, courier_name, tracking_url").eq("is_return", true).neq("status", "cancelled").in("order_id", orderIds)
    : { data: [] };
  const shipmentByPair = new Map((returnShipments ?? []).map((s) => [`${s.order_id}:${s.vendor_id}`, s]));

  return requests.map((r) => ({ ...r, returnShipment: shipmentByPair.get(`${r.order_id}:${r.vendor_id}`) ?? null }));
}

export async function listUnfinishedRefunds() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("refunds")
    .select("id, amount, status, reason, failure_reason, created_at, order_id, order:orders ( order_number ), item:order_items ( product_name )")
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
