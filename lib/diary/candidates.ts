import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { SuggestionCandidate } from "@/lib/diary/suggestion-matcher";

export interface CandidatePool {
  candidates: SuggestionCandidate[];
  byId: Map<string, { slug: string; thumbnail: string | null; vendorName: string | null } & SuggestionCandidate>;
}

/**
 * The catalogue slice the suggestion engine ranks: live products with the fields the matcher needs. Works with any client —
 * the user's own session on the diary pages (RLS shows only live products) and the service role in the cron.
 */
export async function loadCandidatePool(client: SupabaseClient<Database>): Promise<CandidatePool> {
  const { data } = await client
    .from("products")
    .select("id, name, slug, thumbnail_url, tags, occasion_tags, recipient_tags, base_price, sale_price, average_rating, review_count, category:categories(name), vendor:vendors(business_name)")
    .eq("status", "active")
    .limit(500);

  const byId: CandidatePool["byId"] = new Map();
  const candidates = (data ?? []).map((p) => {
    const category = Array.isArray(p.category) ? p.category[0] : p.category;
    const vendor = Array.isArray(p.vendor) ? p.vendor[0] : p.vendor;
    const candidate: SuggestionCandidate = {
      id: p.id, name: p.name, tags: p.tags ?? [], occasionTags: p.occasion_tags ?? [], recipientTags: p.recipient_tags ?? [],
      categoryName: category?.name ?? null, price: Number(p.sale_price ?? p.base_price), averageRating: Number(p.average_rating), reviewCount: p.review_count,
    };
    byId.set(p.id, { ...candidate, slug: p.slug, thumbnail: p.thumbnail_url, vendorName: vendor?.business_name ?? null });
    return candidate;
  });
  return { candidates, byId };
}
