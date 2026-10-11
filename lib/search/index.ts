import { createClient } from "@/lib/db/server";

const PRODUCT_CARD_SELECT = `
  id, name, slug, short_description, base_price, sale_price, thumbnail_url,
  average_rating, review_count, stock_quantity, is_in_house, occasion_tags, recipient_tags,
  vendor:vendors ( id, business_name, slug, is_featured ),
  category:categories ( id, name, slug )
`;

/** Escape LIKE wildcards so a typed "%" or "_" is searched for literally instead of matching everything. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, "\\$&");

async function fetchRanked(rpc: "search_products" | "search_products_fuzzy", params: { search_query: string; match_limit?: number }, limit: number) {
  const supabase = await createClient();
  const { data: ranked, error } = await supabase.rpc(rpc, params);
  if (error) throw error;
  if (!ranked || ranked.length === 0) return [];

  const orderedIds = ranked.slice(0, limit).map((row) => row.id);
  const { data: cards, error: cardError } = await supabase.from("products").select(PRODUCT_CARD_SELECT).in("id", orderedIds);
  if (cardError) throw cardError;

  const cardById = new Map((cards ?? []).map((card) => [card.id, card]));
  return orderedIds.map((id) => cardById.get(id)).filter((card) => card !== undefined);
}

export interface SearchResult {
  products: Awaited<ReturnType<typeof fetchRanked>>;
  /** true when the exact (synonym-expanded) search found nothing and these are trigram-similarity "close match" results instead */
  fuzzy: boolean;
}

/**
 * Wraps the search_products() Postgres RPC (Stage 1, since Stage 13 also expanded via search_synonyms — see
 * that migration) behind this module so swapping the implementation for Algolia later only touches this file,
 * not call sites. The RPC returns raw, rank-ordered product rows without joins; this re-fetches the matched ids
 * with the same vendor/category join every product card needs, then restores the RPC's rank order (a plain
 * `.in()` filter does not preserve input-array order).
 *
 * When the exact search returns nothing, falls back to search_products_fuzzy() (trigram similarity on the
 * product name) so a typo like "hampr" still finds "hamper" products — flagged via `fuzzy: true` so the page
 * can tell the visitor these are close matches, not exact ones.
 */
export async function searchProducts(query: string, limit = 24): Promise<SearchResult> {
  const exact = await fetchRanked("search_products", { search_query: query }, limit);
  if (exact.length > 0) return { products: exact, fuzzy: false };

  const fuzzy = await fetchRanked("search_products_fuzzy", { search_query: query, match_limit: limit }, limit);
  return { products: fuzzy, fuzzy: fuzzy.length > 0 };
}

export interface RelatedBrowseLink {
  name: string;
  slug: string;
}

/**
 * When a search finds no products at all (not even a fuzzy match), offer somewhere else to go instead of a dead
 * end: categories or boutiques whose name contains what was typed. Same ILIKE approach lib/search/suggestions.ts
 * already uses for the live dropdown, reused here for the submitted-search no-results case.
 */
export async function getRelatedBrowseLinks(query: string): Promise<{ categories: RelatedBrowseLink[]; vendors: RelatedBrowseLink[] }> {
  const supabase = await createClient();
  const like = `%${likeEscape(query)}%`;
  const [categories, vendors] = await Promise.all([
    supabase.from("categories").select("name, slug").eq("is_active", true).ilike("name", like).order("sort_order").limit(4),
    supabase.from("vendors").select("business_name, slug").eq("status", "approved").ilike("business_name", like).order("business_name").limit(4),
  ]);
  if (categories.error) throw categories.error;
  if (vendors.error) throw vendors.error;
  return {
    categories: (categories.data ?? []).map((c) => ({ name: c.name, slug: c.slug })),
    vendors: (vendors.data ?? []).map((v) => ({ name: v.business_name, slug: v.slug })),
  };
}
