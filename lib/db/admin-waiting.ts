import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { NOT_YET_SHIPPED, PAID_ORDER_STATES, ordersWaitingOnSuspendedVendors, type WaitingOrder } from "@/lib/admin/waiting-orders";

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** Paid orders stuck with a suspended boutique. The caller passes the client: the admin's own session on the dashboard (RLS is_admin), the service client inside the suspend action. */
export async function getOrdersWaitingOnSuspendedVendors(client: SupabaseClient<Database>, vendorId?: string): Promise<WaitingOrder[]> {
  let query = client
    .from("order_items")
    .select("order_id, vendor_id, fulfilment_status, vendor:vendors!inner ( business_name, status ), order:orders!inner ( order_number, status, placed_at )")
    .eq("vendor.status", "suspended")
    .in("fulfilment_status", [...NOT_YET_SHIPPED])
    .in("order.status", [...PAID_ORDER_STATES]);
  if (vendorId) query = query.eq("vendor_id", vendorId);
  const { data, error } = await query.limit(500);
  if (error) throw error;

  const items = (data ?? []).map((r) => ({
    order_id: r.order_id, vendor_id: r.vendor_id, fulfilment_status: r.fulfilment_status,
    order_number: one(r.order)?.order_number ?? "", order_status: one(r.order)?.status ?? "", placed_at: one(r.order)?.placed_at ?? null,
    vendor_name: one(r.vendor)?.business_name ?? "Boutique", vendor_status: one(r.vendor)?.status ?? "",
  }));
  if (items.length === 0) return [];

  const { data: shipments, error: shipError } = await client
    .from("shipments")
    .select("order_id, vendor_id, awb_number, status, is_return")
    .in("order_id", Array.from(new Set(items.map((i) => i.order_id))));
  if (shipError) throw shipError;
  return ordersWaitingOnSuspendedVendors(items, shipments ?? []);
}
