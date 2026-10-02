import { createClient } from "@/lib/db/server";
import { fetchAllRows } from "@/lib/db/paginate";
import { PAID_ORDER_STATUSES } from "@/lib/db/admin-stats";
import { summariseCustomers, type MetricsOrder } from "@/lib/admin/customer-metrics";
import { addDays, localDateIn } from "@/lib/diary/recurrence";

const MAX_ORDERS = 50000; // beyond this (orders, or new sign-ups in the window) the figures become a lower bound and the page says so

/** Read with the admin's own session (RLS is_admin) — customer ids and dates only, never names, emails or diary data. */
export async function getCustomerMetrics(days: 7 | 30 | 90) {
  const supabase = await createClient();
  const today = localDateIn("Asia/Kolkata");
  const since = `${addDays(today, -(days - 1))}T00:00:00+05:30`;

  const paid = await fetchAllRows(
    (a, b) =>
      supabase
        .from("orders")
        .select("customer_id, placed_at")
        .in("status", PAID_ORDER_STATUSES)
        .order("placed_at", { ascending: true })
        .order("id", { ascending: true }) // a tiebreaker, so pages never skip or repeat rows that share a timestamp
        .range(a, b),
    { maxRows: MAX_ORDERS },
  );
  const orders: MetricsOrder[] = [];
  for (const o of paid.rows) if (o.placed_at) orders.push({ customer_id: o.customer_id, placed_at: o.placed_at });

  const [total, recent] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "customer"),
    fetchAllRows((a, b) => supabase.from("users").select("id, created_at").eq("role", "customer").gte("created_at", since).order("created_at", { ascending: true }).order("id", { ascending: true }).range(a, b), { maxRows: MAX_ORDERS }),
  ]);
  if (total.error) throw total.error;
  const recentRows = recent.rows;

  return {
    ...summariseCustomers(recentRows, orders, { days, today }, Math.max(0, (total.count ?? 0) - recentRows.length)),
    truncated: paid.truncated || recent.truncated,
  };
}
