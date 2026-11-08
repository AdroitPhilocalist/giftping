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
  /** A product-type node and every one of its descendants (the shop-by-type axis — separate from categorySlug). */
  productTypeIds?: string[];
  /** attribute id -> selected values (OR within one attribute, AND across attributes). */
  attributes?: Record<string, string[]>;
}

export async function listProducts(filters: ProductListFilters = {}) {
  const supabase = await createClient();
  // The URL is user-controlled. Clamp before turning it into a range: a huge page number should
  // behave like page 1, not ask PostgREST for an impossible offset.
  const requestedPage = Number(filters.page ?? 1);
  const page = Number.isFinite(requestedPage) ? Math.min(1000, Math.max(1, Math.floor(requestedPage))) : 1;
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
  if (filters.productTypeIds) query = query.in("product_type_id", filters.productTypeIds.length ? filters.productTypeIds : ["00000000-0000-0000-0000-000000000000"]);

  // Each selected attribute is its own EXISTS-style subquery, chained so multiple attributes AND together
  // (a join would multiply rows and OR across them instead — product_attribute_values is one row per
  // product+attribute+value, not one row per product).
  if (filters.attributes) {
    for (const [attributeId, values] of Object.entries(filters.attributes)) {
      if (values.length === 0) continue;
      const { data: matches } = await supabase.from("product_attribute_values").select("product_id").eq("attribute_id", attributeId).in("value", values);
      const ids = [...new Set((matches ?? []).map((m) => m.product_id))];
      query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    }
  }

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
  if (error) {
    // PostgREST returns PGRST103 when the range starts beyond the last row (e.g. ?page=2 on an
    // empty type). Treat it as an empty result rather than a 500 — the page itself is noindexed.
    if (error.code === "PGRST103") {
      return { products: [], total: 0, page: 1, pageSize, totalPages: 1 };
    }
    throw error;
  }

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
      variants:product_variants ( id, name, value, price_adjustment, stock_quantity, is_active, image_url ),
      attribute_values:product_attribute_values ( attribute_id, value )
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
