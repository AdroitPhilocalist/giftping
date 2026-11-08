/**
 * Crawl-control rules for query-string catalogue pages.
 *
 * The shop/category filter UI is intentionally link-driven and server-rendered. That is good for
 * shoppers (shareable, works without JS), but it also exposes a combinatorial graph: every filter
 * option is a new URL, and a crawler that follows them can generate thousands of unique pages.
 *
 * Keep these rules narrow. A global `/*?` rule would also block Next's image optimiser
 * (`/_next/image?url=...`) and damage image SEO.
 */
export const CRAWL_QUERY_PATHS = [
  "/shop*?*",
  "/categories*?*",
  "/*?_rsc=*",
  "/*.rsc$",
] as const;

/** True for the public shop/category surfaces whose query strings are filter/sort/page states. */
export function isShopOrCategoryPath(pathname: string): boolean {
  return (
    pathname === "/shop" ||
    pathname.startsWith("/shop/") ||
    pathname === "/categories" ||
    pathname.startsWith("/categories/")
  );
}

/**
 * Should this request carry `X-Robots-Tag: noindex, nofollow`?
 *
 * The header (rather than only page metadata) also covers `.rsc` responses, which bypass the
 * normal HTML metadata path. A query string is the signal: the canonical page is always the
 * query-free URL.
 */
export function isNoIndexQuery(pathname: string, search: string): boolean {
  return search.length > 0 && isShopOrCategoryPath(pathname);
}
