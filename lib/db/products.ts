import { cache } from "react";
import { createClient } from "@/lib/db/server";

const PRODUCT_CARD_SELECT = `
  id, name, slug, short_description, base_price, sale_price, thumbnail_url,
  average_rating, review_count, stock_quantity, is_in_house, occasion_tags, recipient_tags,
  vendor:vendors ( id, business_name, slug, is_featured ),
  category:categories ( id, name, slug )
`;

export interface ProductListFilters {
  categorySlug?: string;
  vendorSlug?: string;
  occasionTag?: string;
  recipientTag?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: "popularity" | "price_asc" | "price_desc" | "newest" | "rating";
  page?: number;
  pageSize?: number;
}

export async function listProducts(filters: ProductListFilters = {}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT, { count: "exact" })
    .eq("status", "active");

  if (filters.categorySlug) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .maybeSingle();
    query = query.eq("category_id", category?.id ?? "00000000-0000-0000-0000-000000000000");
  }

  if (filters.vendorSlug) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("slug", filters.vendorSlug)
      .maybeSingle();
    query = query.eq("vendor_id", vendor?.id ?? "00000000-0000-0000-0000-000000000000");
  }

  if (filters.occasionTag) query = query.contains("occasion_tags", [filters.occasionTag]);
  if (filters.recipientTag) query = query.contains("recipient_tags", [filters.recipientTag]);
  if (filters.minPrice !== undefined) query = query.gte("base_price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("base_price", filters.maxPrice);
  if (filters.inStockOnly) query = query.gt("stock_quantity", 0);

  switch (filters.sort) {
    case "price_asc":
      query = query.order("base_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("base_price", { ascending: false });
      break;
    case "rating":
      query = query.order("average_rating", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("total_sold", { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    products: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

// cache(): the product page's generateMetadata() and the page component both need the same product — without
// memoizing, the whole query (with its joins) would run twice per request.
export const getProductBySlug = cache(async function getProductBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      vendor:vendors ( id, business_name, slug, logo_url, short_description, average_rating, review_count ),
      category:categories ( id, name, slug ),
      images:product_images ( id, url, alt_text, sort_order, is_primary ),
      variants:product_variants ( id, name, value, price_adjustment, stock_quantity, is_active, image_url )
    `,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
});

/** Full product cards for specific ids, in the order given (an `.in()` filter doesn't keep it). Missing/hidden ids are simply absent. */
export async function getProductCardsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).in("id", ids);
  if (error) throw error;
  const byId = new Map((data ?? []).map((p) => [p.id, p]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4) {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .eq("status", "active")
    .neq("id", productId)
    .limit(limit);

  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTrendingProducts(limit = 8) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .eq("status", "active")
    .order("total_sold", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export type ProductCard = Awaited<ReturnType<typeof listProducts>>["products"][number];
