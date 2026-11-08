import type { MetadataRoute } from "next";
import { CRAWL_QUERY_PATHS } from "./crawl";
import { siteUrl } from "./site";

/**
 * robots.txt as data. Search engines match Disallow rules by PREFIX — so `/vendor` would also hide the public `/vendors/...` boutique pages
 * (the same prefix trap proxy.ts hit with `startsWith("/vendor")`; see CLAUDE.md). The vendor portal is therefore listed as `/vendor/` plus
 * `/vendor$` (the portal's own front door), and robots.test.ts proves no public page is caught by any rule.
 */
export const PRIVATE_PATHS = [
  "/admin",
  "/api/",
  "/vendor/",
  "/vendor$",
  "/account",
  "/cart",
  "/checkout",
  "/orders",
  "/wishlist",
  "/diary",
  "/notifications",
  "/unsubscribe",
  "/search",
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/update-password",
  "/auth/",
  "/design",
  "/kitchen-sink",
] as const;

/** Would this robots rule block `path`? (Google's matching: prefix, with `$` anchoring the end.) */
export function ruleBlocks(rule: string, path: string): boolean {
  if (rule.endsWith("$")) return path === rule.slice(0, -1);
  return path.startsWith(rule);
}

export function buildRobots(env: Record<string, string | undefined> = process.env): MetadataRoute.Robots {
  // Only the real production site should be indexed — a Vercel preview or staging deploy of the same code must not compete with it.
  const vercelEnv = env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    // Query strings on shop/category pages are filter, sort and pagination states — the same content
    // under a different URL. Keep the query-free pages crawlable and block the combinatorial variants.
    // These are deliberately path-specific: a global `/*?` would also hide `/_next/image?url=...`.
    rules: [{ userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS, ...CRAWL_QUERY_PATHS] }],
    sitemap: `${siteUrl(env)}/sitemap.xml`,
  };
}
