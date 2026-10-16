/**
 * The site's fixed pages and their SEO defaults — pure, tested, and the single source of truth for both the pages' own metadata and the
 * admin editor. A row in `site_seo` only OVERRIDES these; blank fields (or no row) fall back here, so the site is never without a title.
 */
export const SEO_LIMITS = {
  /** hard limits (also enforced by the database) */
  titleMax: 70,
  descriptionMax: 200,
  /** roughly where Google starts cutting the displayed snippet — guidance only */
  titleIdeal: 60,
  descriptionIdeal: 160,
} as const;

export interface SeoPageDef {
  key: string;
  label: string;
  path: string;
  title: string;
  description: string;
}

export const SEO_PAGES = [
  {
    key: "home",
    label: "Homepage",
    path: "/",
    title: "GiftPing — Your Companion for Every Occasion",
    description:
      "A premium virtual gifting mall. Discover in-house and partner-vendor gifts for every occasion, and keep a personal Gifting Diary so you never miss a moment that matters.",
  },
  {
    key: "mall",
    label: "The Mall directory",
    path: "/mall",
    title: "The Mall Directory — GiftPing",
    description: "Explore the GiftPing mall: Birthday World, Wedding Pavilion, Boutique Avenue and more — every place a doorway to thoughtful gifting.",
  },
  {
    key: "categories",
    label: "Occasions page",
    path: "/categories",
    title: "Gifts for Every Occasion — GiftPing",
    description: "Birthdays, anniversaries, weddings, festivals and more — explore GiftPing Mall one occasion at a time and find a gift that fits the moment.",
  },
  {
    key: "vendors",
    label: "Boutiques page",
    path: "/vendors",
    title: "Boutique Avenue — GiftPing",
    description: "Meet the independent boutiques on GiftPing — handpicked sellers of thoughtful, giftable things from across India.",
  },
  {
    key: "shop",
    label: "Shop by type page",
    path: "/shop",
    title: "Shop by Type — GiftPing",
    description: "Jewellery, candles, chocolates, flowers and more — browse GiftPing by what a gift actually is, not just the occasion it's for.",
  },
  {
    key: "gift-finder",
    label: "Gift finder",
    path: "/gift-finder",
    title: "Gift Finder — Find the Perfect Gift in 4 Questions | GiftPing",
    description: "Tell us who it's for, the occasion, your budget and what they love — GiftPing's gift finder suggests thoughtful gifts from boutiques across India.",
  },
  {
    key: "about",
    label: "About us",
    path: "/about",
    title: "About Us — GiftPing",
    description: "GiftPing is a gifting mall: independent boutiques, our own Originals, and a diary that remembers the moments that matter.",
  },
  {
    key: "contact",
    label: "Contact",
    path: "/contact",
    title: "Contact — GiftPing",
    description: "Get help with an order, a return, or anything else.",
  },
] as const satisfies readonly SeoPageDef[];

export type SeoPageKey = (typeof SEO_PAGES)[number]["key"];
export const SEO_PAGE_KEYS = SEO_PAGES.map((p) => p.key) as [SeoPageKey, ...SeoPageKey[]];

export const getSeoPage = (key: string): (typeof SEO_PAGES)[number] | undefined => SEO_PAGES.find((p) => p.key === key);

/** Pages that are public and indexable but not editable here (legal text) — they only appear in the sitemap. */
export const FIXED_INDEXABLE_PATHS = ["/privacy", "/terms", "/refunds"] as const;

export interface SeoOverride {
  meta_title: string | null;
  meta_description: string | null;
  noindex: boolean;
}

export interface ResolvedSeo {
  title: string;
  description: string;
  noindex: boolean;
  /** true when the admin has set their own text (rather than the built-in default) */
  titleIsCustom: boolean;
  descriptionIsCustom: boolean;
}

const clean = (v: string | null | undefined) => (v ?? "").replace(/\s+/g, " ").trim();

/** Admin override if there is one, else the code default. Blank/whitespace counts as "not set". */
export function resolveSeo(page: Pick<SeoPageDef, "title" | "description">, override: SeoOverride | null | undefined): ResolvedSeo {
  const t = clean(override?.meta_title);
  const d = clean(override?.meta_description);
  return {
    title: t || page.title,
    description: d || page.description,
    noindex: Boolean(override?.noindex),
    titleIsCustom: t !== "",
    descriptionIsCustom: d !== "",
  };
}

/** Collapse whitespace and cut at a word boundary with an ellipsis — for descriptions built from free text. */
export function truncateText(text: string | null | undefined, max: number): string {
  const t = clean(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

export type SeoLengthState = "empty" | "good" | "long" | "too-long";
/** For the editor's live counters: how a title/description length reads against Google's display and our hard limit. */
export function lengthState(length: number, ideal: number, max: number): SeoLengthState {
  if (length === 0) return "empty";
  if (length > max) return "too-long";
  return length > ideal ? "long" : "good";
}
