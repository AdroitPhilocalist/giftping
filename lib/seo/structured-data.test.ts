import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, jsonLdScript, productJsonLd, type ProductForSchema } from "./structured-data";

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
});

describe("breadcrumbJsonLd", () => {
  it("numbers the trail from 1 and resolves each path to an absolute URL", () => {
    const json = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Birthday", path: "/categories/birthday" }, { name: "Luxe Memory Hamper", path: "/products/luxe-memory-hamper" }]);
    expect(json.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(json.itemListElement[1].item).toMatch(/\/categories\/birthday$/);
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
