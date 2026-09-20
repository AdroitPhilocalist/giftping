/**
 * Homepage banner rules — pure and unit-tested. What a banner links to, whether it is showing right now, and who gets to see it.
 * Dates are IST calendar days (same convention as coupons): a banner runs from 00:00 IST on its first day to 23:59:59 IST on its last.
 */
export interface BannerLike {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  target_audience: string;
  sort_order: number;
  created_at?: string;
}

export type BannerStatus = "live" | "paused" | "scheduled" | "expired";

export function bannerStatus(b: Pick<BannerLike, "is_active" | "starts_at" | "ends_at">, now: Date = new Date()): BannerStatus {
  if (!b.is_active) return "paused";
  if (b.starts_at && new Date(b.starts_at).getTime() > now.getTime()) return "scheduled";
  if (b.ends_at && new Date(b.ends_at).getTime() < now.getTime()) return "expired";
  return "live";
}

/** Who is looking: a signed-out visitor, a customer, a vendor, or an admin (who browses the shop as a shopper). */
export type Viewer = "guest" | "customer" | "vendor" | "admin";

export function audienceMatches(audience: string, viewer: Viewer): boolean {
  if (audience === "all") return true;
  if (audience === "vendor") return viewer === "vendor";
  if (audience === "customer") return viewer !== "vendor"; // shoppers: guests, customers, and admins previewing the shop
  return false;
}

/** The banners to show right now, in order. Cheap enough to run on every homepage render. */
export function visibleBanners<T extends BannerLike>(banners: T[], viewer: Viewer, now: Date = new Date()): T[] {
  return banners
    .filter((b) => bannerStatus(b, now) === "live" && audienceMatches(b.target_audience, viewer))
    .sort((a, b) => a.sort_order - b.sort_order || (a.created_at ?? "").localeCompare(b.created_at ?? ""));
}

// whitespace, backslashes and control characters (0x00-0x1f) never belong in a link
const FORBIDDEN_IN_LINK = new RegExp("[\\s\\\\\\u0000-\\u001f]");

/**
 * A banner link is either a path on this site ("/categories/birthday") or an https URL. Anything else — javascript:, data:, protocol-relative "//evil.test",
 * backslash tricks, http:// — is refused, because this string ends up in an href on the homepage.
 */
export function safeCtaUrl(value: string): string | null {
  const v = value.trim();
  if (v.length === 0 || v.length > 300 || FORBIDDEN_IN_LINK.test(v)) return null;
  if (v === "/" || (v.startsWith("/") && !v.startsWith("//"))) return v;
  try {
    const url = new URL(v);
    return url.protocol === "https:" && url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

export const isInternalLink = (href: string) => href.startsWith("/");
