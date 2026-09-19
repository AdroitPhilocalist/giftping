import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

type Client = SupabaseClient<Database>;

/** Keeps products.thumbnail_url (used by every product card) pointing at the primary image's medium rendition. */
export async function syncProductThumbnail(supabase: Client, productId: string) {
  const { data: images } = await supabase
    .from("product_images")
    .select("medium_url, url, is_primary, sort_order")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("sort_order");

  const primary = images?.[0];
  await supabase
    .from("products")
    .update({ thumbnail_url: primary ? (primary.medium_url ?? primary.url) : null })
    .eq("id", productId);
}

/**
 * Any vendor edit to a live (or previously rejected) listing sends it back to admin review, per the
 * feature spec. A vendor may only ever move a product to 'pending' or 'inactive' — the DB trigger enforces that.
 */
export async function sendBackToReviewIfLive(supabase: Client, productId: string) {
  await supabase
    .from("products")
    .update({ status: "pending" })
    .eq("id", productId)
    .in("status", ["active", "approved", "rejected"]);
}
