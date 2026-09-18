import { createClient } from "@/lib/db/server";

export async function getWishlistProductIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("wishlists").select("product_id").eq("user_id", userId);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.product_id));
}

const WISHLIST_PRODUCT_SELECT = `
  created_at,
  product:products (
    id, name, slug, short_description, base_price, sale_price, thumbnail_url,
    average_rating, review_count, stock_quantity, is_in_house,
    vendor:vendors ( id, business_name, slug ),
    category:categories ( id, name, slug )
  )
`;

export async function getWishlistProducts(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select(WISHLIST_PRODUCT_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
