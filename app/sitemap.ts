import type { MetadataRoute } from "next";
import { createClient } from "@/lib/db/server";
import { fetchAllRows } from "@/lib/db/paginate";
import { RELATIONSHIPS } from "@/lib/relationships";
import { getSiteSeoOverrides } from "@/lib/seo/site-seo";
import { SITEMAP_URL_LIMIT, buildSitemapEntries } from "@/lib/seo/sitemap";

export const dynamic = "force-dynamic";

/**
 * /sitemap.xml. Read with the visitor's own (anonymous) session, NOT the service role, so the database's public-visibility rules decide what
 * is listed — live products only, approved boutiques only, active categories only. A hidden item can never leak into the sitemap by a filter
 * being forgotten here. Paged (PostgREST silently clamps one response to ~1,000 rows).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const overrides = await getSiteSeoOverrides();
  const [categories, vendors, products] = await Promise.all([
    fetchAllRows((a, b) => supabase.from("categories").select("slug, updated_at").eq("is_active", true).order("slug").range(a, b), { maxRows: 5000 }),
    fetchAllRows((a, b) => supabase.from("vendors").select("slug, updated_at").eq("status", "approved").order("slug").range(a, b), { maxRows: 10000 }),
    fetchAllRows((a, b) => supabase.from("products").select("slug, updated_at").eq("status", "active").order("slug").range(a, b), { maxRows: SITEMAP_URL_LIMIT }),
  ]);
  return buildSitemapEntries({
    noindexKeys: new Set([...overrides].filter(([, o]) => o.noindex).map(([k]) => k)),
    categories: categories.rows,
    vendors: vendors.rows,
    products: products.rows,
    relationships: RELATIONSHIPS.map((r) => r.slug),
  }).slice(0, SITEMAP_URL_LIMIT);
}
