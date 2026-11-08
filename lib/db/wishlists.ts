import { createClient } from "@/lib/db/server";

export async function getWishlistProductIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("wishlists").select("product_id").eq("user_id", userId);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.product_id));
}

const WISHLIST_PRODUCT_FIELDS = `
  id, name, slug, short_description, base_price, sale_price, thumbnail_url,
  average_rating, review_count, stock_quantity, is_in_house,
  vendor:vendors ( id, business_name, slug ),
  category:categories ( id, name, slug )
`;

/**
 * Every saved row, with the product attached only while shoppers may see it.
 *
 * Deliberately two queries rather than one embedded `product:products(...)`: the embedded form is filtered by the products
 * SELECT policy, so a saved product that is in review/inactive comes back as `product: null` and the wishlist page used to
 * drop the row entirely — the item silently vanished and the page claimed nothing was saved. Reading the wishlist rows on
 * their own preserves the save (and its product_id, so it can still be removed) even when the product itself is hidden.
 */
export async function getWishlistProducts(userId: string) {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("wishlists")
    .select("product_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const { data: products, error: productError } = await supabase
    .from("products")
    .select(WISHLIST_PRODUCT_FIELDS)
    .eq("status", "active")
    .in("id", rows.map((row) => row.product_id));

  if (productError) throw productError;

  const byId = new Map((products ?? []).map((product) => [product.id, product]));
  return rows.map((row) => ({ ...row, product: byId.get(row.product_id) ?? null }));
}
