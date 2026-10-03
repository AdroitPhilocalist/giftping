/**
 * The theme registry — pure and unit-tested. A "theme" is a look layered on top of the native design: its colours/shape live in app/themes/<id>.css
 * (a :root[data-theme="<id>"] block overriding --gp-* variables — `:root[...]` on purpose: it must out-rank the plain :root defaults); this file holds everything else about it that code needs to know.
 *
 * ADDING A FESTIVAL (nothing on any page changes):
 *   1. app/themes/<id>.css   — override the tokens you want to change, and @import it at the top of app/globals.css
 *   2. add an entry below     — label, announcement line
 *   3. public/themes/<id>/    — artwork, mapped in lib/content/imagery.ts (later)
 *   4. schedule or preview it (admin) — anything not overridden falls back to the native look
 */
export type ThemeKind = "native" | "festival" | "demo";

export interface ThemeDef {
  id: string;
  label: string;
  kind: ThemeKind;
  /** the line in the dark bar above the header */
  announcement: string;
}

export const DEFAULT_THEME_ID = "native";
export const DEFAULT_ANNOUNCEMENT = "Gift happiness. Create memories. Celebrate every occasion.";

export const THEMES: Record<string, ThemeDef> = {
  native: { id: "native", label: "GiftPing (native)", kind: "native", announcement: DEFAULT_ANNOUNCEMENT },
  // Festivals — scheduled/previewed in /admin/themes. A festival that also has an entry in lib/festivals/calendar.ts gets the countdown and floating ambience.
  diwali: { id: "diwali", label: "Diwali", kind: "festival", announcement: "Light up someone's Diwali — gifts that glow." },
  // Test themes: they exist to prove that a complete restyle is only variables. They are never offered for scheduling.
  "demo-night": { id: "demo-night", label: "Demo · Night", kind: "demo", announcement: DEFAULT_ANNOUNCEMENT },
  "demo-jewel": { id: "demo-jewel", label: "Demo · Jewel", kind: "demo", announcement: "A festive-style makeover — colours only, no page changed." },
};

export function isThemeId(value: unknown): value is string {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(THEMES, value);
}

/** Unknown, missing or removed themes fall back to the native look — a bad value can never break the page. */
export function resolveTheme(id: string | null | undefined): ThemeDef {
  return isThemeId(id) ? THEMES[id] : THEMES[DEFAULT_THEME_ID];
}

/** The themes an admin may schedule for real (never the demo ones). */
export function schedulableThemes(): ThemeDef[] {
  return Object.values(THEMES).filter((t) => t.kind === "festival");
}
