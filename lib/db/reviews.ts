import { createClient } from "@/lib/db/server";

/** Every review a customer has written, newest first, joined with just enough product info to show what
 * it's about and link back to it — used by /account/reviews (review management). */
export async function getUserReviews(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, title, body, created_at, updated_at, product:products(id, name, slug, thumbnail_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Which of a user's products they've already reviewed — reviews.product_id keyed by user, not by which
 * order it came from (the unique constraint is per product, not per purchase). Used to show "Write a
 * review" vs. "Edit your review" on an order's delivered items without a heavier per-item join. */
export async function getReviewedProductIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reviews").select("product_id").eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.product_id));
}

export async function getProductReviews(productId: string, page = 1, pageSize = 10) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("reviews")
    .select(
      "id, rating, title, body, is_verified_purchase, vendor_response, created_at, reviewer_display_name",
      { count: "exact" },
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { reviews: data ?? [], total: count ?? 0 };
}
