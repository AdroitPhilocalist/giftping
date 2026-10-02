import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/db/admin";
import { getSeoPage, resolveSeo, type SeoOverride, type SeoPageKey } from "./pages";
import { baseOpenGraph } from "./site";

/**
 * The admin's overrides for the fixed pages, one small query per request (React `cache` de-duplicates the layout/page calls). Read with the
 * service role — the table is admin-only under RLS and holds nothing private, just page-title text.
 * It must NEVER throw: a failed lookup means "use the built-in defaults", because page metadata isn't worth taking a page down for.
 */
export const getSiteSeoOverrides = cache(async (): Promise<Map<string, SeoOverride>> => {
  try {
    const { data, error } = await createAdminClient().from("site_seo").select("page_key, meta_title, meta_description, noindex");
    if (error) throw error;
    return new Map((data ?? []).map((r) => [r.page_key, { meta_title: r.meta_title, meta_description: r.meta_description, noindex: r.noindex }]));
  } catch (error) {
    console.error("Couldn't read site_seo — using built-in SEO defaults", error);
    return new Map();
  }
});

/** The `generateMetadata` result for one of the fixed pages: admin override over code default, a canonical link, share-card fields, and noindex if asked. */
export async function pageMetadata(key: SeoPageKey): Promise<Metadata> {
  const page = getSeoPage(key);
  if (!page) return {};
  const seo = resolveSeo(page, (await getSiteSeoOverrides()).get(key));
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: page.path },
    openGraph: { ...baseOpenGraph(), title: seo.title, description: seo.description, url: page.path },
    ...(seo.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
