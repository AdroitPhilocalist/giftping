import "server-only";
import { DEFAULT_THEME_ID, resolveTheme, type ThemeDef } from "@/lib/theme/themes";

/**
 * Which theme is showing right now. Today: always the native look. The next slice adds (1) an admin-only preview and (2) scheduled themes
 * (start/end dates, like banners) read from the database — both resolve to a theme id here, so nothing else in the app has to know.
 */
export async function getActiveTheme(): Promise<ThemeDef> {
  return resolveTheme(DEFAULT_THEME_ID);
}
