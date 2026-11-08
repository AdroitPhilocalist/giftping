import { cache } from "react";
import { createClient } from "@/lib/db/server";

// cache(): the header's "Shop by Type" mega-menu and a /shop/... page may both need the same tree in one request.
export const getActiveProductTypes = cache(async function getActiveProductTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_types")
    .select("id, parent_id, name, slug, sort_order, is_active, description, meta_title, meta_description")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export const getActiveProductAttributes = cache(async function getActiveProductAttributes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_attributes")
    .select("id, product_type_id, key, label, input_type, options, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export async function getProductTypeByPath(path: string[]) {
  const slug = path[path.length - 1];
  if (!slug) return null;
  const types = await getActiveProductTypes();
  return types.find((t) => t.slug === slug) ?? null;
}
