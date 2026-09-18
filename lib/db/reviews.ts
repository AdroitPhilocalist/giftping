import { createClient } from "@/lib/db/server";

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
