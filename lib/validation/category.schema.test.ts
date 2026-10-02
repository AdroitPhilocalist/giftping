import { describe, expect, it } from "vitest";
import { categorySchema } from "./category.schema";

const valid = { name: "Housewarming", slug: "housewarming", description: "For a new home.", themeColor: "#1A4731", metaTitle: "", metaDescription: "", isActive: true, isFeatured: false };

describe("categorySchema", () => {
  it("accepts a valid category", () => {
    expect(categorySchema.safeParse(valid).success).toBe(true);
  });
  it("lowercases and trims the slug", () => {
    const r = categorySchema.safeParse({ ...valid, slug: "  Corporate-Gifting  " });
    expect(r.success && r.data.slug).toBe("corporate-gifting");
  });
  it("rejects a slug with spaces, underscores or uppercase-only-after-trim characters", () => {
    expect(categorySchema.safeParse({ ...valid, slug: "for her" }).success).toBe(false);
    expect(categorySchema.safeParse({ ...valid, slug: "for_her" }).success).toBe(false);
    expect(categorySchema.safeParse({ ...valid, slug: "for--her" }).success).toBe(false);
  });
  it("rejects a missing or too-short name", () => {
    expect(categorySchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(categorySchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });
  it("turns a blank description/colour/meta fields into null", () => {
    const r = categorySchema.safeParse({ ...valid, description: "", themeColor: "", metaTitle: "", metaDescription: "" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.description).toBeNull();
    expect(r.success && r.data.themeColor).toBeNull();
  });
  it("survives re-parsing its own output (parsed once client-side, again independently server-side)", () => {
    const first = categorySchema.parse(valid);
    expect(categorySchema.safeParse(first).success).toBe(true);
    const withBlanks = categorySchema.parse({ ...valid, description: "", themeColor: "" });
    expect(categorySchema.safeParse(withBlanks).success).toBe(true);
  });
});
