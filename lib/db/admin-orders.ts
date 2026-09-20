import { createClient } from "@/lib/db/server";

/**
 * Admin order queries run with the ADMIN'S OWN SESSION, so RLS (is_admin()) is the enforcement — not a service-role shortcut.
 * (The diary tables have no admin policy at all, so nothing here can ever read them.)
 */
export const ORDER_STATUSES = [
  "created", "payment_initiated", "confirmed", "processing", "partially_shipped", "shipped", "partially_delivered", "delivered", "cancelled", "refunded",
] as const;

const PAGE_SIZE = 25;

export async function listAdminOrders(args: { status?: string; q?: string; page: number }) {
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, order_number, status, total_amount, created_at, placed_at, coupon_code, customer:users ( full_name, email )", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((args.page - 1) * PAGE_SIZE, args.page * PAGE_SIZE - 1);
  if (args.status && (ORDER_STATUSES as readonly string[]).includes(args.status)) query = query.eq("status", args.status);
  // order numbers are "GP-100028": only letters, digits and dashes are ever put in the pattern
  const q = (args.q ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 20);
  if (q) query = query.ilike("order_number", `%${q}%`);

  const { data, count, error } = await query;
  if (error) throw error;
  return { orders: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE };
}

export async function getAdminOrder(orderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, subtotal, discount_amount, delivery_charge, gift_wrap_charge, gst_amount, total_amount, coupon_code, gift_message,
       delivery_address, notes, placed_at, created_at,
       customer:users ( full_name, email ),
       items:order_items ( id, product_name, variant_label, quantity, unit_price, total_price, discount_amount, fulfilment_status,
         vendor:vendors ( business_name ), financials:order_item_financials ( commission_rate, commission_amount, vendor_payout ) ),
       payments ( id, status, amount, payment_method, razorpay_payment_id, refund_id, refund_reason, failure_reason, captured_at, refunded_at ),
       shipments ( id, status, awb_number, courier_name, tracking_url, is_return, vendor:vendors ( business_name ),
         events:shipment_events ( id, raw_status, activity, location, occurred_at ) )`,
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
