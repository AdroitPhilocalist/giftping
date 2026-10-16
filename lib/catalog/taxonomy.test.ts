import { describe, expect, it } from "vitest";
import { TAXONOMY, flattenTaxonomy } from "./taxonomy";

const { types, attributes } = flattenTaxonomy();
const typeBySlug = new Map(types.map((t) => [t.slug, t]));
const attrsByType = new Map<string, typeof attributes>();
for (const a of attributes) attrsByType.set(a.typeSlug, [...(attrsByType.get(a.typeSlug) ?? []), a]);

/** every attribute a product of this type would be asked for: its own plus every ancestor's */
function effectiveAttributes(slug: string) {
  const out: typeof attributes = [];
  for (let cursor: string | null = slug; cursor; cursor = typeBySlug.get(cursor)?.parentSlug ?? null) out.push(...(attrsByType.get(cursor) ?? []));
  return out;
}

describe("taxonomy — types", () => {
  it("is a real, broad taxonomy", () => {
    expect(types.filter((t) => t.depth === 0).length).toBeGreaterThanOrEqual(20);
    expect(types.length).toBeGreaterThan(150);
    expect(Math.max(...types.map((t) => t.depth))).toBeLessThanOrEqual(2); // three levels at most — the vendor form and breadcrumbs are built for that
  });

  it("has globally unique, URL-safe slugs within the database's limits", () => {
    expect(new Set(types.map((t) => t.slug)).size).toBe(types.length);
    for (const t of types) {
      expect(t.slug, t.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(t.slug.length, t.slug).toBeGreaterThanOrEqual(2);
      expect(t.slug.length, t.slug).toBeLessThanOrEqual(60);
      expect(t.name.length, t.name).toBeGreaterThanOrEqual(2);
      expect(t.name.length, t.name).toBeLessThanOrEqual(60);
      if (t.description) expect(t.description.length, t.slug).toBeLessThanOrEqual(300);
    }
  });

  it("lists every parent before its children and never loses a child", () => {
    const seen = new Set<string>();
    for (const t of types) {
      if (t.parentSlug) expect(seen.has(t.parentSlug), `${t.slug} before its parent`).toBe(true);
      seen.add(t.slug);
    }
  });

  it("describes every top-level type (the /shop cards and search results use it)", () => {
    for (const t of types.filter((x) => x.depth === 0)) expect(t.description, t.slug).toBeTruthy();
  });

  it("keeps every slug the demo catalogue already uses", () => {
    for (const slug of [
      "gift-hampers-boxes", "candles-home-fragrance", "home-living", "flowers-plants", "chocolates-sweets", "leather-stationery", "jewellery", "necklaces", "earrings",
      "bangles-bracelets", "pendants", "wedding-festive", "baby-kids", "personalized-gifts", "watches-accessories", "plants",
    ]) expect(typeBySlug.has(slug), slug).toBe(true);
    expect(typeBySlug.get("necklaces")?.parentSlug).toBe("jewellery");
  });
});

describe("taxonomy — attributes", () => {
  it("gives every attribute a valid key, label and options the database and admin form accept", () => {
    expect(attributes.length).toBeGreaterThanOrEqual(120);
    for (const a of attributes) {
      const where = `${a.typeSlug}/${a.key}`;
      expect(a.key, where).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
      expect(a.key.length, where).toBeLessThanOrEqual(40);
      expect(a.label.length, where).toBeGreaterThanOrEqual(1);
      expect(a.label.length, where).toBeLessThanOrEqual(40);
      expect(a.options.length, where).toBeGreaterThanOrEqual(2); // a lone checkbox would submit a boolean, a lone dropdown is no choice
      expect(a.options.length, where).toBeLessThanOrEqual(30);
      expect(new Set(a.options).size, `${where} has a repeated option`).toBe(a.options.length);
      for (const o of a.options) {
        expect(o.trim(), where).toBe(o);
        expect(o.length, `${where}: ${o}`).toBeGreaterThanOrEqual(1);
        expect(o.length, `${where}: ${o}`).toBeLessThanOrEqual(60);
        // a filter is sent in the URL as a comma-joined list, so a comma inside an option would split it in two
        expect(o, `${where}: ${o}`).not.toContain(",");
      }
    }
  });

  it("never defines the same key twice on one type", () => {
    for (const [slug, list] of attrsByType) expect(new Set(list.map((a) => a.key)).size, slug).toBe(list.length);
  });

  it("never redefines an inherited key (the vendor would be asked the same question twice)", () => {
    for (const t of types) {
      const eff = effectiveAttributes(t.slug);
      expect(new Set(eff.map((a) => a.key)).size, `${t.slug}: ${eff.map((a) => a.key).join(", ")}`).toBe(eff.length);
    }
  });

  it("keeps the questions put to a vendor manageable", () => {
    for (const t of types) expect(effectiveAttributes(t.slug).length, t.slug).toBeLessThanOrEqual(10);
  });

  it("keeps the option values the demo catalogue already stores", () => {
    const opts = (slug: string, key: string) => attributes.find((a) => a.typeSlug === slug && a.key === key)?.options ?? [];
    expect(opts("chocolates-sweets", "flavor")).toEqual(expect.arrayContaining(["Assorted", "Dark Chocolate", "Mithai"]));
    expect(opts("plants", "placement")).toContain("Indoor");
    expect(opts("jewellery", "metal")).toEqual(expect.arrayContaining(["Gold-plated", "Kundan"]));
    expect(opts("candles-home-fragrance", "scent")).toContain("Amber & Cedar");
  });

  it("is built from a tree whose flattening matches its size", () => {
    const count = (nodes: readonly { children?: readonly unknown[] }[]): number => nodes.reduce((n, x) => n + 1 + count((x.children ?? []) as never), 0);
    expect(count(TAXONOMY)).toBe(types.length);
  });
});
