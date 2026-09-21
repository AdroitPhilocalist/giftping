import { createClient } from "@/lib/db/server";

const ORDER_SELECT = `
  id, order_number, status, created_at, placed_at, delivery_address, gift_message, gift_wrap_selected, gift_wrap_style, gift_wrap_charge,
  subtotal, discount_amount, delivery_charge, gst_amount, total_amount, coupon_code,
  items:order_items (
    id, product_id, vendor_id, product_name, product_image, variant_label, personalization, quantity,
    unit_price, total_price, discount_amount, refunded_amount, returned_quantity,
    fulfilment_status,
    vendor:vendors ( business_name, slug )
  ),
  shipments (
    id, vendor_id, status, awb_number, courier_name, tracking_url, estimated_delivery, is_return, delivered_at,
    events:shipment_events ( id, raw_status, activity, location, occurred_at )
  ),
  return_requests ( id, order_item_id, quantity, reason, status, decision_note, created_at ),
  refunds ( id, order_item_id, amount, status, processed_at )
`;

/** Read under the shopper's session: RLS returns the order only to its customer (or the vendor/admin involved). */
export async function getMyOrder(orderId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .eq("customer_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const ORDER_LIST_SELECT = `
  id, order_number, status, created_at, total_amount,
  items:order_items ( id, product_name, product_image, quantity )
`;

/** The shopper's orders, newest first, with just enough per order for a list card. RLS + the explicit customer filter: only their own. */
export async function listMyOrders(userId: string, page = 1, pageSize = 8) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from("orders")
    .select(ORDER_LIST_SELECT, { count: "exact" })
    .eq("customer_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { orders: data ?? [], total: count ?? 0, totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)) };
}
