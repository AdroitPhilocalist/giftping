import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { requireRole, type SessionUser } from "@/lib/auth/session";

/** The signed-in user's own vendor profile (plus its private details — RLS only returns them to the owner/admin). */
export const getMyVendor = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*, details:vendor_private(*)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
});

export type MyVendor = NonNullable<Awaited<ReturnType<typeof getMyVendor>>>;

/**
 * Gate for every page inside the vendor portal: must be role vendor/admin AND have an approved vendor
 * profile. Someone with the role but no profile (or a pending/rejected one) is sent to the application page.
 */
export async function requireApprovedVendor(): Promise<{ user: SessionUser; vendor: MyVendor }> {
  const user = await requireRole("vendor", "admin");
  const vendor = await getMyVendor(user.id);

  if (!vendor || vendor.status !== "approved") {
    redirect("/vendor/register");
  }
  return { user, vendor };
}

export async function getVendorProducts(vendorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, base_price, sale_price, stock_quantity, status, rejection_reason, thumbnail_url, category:categories(name), updated_at")
    .eq("vendor_id", vendorId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getVendorProduct(vendorId: string, productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, images:product_images(id, url, thumb_url, medium_url, alt_text, sort_order, is_primary), variants:product_variants(id, name, value, price_adjustment, stock_quantity, is_active)",
    )
    .eq("id", productId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getVendorProductCounts(vendorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("status, stock_quantity").eq("vendor_id", vendorId);
  if (error) throw error;

  const rows = data ?? [];
  const counts = { total: rows.length, pending: 0, active: 0, inactive: 0, rejected: 0, lowStock: 0 };
  for (const row of rows) {
    if (row.status === "pending" || row.status === "approved") counts.pending += 1;
    else if (row.status === "active") counts.active += 1;
    else if (row.status === "inactive") counts.inactive += 1;
    else if (row.status === "rejected") counts.rejected += 1;
    if (row.status === "active" && row.stock_quantity <= 5) counts.lowStock += 1;
  }
  return counts;
}

export async function getVendorOrderItems(vendorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("id, product_name, quantity, total_price, fulfilment_status, created_at, order:orders(order_number, status, placed_at)")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function getActiveCategoryOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return data ?? [];
}
