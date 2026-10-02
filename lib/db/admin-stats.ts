import { createClient } from "@/lib/db/server";
import { fetchAllRows } from "@/lib/db/paginate";
import { summariseOrders, type StatsOrder } from "@/lib/admin/stats";
import { addDays, localDateIn } from "@/lib/diary/recurrence";
import { getOrdersWaitingOnSuspendedVendors } from "@/lib/db/admin-waiting";

/** The dashboard shows the latest this-many orders in the window and says so when there are more. */
const DASHBOARD_ORDER_CAP = 2000;
/** Refund sums must be complete, so this ceiling is far above any realistic volume; hitting it flags the page as a lower bound. */
const REFUND_ROW_CAP = 50000;

export const PAID_ORDER_STATUSES = ["confirmed", "processing", "partially_shipped", "shipped", "partially_delivered", "delivered"];
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** All read with the admin's own session (RLS is_admin). Diary tables have no admin policy, so nothing here can touch them. */
export async function getAdminDashboard(days: 7 | 30 | 90) {
  const supabase = await createClient();
  const today = localDateIn("Asia/Kolkata");
  const since = `${addDays(today, -(days - 1))}T00:00:00+05:30`;
  const staleBefore = new Date(Date.now() - 48 * 3600e3).toISOString();

  // Paged, not .limit(): PostgREST silently clamps one response to its max-rows setting (1,000 by default).
  const [orders, cancelRefunds, lineRefunds, pendingReturns, unfinishedRefunds, pendingVendors, pendingProducts, lowStock, stuckRefunds, staleUnpaid, newCustomers] = await Promise.all([
    fetchAllRows(
      (a, b) =>
        supabase
          .from("orders")
          .select("id, total_amount, placed_at, items:order_items ( product_id, product_name, vendor_id, quantity, total_price, discount_amount, refunded_amount, vendor:vendors ( business_name ), financials:order_item_financials ( commission_amount, refunded_commission ) )")
          .in("status", PAID_ORDER_STATUSES)
          .gte("placed_at", since)
          .order("placed_at", { ascending: false })
          .order("id", { ascending: false })
          .range(a, b),
      { maxRows: DASHBOARD_ORDER_CAP },
    ),
    // whole-order refunds (cancellations). A payment flipped to "refunded" by line refunds is counted through the refunds table instead.
    fetchAllRows((a, b) => supabase.from("payments").select("amount").eq("status", "refunded").or("refund_reason.is.null,refund_reason.neq.Fully refunded by line refunds").gte("refunded_at", since).order("id", { ascending: true }).range(a, b), { maxRows: REFUND_ROW_CAP }),
    fetchAllRows((a, b) => supabase.from("refunds").select("amount").eq("status", "processed").gte("processed_at", since).order("id", { ascending: true }).range(a, b), { maxRows: REFUND_ROW_CAP }),
    supabase.from("return_requests").select("id", { count: "exact", head: true }).eq("status", "requested"),
    supabase.from("refunds").select("id", { count: "exact", head: true }).in("status", ["pending", "failed"]),
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("products").select("id, name, stock_quantity, vendor:vendors ( business_name )").eq("status", "active").lte("stock_quantity", 5).order("stock_quantity").limit(8),
    // a cancelled order whose payment is still captured = a refund that failed and needs a human
    supabase.from("orders").select("id, order_number, payments!inner ( status )").eq("status", "cancelled").eq("payments.status", "captured"),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["created", "payment_initiated"]).lt("created_at", staleBefore),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "customer").gte("created_at", since),
  ]);
  // a failure here must not take the whole dashboard down
  const waitingOnSuspended = await getOrdersWaitingOnSuspendedVendors(supabase).catch((error) => {
    console.error("Couldn't load orders waiting on suspended vendors", error);
    return [];
  });

  const rows: StatsOrder[] = orders.rows.map((o) => ({
    id: o.id,
    total_amount: o.total_amount,
    placed_at: o.placed_at as string,
    items: o.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      vendor_id: i.vendor_id,
      vendor_name: one(i.vendor)?.business_name ?? "Vendor",
      quantity: i.quantity,
      total_price: i.total_price,
      discount_amount: i.discount_amount,
      commission_amount: Number(one(i.financials)?.commission_amount ?? 0) - Number(one(i.financials)?.refunded_commission ?? 0),
      refunded_amount: i.refunded_amount,
    })),
  }));

  return {
    stats: summariseOrders(rows, { days, today }),
    refundedCount: cancelRefunds.rows.length + lineRefunds.rows.length,
    refundedAmount: [...cancelRefunds.rows, ...lineRefunds.rows].reduce((s, p) => s + Number(p.amount), 0),
    waitingOnSuspended,
    pendingReturns: pendingReturns.count ?? 0,
    unfinishedRefunds: unfinishedRefunds.count ?? 0,
    pendingVendors: pendingVendors.count ?? 0,
    pendingProducts: pendingProducts.count ?? 0,
    lowStock: (lowStock.data ?? []).map((p) => ({ id: p.id, name: p.name, stock: p.stock_quantity, vendor: one(p.vendor)?.business_name ?? "" })),
    stuckRefunds: (stuckRefunds.data ?? []).map((o) => ({ id: o.id, number: o.order_number })),
    staleUnpaid: staleUnpaid.count ?? 0,
    newCustomers: newCustomers.count ?? 0,
    truncated: orders.truncated || cancelRefunds.truncated || lineRefunds.truncated,
  };
}
