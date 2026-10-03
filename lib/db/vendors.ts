import { cache } from "react";
import { createClient } from "@/lib/db/server";
import { worldOrClause, type WorldTag } from "@/lib/catalog/tags";

export async function getApprovedVendors() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("status", "approved")
    .order("is_featured", { ascending: false })
    .order("business_name");

  if (error) throw error;
  return data;
}

// cache(): the navbar's Boutiques mega-menu and the homepage's vendor showcase both ask for this in the
// same request — memoize so it only runs once (same pattern as getServerUser/getActiveTheme).
export const getFeaturedVendors = cache(async function getFeaturedVendors(limit = 6) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("status", "approved")
    .eq("is_featured", true)
    .order("business_name")
    .limit(limit);

  if (error) throw error;
  return data;
});

/** Distinct vendors with at least one active product in the given category — used to populate
 * the vendor filter chips/dropdown on a category page without listing irrelevant vendors. */
export async function getVendorsForCategory(categoryId: string, world?: WorldTag | null) {
  const supabase = await createClient();
  const base = supabase
    .from("products")
    .select("vendor:vendors!inner( id, business_name, slug )")
    .eq("status", "active")
    .eq("vendor.status", "approved");
  const { data, error } = await (world ? base.or(worldOrClause(categoryId, world)) : base.eq("category_id", categoryId));

  if (error) throw error;

  const seen = new Map<string, { id: string; business_name: string; slug: string }>();
  for (const row of data ?? []) {
    const vendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor;
    if (vendor) seen.set(vendor.slug, vendor);
  }
  return Array.from(seen.values()).sort((a, b) => a.business_name.localeCompare(b.business_name));
}

export const getVendorBySlug = cache(async function getVendorBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (error) throw error;
  return data;
});
