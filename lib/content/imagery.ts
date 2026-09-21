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
  | "logo-gp" | "logo-gp-light"
  | "wrap-green" | "wrap-blush" | "wrap-blue" | "wrap-gold" | "wrap-ivory"
  | "rel-parents" | "rel-partner" | "rel-friends" | "rel-colleagues" | "rel-kids";

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
