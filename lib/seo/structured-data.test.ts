import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, jsonLdScript, organizationJsonLd, productJsonLd, websiteJsonLd, type ProductForSchema } from "./structured-data";

const base: ProductForSchema = {
  name: "Luxe Memory Hamper",
  slug: "luxe-memory-hamper",
  short_description: "A curated hamper of keepsakes.",
  base_price: 2499,
  sale_price: null,
  sku: "GP-HAMP-01",
  stock_quantity: 12,
  average_rating: 4.6,
  review_count: 8,
  is_in_house: true,
  vendor: null,
  images: [{ url: "/images/hamper.webp" }],
  thumbnail_url: null,
};

describe("productJsonLd", () => {
  it("builds valid Product markup with the page's own price, brand and absolute URLs", () => {
    const json = productJsonLd(base);
    expect(json["@type"]).toBe("Product");
    expect(json.name).toBe(base.name);
    expect(json.url).toMatch(/\/products\/luxe-memory-hamper$/);
    expect(json.image[0]).toMatch(/^https?:\/\//);
    expect(json.brand).toEqual({ "@type": "Brand", name: "GiftPing Originals" });
    expect(json.offers.priceCurrency).toBe("INR");
    expect(json.offers.price).toBe("2499.00");
    expect(json.offers.availability).toBe("https://schema.org/InStock");
    expect(json.aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: "4.6", reviewCount: 8 });
  });

  it("uses the sale price, not the base price, exactly like the page does", () => {
    const json = productJsonLd({ ...base, sale_price: 1999 });
    expect(json.offers.price).toBe("1999.00");
  });

  it("names a boutique's brand, never GiftPing, for a vendor product", () => {
    const json = productJsonLd({ ...base, is_in_house: false, vendor: { business_name: "Aurelia Gifts" } });
    expect(json.brand.name).toBe("Aurelia Gifts");
  });

  it("falls back to a generic brand name if an in-house flag is wrong and there's no vendor", () => {
    const json = productJsonLd({ ...base, is_in_house: false, vendor: null });
    expect(json.brand.name).toBe("GiftPing");
  });

  it("marks out-of-stock products correctly, and never invents a rating with zero reviews", () => {
    const json = productJsonLd({ ...base, stock_quantity: 0, review_count: 0 });
    expect(json.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(json.aggregateRating).toBeUndefined();
  });

  it("omits sku and description when the boutique never set them, rather than emitting an empty string", () => {
    const json = productJsonLd({ ...base, sku: null, short_description: null });
    expect("sku" in json).toBe(false);
    expect("description" in json).toBe(false);
  });

  it("falls back to the thumbnail when there is no gallery, and caps at 8 photos", () => {
    const json = productJsonLd({ ...base, images: [], thumbnail_url: "/images/thumb.webp" });
    expect(json.image).toHaveLength(1);
    const many = productJsonLd({ ...base, images: Array.from({ length: 12 }, (_, i) => ({ url: `/images/${i}.webp` })) });
    expect(many.image).toHaveLength(8);
  });

  it("omits shipping/return details entirely when no policies are given (back-compatible)", () => {
    const json = productJsonLd(base);
    expect(json.offers.shippingDetails).toBeUndefined();
    expect(json.offers.hasMerchantReturnPolicy).toBeUndefined();
  });

  it("charges the real flat delivery rate below the free-delivery threshold", () => {
    // base price 2499, threshold 3000 -> below threshold, real flat fee applies
    const json = productJsonLd(base, { deliveryCharge: 79, freeDeliveryThreshold: 3000, returnWindowDays: 7 });
    expect(json.offers.shippingDetails).toEqual({
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: "79.00", currency: "INR" },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    });
    expect(json.offers.hasMerchantReturnPolicy).toEqual({
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnMethod: "https://schema.org/ReturnByMail",
    });
    // never claims a specific transit time or who pays return shipping — neither is a fact this page actually states
    expect(json.offers.shippingDetails).not.toHaveProperty("deliveryTime");
    expect(json.offers.hasMerchantReturnPolicy).not.toHaveProperty("returnFees");
  });

  it("matches the page's own 'Free' delivery claim at or above the threshold", () => {
    const json = productJsonLd(base, { deliveryCharge: 79, freeDeliveryThreshold: 2000, returnWindowDays: 7 });
    expect(json.offers.shippingDetails?.shippingRate.value).toBe("0.00");
  });

  it("declares returns not permitted, honestly, when the window is 0", () => {
    const json = productJsonLd(base, { deliveryCharge: 79, freeDeliveryThreshold: 3000, returnWindowDays: 0 });
    expect(json.offers.hasMerchantReturnPolicy?.returnPolicyCategory).toBe("https://schema.org/MerchantReturnNotPermitted");
    expect(json.offers.hasMerchantReturnPolicy).not.toHaveProperty("merchantReturnDays");
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the trail from 1 and resolves each path to an absolute URL", () => {
    const json = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Birthday", path: "/categories/birthday" }, { name: "Luxe Memory Hamper", path: "/products/luxe-memory-hamper" }]);
    expect(json.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(json.itemListElement[1].item).toMatch(/\/categories\/birthday$/);
  });
});

describe("organizationJsonLd", () => {
  it("names the real brand and logo, as absolute URLs", () => {
    const json = organizationJsonLd();
    expect(json["@type"]).toBe("Organization");
    expect(json.name).toBe("GiftPing");
    expect(json.url).toMatch(/^https?:\/\//);
    expect(json.logo).toMatch(/^https?:\/\/.*logo-gp\.webp$/);
  });
});

describe("websiteJsonLd", () => {
  it("points the search action at the real search page with the right query placeholder", () => {
    const json = websiteJsonLd();
    expect(json["@type"]).toBe("WebSite");
    expect(json.potentialAction.target).toMatch(/\/search\?q=\{search_term_string\}$/);
    expect(json.potentialAction["query-input"]).toBe("required name=search_term_string");
  });
});

describe("jsonLdScript", () => {
  it("neutralises a </script> hidden inside a product name so it cannot break out of the tag", () => {
    const hostile = productJsonLd({ ...base, name: 'Evil</script><script>alert(1)</script>' });
    const out = jsonLdScript(hostile);
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script>");
    // < is a valid JSON escape for "<" — JSON.parse decodes it back on its own, so the data survives unchanged.
    expect(JSON.parse(out).name).toContain("</script>");
  });
});
