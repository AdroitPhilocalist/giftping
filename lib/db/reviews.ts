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

export interface ReviewSummary {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
}

/** A user's reviews keyed by product — reviews.product_id is unique per user, not per purchase — so a
 * delivered order item can offer a prefilled "Edit your review" instead of a blank form. */
export async function getReviewedProducts(userId: string): Promise<Map<string, ReviewSummary>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, product_id, rating, title, body")
    .eq("user_id", userId);
  if (error) throw error;
  return new Map(
    (data ?? []).map((r) => [r.product_id, { id: r.id, rating: r.rating, title: r.title, body: r.body }]),
  );
}

/** The signed-in viewer's own review for one product, if any — lets the product page offer an edit action
 * even when their review falls outside the first page of reviews it shows. */
export async function getMyReviewForProduct(productId: string, userId: string): Promise<ReviewSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, title, body")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
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
