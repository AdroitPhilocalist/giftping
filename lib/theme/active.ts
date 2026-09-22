import "server-only";
import { cache } from "react";
import { getScheduledThemeId } from "@/lib/db/themes";
import { getThemePreviewOverride } from "@/lib/theme/preview";
import { DEFAULT_THEME_ID, resolveTheme, type ThemeDef } from "@/lib/theme/themes";

/**
 * Which theme is showing right now, in priority order:
 *   1. an admin's own preview (this browser only — see lib/theme/preview.ts)
 *   2. the scheduled festival theme, if one is live right now (lib/db/themes.ts + /admin/themes)
 *   3. the native default
 *
 * cache(): every page calls this at least once (directly) and again via the root layout — the homepage
 * alone calls it from HomeHero, DiscoverCards, RelationshipCards and once per featured VendorCard.
 * Without memoizing, each of those re-runs the site_themes query; with it, one request does it once.
 */
export const getActiveTheme = cache(async function getActiveTheme(): Promise<ThemeDef> {
  const preview = await getThemePreviewOverride();
  if (preview) return resolveTheme(preview);
  const scheduled = await getScheduledThemeId();
  return resolveTheme(scheduled ?? DEFAULT_THEME_ID);
});
