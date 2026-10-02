/**
 * Where the site lives, for canonical links, the sitemap and social-share cards. NEXT_PUBLIC_APP_URL is the deployed address (CLAUDE.md:
 * .env.local deliberately points it at the production URL); without it we fall back to localhost so nothing breaks in a bare checkout.
 * Pure (takes the environment) so it can be tested.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") return u.origin;
  } catch {
    /* fall through */
  }
  return "http://localhost:3000";
}

/** A page's absolute address. `path` must be a site path ("/mall"); anything else is treated as the home page. */
export function absoluteUrl(path: string, env?: Record<string, string | undefined>): string {
  const p = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return `${siteUrl(env)}${p === "/" ? "" : p}` || siteUrl(env);
}

/** The picture shown when a link to the site is shared, unless a page supplies its own. */
export const DEFAULT_SHARE_IMAGE = "/images/hero-atrium.webp";

/**
 * Open Graph fields every page repeats: Next replaces (does not merge) a parent's `openGraph`, so each page's metadata has to carry
 * the site name and default image itself. A function (fresh object each call) because Next's types want mutable arrays.
 */
export function baseOpenGraph() {
  return {
    siteName: "GiftPing",
    type: "website" as const,
    locale: "en_IN",
    images: [{ url: DEFAULT_SHARE_IMAGE, width: 1600, height: 900, alt: "GiftPing — a gifting mall" }],
  };
}
