import { createClient } from "@/lib/db/server";

export async function getActiveCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getFeaturedCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getCategoryBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}
