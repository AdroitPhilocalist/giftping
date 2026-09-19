import { createClient } from "@/lib/db/server";

const ORDER_SELECT = `
  id, order_number, status, created_at, placed_at, delivery_address, gift_message, gift_wrap_selected, gift_wrap_charge,
  subtotal, discount_amount, delivery_charge, gst_amount, total_amount, coupon_code,
  items:order_items (
    id, product_id, vendor_id, product_name, product_image, variant_label, personalization, quantity,
    unit_price, total_price, discount_amount,
    fulfilment_status,
    vendor:vendors ( business_name, slug )
  ),
  shipments (
    id, vendor_id, status, awb_number, courier_name, tracking_url, estimated_delivery, is_return,
    events:shipment_events ( id, raw_status, activity, location, occurred_at )
  )
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
