import type { MetadataRoute } from "next";
import { FIXED_INDEXABLE_PATHS, SEO_PAGES } from "./pages";
import { absoluteUrl } from "./site";

export interface SitemapSource {
  /** keys of editable pages the admin has marked noindex — left out of the sitemap */
  noindexKeys: ReadonlySet<string>;
  categories: { slug: string; updated_at: string | null }[];
  vendors: { slug: string; updated_at: string | null }[];
  products: { slug: string; updated_at: string | null }[];
  /** slugs of the "gifts for <someone>" pages */
  relationships: string[];
  /** full /shop/<...> paths (already resolved from the product-type tree, parent slugs included) */
  productTypePaths: { path: string; updated_at: string | null }[];
}

const when = (iso: string | null | undefined): Date | undefined => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? undefined : new Date(t);
};

/** Sitemaps may hold at most 50,000 URLs; past that this needs splitting into several (Next's generateSitemaps). */
export const SITEMAP_URL_LIMIT = 50_000;

/**
 * Every public, indexable URL. Pure: the caller supplies rows already filtered by the database's own visibility rules (live products, approved
 * boutiques, active categories), so a hidden item can never appear here.
 */
export function buildSitemapEntries(src: SitemapSource, env?: Record<string, string | undefined>): MetadataRoute.Sitemap {
  const url = (path: string) => absoluteUrl(path, env);
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];
  const add = (path: string, changeFrequency: "daily" | "weekly" | "monthly", priority: number, lastModified?: Date) => {
    const u = url(path);
    if (seen.has(u)) return;
    seen.add(u);
    out.push({ url: u, changeFrequency, priority, ...(lastModified ? { lastModified } : {}) });
  };

  for (const page of SEO_PAGES) {
    if (src.noindexKeys.has(page.key)) continue;
    add(page.path, page.key === "home" ? "daily" : "weekly", page.key === "home" ? 1 : 0.8);
  }
  for (const path of FIXED_INDEXABLE_PATHS) add(path, "monthly", 0.3);
  for (const c of src.categories) add(`/categories/${encodeURIComponent(c.slug)}`, "daily", 0.8, when(c.updated_at));
  for (const r of src.relationships) add(`/gifts-for/${encodeURIComponent(r)}`, "weekly", 0.6);
  for (const v of src.vendors) add(`/vendors/${encodeURIComponent(v.slug)}`, "weekly", 0.7, when(v.updated_at));
  for (const p of src.products) add(`/products/${encodeURIComponent(p.slug)}`, "weekly", 0.6, when(p.updated_at));
  for (const t of src.productTypePaths) add(t.path, "weekly", 0.7, when(t.updated_at));
  return out;
}
