import { describe, expect, it } from "vitest";
import { CRAWL_QUERY_PATHS, isNoIndexQuery } from "./crawl";
import { SEO_PAGES, SEO_PAGE_KEYS, getSeoPage, lengthState, resolveSeo, truncateText } from "./pages";
import { absoluteUrl, siteUrl } from "./site";
import { PRIVATE_PATHS, buildRobots, ruleBlocks } from "./robots";
import { buildSitemapEntries, type SitemapSource } from "./sitemap";
import { seoSchema } from "../validation/seo.schema";

describe("page defaults", () => {
  it("has a title and description for every editable page, within the hard limits", () => {
    for (const p of SEO_PAGES) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.title.length).toBeLessThanOrEqual(70);
      expect(p.description.length).toBeLessThanOrEqual(200);
      expect(p.path.startsWith("/")).toBe(true);
    }
    expect(new Set(SEO_PAGE_KEYS).size).toBe(SEO_PAGES.length);
    expect(getSeoPage("home")?.path).toBe("/");
    expect(getSeoPage("nope")).toBeUndefined();
  });
});

describe("resolveSeo", () => {
  const page = { title: "Default title", description: "Default description" };
  it("falls back to the default when there is no override or fields are blank", () => {
    expect(resolveSeo(page, null)).toEqual({ title: "Default title", description: "Default description", noindex: false, titleIsCustom: false, descriptionIsCustom: false });
    expect(resolveSeo(page, { meta_title: "  ", meta_description: "", noindex: false }).titleIsCustom).toBe(false);
  });
  it("uses the admin's text when set, per field", () => {
    const r = resolveSeo(page, { meta_title: "Custom", meta_description: null, noindex: true });
    expect(r).toMatchObject({ title: "Custom", description: "Default description", noindex: true, titleIsCustom: true, descriptionIsCustom: false });
  });
  it("collapses stray whitespace in custom text", () => {
    expect(resolveSeo(page, { meta_title: "  A   B  ", meta_description: null, noindex: false }).title).toBe("A B");
  });
});

describe("truncateText / lengthState", () => {
  it("leaves short text alone and collapses whitespace", () => {
    expect(truncateText("  hello \n world ", 50)).toBe("hello world");
    expect(truncateText(null, 50)).toBe("");
  });
  it("cuts at a word boundary with an ellipsis, never over the limit", () => {
    const t = truncateText("The quick brown fox jumps over the lazy dog and keeps on running far away", 30);
    expect(t.length).toBeLessThanOrEqual(30);
    expect(t.endsWith("…")).toBe(true);
    expect(t).not.toMatch(/\s…$/);
    expect(t).toBe("The quick brown fox jumps…");
  });
  it("hard-cuts a single very long word", () => {
    expect(truncateText("x".repeat(100), 20)).toBe(`${"x".repeat(19)}…`);
  });
  it("classifies lengths for the editor counters", () => {
    expect(lengthState(0, 60, 70)).toBe("empty");
    expect(lengthState(60, 60, 70)).toBe("good");
    expect(lengthState(61, 60, 70)).toBe("long");
    expect(lengthState(71, 60, 70)).toBe("too-long");
  });
});

describe("site URL", () => {
  it("uses the configured address without a trailing slash or path", () => {
    expect(siteUrl({ NEXT_PUBLIC_APP_URL: "https://giftping.example/" })).toBe("https://giftping.example");
    expect(siteUrl({ NEXT_PUBLIC_APP_URL: "https://giftping.example/some/path" })).toBe("https://giftping.example");
  });
  it("falls back to localhost for missing, junk or non-http values", () => {
    for (const v of [undefined, "", "not a url", "javascript:alert(1)", "ftp://x.test"]) expect(siteUrl({ NEXT_PUBLIC_APP_URL: v })).toBe("http://localhost:3000");
  });
  it("builds absolute addresses and refuses protocol-relative paths", () => {
    const env = { NEXT_PUBLIC_APP_URL: "https://giftping.example" };
    expect(absoluteUrl("/mall", env)).toBe("https://giftping.example/mall");
    expect(absoluteUrl("/", env)).toBe("https://giftping.example");
    expect(absoluteUrl("//evil.test/x", env)).toBe("https://giftping.example");
    expect(absoluteUrl("https://evil.test", env)).toBe("https://giftping.example");
  });
});

describe("robots", () => {
  const PUBLIC = ["/", "/mall", "/about", "/contact", "/privacy", "/terms", "/refunds", "/categories", "/categories/birthday", "/vendors", "/vendors/lumiere-keepsakes", "/vendors/vendor-x", "/products/luxe-memory-hamper", "/gifts-for/mom"];
  const PRIVATE = ["/admin", "/admin/seo", "/vendor", "/vendor/products", "/api/search/suggest", "/account/profile", "/cart", "/checkout", "/orders/abc", "/wishlist", "/diary/people/1", "/search", "/sign-in", "/unsubscribe", "/auth/callback"];
  it("never blocks a public page — including /vendors vs the /vendor portal", () => {
    for (const path of PUBLIC) for (const rule of PRIVATE_PATHS) expect(ruleBlocks(rule, path), `${rule} must not block ${path}`).toBe(false);
  });
  it("blocks the private areas", () => {
    for (const path of PRIVATE) expect(PRIVATE_PATHS.some((r) => ruleBlocks(r, path)), `${path} should be blocked`).toBe(true);
  });
  it("points at the sitemap on production", () => {
    const r = buildRobots({ NEXT_PUBLIC_APP_URL: "https://giftping.example", VERCEL_ENV: "production" });
    expect(r.sitemap).toBe("https://giftping.example/sitemap.xml");
  });
  it("blocks everything on preview/staging deployments, but not locally or in production", () => {
    expect(buildRobots({ VERCEL_ENV: "preview" })).toEqual({ rules: [{ userAgent: "*", disallow: "/" }] });
    expect(buildRobots({ VERCEL_ENV: "development" })).toEqual({ rules: [{ userAgent: "*", disallow: "/" }] });
    expect(JSON.stringify(buildRobots({}))).toContain("/admin");
    expect(JSON.stringify(buildRobots({ VERCEL_ENV: "production" }))).toContain("/admin");
  });
  it("blocks query-string catalogue variants without using a global query rule", () => {
    const robots = JSON.stringify(buildRobots({ NEXT_PUBLIC_APP_URL: "https://giftping.example", VERCEL_ENV: "production" }));
    for (const rule of CRAWL_QUERY_PATHS) expect(robots).toContain(rule);
    // `/*?` would also block /_next/image?url=..., so the rules must stay path-specific.
    expect(robots).not.toContain('"/*?*"');
  });
  it("marks only shop/category query pages as noindex", () => {
    expect(isNoIndexQuery("/shop", "?sort=newest")).toBe(true);
    expect(isNoIndexQuery("/shop/fashion-apparel/socks-innerwear", "?vendor=x")).toBe(true);
    expect(isNoIndexQuery("/shop/fashion-apparel/socks-innerwear.rsc", "?_rsc=abc")).toBe(true);
    expect(isNoIndexQuery("/categories/birthday", "?page=2")).toBe(true);
    expect(isNoIndexQuery("/shop/fashion-apparel/socks-innerwear", "")).toBe(false);
    expect(isNoIndexQuery("/categories/birthday", "")).toBe(false);
    expect(isNoIndexQuery("/products/luxe-memory-hamper", "?utm_source=x")).toBe(false);
    expect(isNoIndexQuery("/_next/image", "?url=%2Fhero.jpg")).toBe(false);
  });
});

describe("sitemap", () => {
  const env = { NEXT_PUBLIC_APP_URL: "https://giftping.example" };
  const src: SitemapSource = {
    noindexKeys: new Set(),
    categories: [{ slug: "birthday", updated_at: "2026-09-01T00:00:00Z" }],
    vendors: [{ slug: "lumiere-keepsakes", updated_at: null }],
    products: [{ slug: "luxe-memory-hamper", updated_at: "2026-10-01T10:00:00Z" }, { slug: "luxe-memory-hamper", updated_at: null }],
    relationships: ["mom"],
    productTypePaths: [{ path: "/shop/jewellery", updated_at: "2026-10-16T00:00:00Z" }, { path: "/shop/jewellery/necklaces", updated_at: null }],
  };
  const urls = (s: SitemapSource) => buildSitemapEntries(s, env).map((e) => e.url);

  it("lists the fixed pages, legal pages and every category/boutique/product/relationship", () => {
    const u = urls(src);
    for (const expected of ["https://giftping.example", "https://giftping.example/mall", "https://giftping.example/corporate-gifting", "https://giftping.example/categories", "https://giftping.example/privacy", "https://giftping.example/categories/birthday", "https://giftping.example/vendors/lumiere-keepsakes", "https://giftping.example/products/luxe-memory-hamper", "https://giftping.example/gifts-for/mom", "https://giftping.example/shop/jewellery", "https://giftping.example/shop/jewellery/necklaces"]) expect(u).toContain(expected);
  });
  it("de-duplicates", () => {
    const u = urls(src);
    expect(new Set(u).size).toBe(u.length);
  });
  it("leaves out pages the admin marked noindex", () => {
    const u = urls({ ...src, noindexKeys: new Set(["about", "mall"]) });
    expect(u).not.toContain("https://giftping.example/about");
    expect(u).not.toContain("https://giftping.example/mall");
    expect(u).toContain("https://giftping.example/contact");
  });
  it("includes lastModified only when known and valid", () => {
    const e = buildSitemapEntries({ ...src, products: [{ slug: "a", updated_at: "not a date" }, { slug: "b", updated_at: "2026-10-01T10:00:00Z" }] }, env);
    expect(e.find((x) => x.url.endsWith("/products/a"))).not.toHaveProperty("lastModified");
    expect(e.find((x) => x.url.endsWith("/products/b"))?.lastModified).toEqual(new Date("2026-10-01T10:00:00Z"));
  });
  it("escapes slugs so odd characters can't break out of a URL", () => {
    expect(urls({ ...src, products: [{ slug: "a b/c?d", updated_at: null }] })).toContain("https://giftping.example/products/a%20b%2Fc%3Fd");
  });
});

describe("seoSchema", () => {
  it("turns blanks into null and keeps the flag", () => {
    expect(seoSchema.parse({ metaTitle: "", metaDescription: "  ", noindex: false })).toEqual({ metaTitle: null, metaDescription: null, noindex: false });
  });
  it("its own output re-parses as input", () => {
    const once = seoSchema.parse({ metaTitle: "  Hello ", metaDescription: "A description", noindex: true });
    expect(seoSchema.parse(once)).toEqual(once);
    expect(once.metaTitle).toBe("Hello");
  });
  it("rejects too-long text and line breaks", () => {
    expect(seoSchema.safeParse({ metaTitle: "x".repeat(71), metaDescription: null, noindex: false }).success).toBe(false);
    expect(seoSchema.safeParse({ metaTitle: null, metaDescription: "x".repeat(201), noindex: false }).success).toBe(false);
    expect(seoSchema.safeParse({ metaTitle: "a\nb", metaDescription: null, noindex: false }).success).toBe(false);
    expect(seoSchema.safeParse({ metaTitle: "x".repeat(70), metaDescription: "x".repeat(200), noindex: false }).success).toBe(true);
  });
});
