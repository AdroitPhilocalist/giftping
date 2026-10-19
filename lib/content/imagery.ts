import manifest from "./imagery.manifest.json";

/**
 * The one place components ask for site artwork (hero scenes, the mall map, mascot poses…). The manifest is WRITTEN BY `npm run images:sync`, which converts
 * whatever PNG/JPG files are in ui-references/batch-1/ (sub-folders = themes, e.g. batch-1/diwali/hero-atrium.png) into optimised WebP in public/images/.
 * A component asks for a key; when no artwork exists yet it gets `null` and draws its built-in placeholder — so dropping a file in never requires a code change.
 */
export type ImageKey =
  | "hero-atrium" | "hero-atrium-mobile" | "mall-map"
  | "card-collections" | "card-boutiques" | "card-diary" | "card-services"
  | "robin-perched" | "robin-flying-gift" | "robin-on-gift" | "robin-peeking"
  | "robin-waving" | "robin-heart" | "robin-search" | "robin-bell" | "robin-celebrating" | "robin-reading" | "robin-sleeping"
  | `zone-${string}` | `sticker-${string}` | "step-browse" | "step-personalise" | "step-deliver"
  | "logo-gp" | "logo-gp-light"
  | "wrap-green" | "wrap-blush" | "wrap-blue" | "wrap-gold" | "wrap-ivory"
  | "rel-parents" | "rel-partner" | "rel-friends" | "rel-colleagues" | "rel-kids"
  | "diary-desk" | "order-hero" | "auth-welcome"
  | `world-${string}`      // an occasion/category page banner, keyed by the category slug (world-birthday, world-wedding…)
  | `shopfront-${string}`  // a default boutique front for vendors without their own banner (shopfront-perfume, -jewellery, -florist)
  | `type-${string}`;      // a "Shop by Type" card photo on /shop, keyed by the product-type slug (type-jewellery, type-cakes-bakery…)

export interface SiteImage {
  src: string;
  width: number;
  height: number;
}

const entries = manifest as Record<string, SiteImage>;

/** A theme's own artwork wins (`<theme>/<key>`); otherwise the native one; otherwise null (draw the placeholder). */
export function siteImage(key: ImageKey, themeId?: string): SiteImage | null {
  if (themeId && themeId !== "native" && entries[`${themeId}/${key}`]) return entries[`${themeId}/${key}`];
  return entries[key] ?? null;
}

/**
 * A stand-in boutique front for a vendor who hasn't uploaded a banner: one of the delivered default shopfronts, chosen by a stable hash of the
 * vendor's slug so a boutique always looks the same. Null when none have been delivered (the caller then draws ShopfrontArt).
 */
export function defaultShopfrontImage(seed: string, themeId?: string): SiteImage | null {
  // every delivered `shopfront-*` picture (the theme's own, else the native ones) — dropping in more files gives the street more variety with no code change
  const keys = Array.from(new Set(Object.keys(entries).map((k) => k.replace(/^[^/]+\//, "")).filter((k) => k.startsWith("shopfront-")))).sort() as ImageKey[];
  const available = keys.map((key) => siteImage(key, themeId)).filter((img): img is SiteImage => img !== null);
  if (available.length === 0) return null;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return available[h % available.length];
}
