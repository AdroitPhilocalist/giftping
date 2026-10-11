/**
 * Google rich-result markup (JSON-LD) — pure and tested. "Structured data" only ever DESCRIBES what the page already shows; it must never claim something the
 * visible page doesn't (Google's own policy, and the honest thing to do) — e.g. no rating is emitted when there are no reviews, no price when there's no stock
 * to sell at that price's... actually a price is still shown out of stock, availability just says so.
 */
import { computeUnitPrice } from "@/lib/commerce/pricing";
import { absoluteUrl } from "@/lib/seo/site";

export interface ProductForSchema {
  name: string;
  slug: string;
  short_description: string | null;
  base_price: number;
  sale_price: number | null;
  sku: string | null;
  stock_quantity: number;
  average_rating: number;
  review_count: number;
  is_in_house: boolean;
  vendor: { business_name: string } | null;
  images: { url: string }[];
  thumbnail_url: string | null;
}

/** Up to 8 photo URLs, absolute (Google ignores relative ones), the thumbnail first when the gallery doesn't already include it. */
function productImages(product: ProductForSchema): string[] {
  const urls = product.images.map((i) => i.url);
  if (urls.length === 0 && product.thumbnail_url) urls.push(product.thumbnail_url);
  return urls.slice(0, 8).map((u) => (u.startsWith("http") ? u : absoluteUrl(u)));
}

/**
 * schema.org/Product for one product page: name, photos, the brand (the boutique, or GiftPing for in-house items), the price actually shown on the page
 * (sale price if one applies — the same rule `ProductCard`/`ProductBuyBox` use, via `computeUnitPrice` with no variant adjustment), its availability, and —
 * only when the product genuinely has reviews — the aggregate rating. `sku` is included only when the boutique set one; Google treats a missing optional
 * field as simply absent, never as an error.
 */
export interface ProductJsonLd {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  url: string;
  image: string[];
  brand: { "@type": "Brand"; name: string };
  description?: string;
  sku?: string;
  offers: { "@type": "Offer"; url: string; priceCurrency: string; price: string; availability: string };
  aggregateRating?: { "@type": "AggregateRating"; ratingValue: string; reviewCount: number };
}

export function productJsonLd(product: ProductForSchema): ProductJsonLd {
  const price = computeUnitPrice({ basePrice: product.base_price, salePrice: product.sale_price, adjustments: [] });
  const json: ProductJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: absoluteUrl(`/products/${product.slug}`),
    image: productImages(product),
    brand: { "@type": "Brand", name: product.is_in_house ? "GiftPing Originals" : (product.vendor?.business_name ?? "GiftPing") },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: "INR",
      price: price.toFixed(2),
      availability: product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  if (product.short_description) json.description = product.short_description;
  if (product.sku) json.sku = product.sku;
  // A rating with zero reviews is exactly the kind of unverifiable claim Google's policy forbids — and there would be nothing on the page for a
  // searcher to check it against.
  if (product.review_count > 0) {
    json.aggregateRating = { "@type": "AggregateRating", ratingValue: product.average_rating.toFixed(1), reviewCount: product.review_count };
  }
  return json;
}

/** schema.org/BreadcrumbList for the trail a page already shows (Home → Category → Product, or shorter). `items` is root-to-leaf, in order. */
export interface BreadcrumbJsonLd {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: { "@type": "ListItem"; position: number; name: string; item: string }[];
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): BreadcrumbJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}

/**
 * schema.org/Organization + WebSite for the homepage only (not every page — this describes the BUSINESS, said once). Gives Google a confident,
 * machine-readable link between the domain, the real brand name, and the real logo (not whatever generic favicon happened to be in place) — the
 * standard lever for a more "legitimate business" treatment in search results over time (Knowledge Panel eligibility, a correct site icon, etc.).
 * `sameAs` is deliberately omitted until the client has real, live social profiles to list — a dead/placeholder link here would be worse than none.
 */
export interface OrganizationJsonLd {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  description: string;
}

export function organizationJsonLd(): OrganizationJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GiftPing",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/images/logo-gp.webp"),
    description: "A premium virtual gifting mall — in-house and partner-vendor gifts for every occasion, with a Personal Gifting Diary so you never miss a moment.",
  };
}

export interface WebsiteJsonLd {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  potentialAction: { "@type": "SearchAction"; target: string; "query-input": string };
}

/** `potentialAction` is what makes Google consider showing a search box directly under the site's result ("sitelinks search box"). */
export function websiteJsonLd(): WebsiteJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GiftPing",
    url: absoluteUrl("/"),
    potentialAction: { "@type": "SearchAction", target: `${absoluteUrl("/search")}?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

/**
 * Safe to drop straight into `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ... }}>`. `JSON.stringify` already escapes quotes, but a
 * literal `</script` inside a string value (a product name/description a vendor wrote) would still close the tag early and let the rest run as HTML — so
 * every `<` is additionally escaped the way Next itself escapes JSON-LD it emits.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
