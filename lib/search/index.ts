import { createClient } from "@/lib/db/server";

const PRODUCT_CARD_SELECT = `
  id, name, slug, short_description, base_price, sale_price, thumbnail_url,
  average_rating, review_count, stock_quantity, is_in_house, occasion_tags, recipient_tags,
  vendor:vendors ( id, business_name, slug, is_featured ),
  category:categories ( id, name, slug )
`;

/**
 * Wraps the search_products() Postgres RPC (Stage 1) behind this module so swapping the
 * implementation for Algolia later only touches this file, not call sites. The RPC returns
 * raw, rank-ordered product rows without joins; this re-fetches the matched ids with the same
 * vendor/category join every product card needs, then restores the RPC's rank order (a plain
 * `.in()` filter does not preserve input-array order).
 */
export async function searchProducts(query: string, limit = 24) {
  const supabase = await createClient();
  const { data: ranked, error: rankError } = await supabase.rpc("search_products", {
    search_query: query,
  });

  if (rankError) throw rankError;
  if (!ranked || ranked.length === 0) return [];

  const orderedIds = ranked.slice(0, limit).map((row) => row.id);

  const { data: cards, error: cardError } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .in("id", orderedIds);

  if (cardError) throw cardError;

  const cardById = new Map((cards ?? []).map((card) => [card.id, card]));
  return orderedIds.map((id) => cardById.get(id)).filter((card) => card !== undefined);
}
