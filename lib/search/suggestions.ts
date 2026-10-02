import { createClient } from "@/lib/db/server";
import { EMPTY_SUGGESTIONS, normaliseSuggestQuery, type SuggestResult } from "./suggest";

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
/** Escape LIKE wildcards so a typed "%" or "_" is searched for literally instead of matching everything. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, "\\$&");

/**
 * Search-as-you-type: a few products (prefix-matched through the suggest_product_ids() RPC), plus categories and
 * boutiques whose name contains what was typed. Read with the visitor's own session, so RLS decides visibility the same
 * way it does everywhere else (live products, approved boutiques, active categories) — nothing here is privileged.
 */
export async function getSuggestions(raw: string): Promise<SuggestResult> {
  const q = normaliseSuggestQuery(raw);
  if (!q) return EMPTY_SUGGESTIONS;
  const supabase = await createClient();
  const like = `%${likeEscape(q)}%`;

  const [ids, categories, vendors] = await Promise.all([
    supabase.rpc("suggest_product_ids", { search_text: q, max_results: 6 }),
    supabase.from("categories").select("name, slug").eq("is_active", true).ilike("name", like).order("sort_order").limit(3),
    supabase.from("vendors").select("business_name, slug").eq("status", "approved").ilike("business_name", like).order("business_name").limit(3),
  ]);
  if (ids.error) throw ids.error;
  if (categories.error) throw categories.error;
  if (vendors.error) throw vendors.error;

  const orderedIds = (ids.data ?? []).map((r) => r.id);
  let products: SuggestResult["products"] = [];
  if (orderedIds.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, base_price, sale_price, thumbnail_url, vendor:vendors ( business_name )")
      .in("id", orderedIds);
    if (error) throw error;
    // `.in()` does not keep the RPC's ranking, so put it back
    const byId = new Map((data ?? []).map((p) => [p.id, p]));
    products = orderedIds.flatMap((id) => {
      const p = byId.get(id);
      return p ? [{ name: p.name, slug: p.slug, price: Number(p.sale_price ?? p.base_price), image: p.thumbnail_url, vendor: one(p.vendor)?.business_name ?? "" }] : [];
    });
  }

  return {
    products,
    categories: (categories.data ?? []).map((c) => ({ name: c.name, slug: c.slug })),
    vendors: (vendors.data ?? []).map((v) => ({ name: v.business_name, slug: v.slug })),
  };
}
