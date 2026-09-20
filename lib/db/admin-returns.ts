import { createClient } from "@/lib/db/server";

/** Read with the admin's OWN session, so RLS (is_admin) is the enforcement. */
export const RETURN_STATUSES = ["requested", "approved", "refunded", "rejected", "cancelled"] as const;

export async function listReturnRequests(status: string | undefined) {
  const supabase = await createClient();
  let query = supabase
    .from("return_requests")
    .select(
      `id, status, quantity, reason, details, created_at, order_id, order_item_id,
       order:orders ( order_number ), item:order_items ( product_name ),
       customer:users!return_requests_customer_id_fkey ( full_name, email ), vendor:vendors ( business_name )`,
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (status && (RETURN_STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
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
