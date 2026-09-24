import { describe, expect, it } from "vitest";
import { contactPatchSchema, contactSchema, planSchema } from "./diary.schema";

describe("contact tagline and in-place edits", () => {
  it("keeps a tagline (trimmed), drops an empty one, refuses a long one", () => {
    expect(contactSchema.parse({ name: "Mom", tagline: "  Always makes everyone feel special " }).tagline).toBe("Always makes everyone feel special");
    expect(contactSchema.parse({ name: "Mom", tagline: "   " }).tagline).toBeNull();
    expect(contactSchema.parse({ name: "Mom" }).tagline).toBeNull();
    expect(contactSchema.safeParse({ name: "Mom", tagline: "x".repeat(81) }).success).toBe(false);
  });

  it("a patch only carries what was sent", () => {
    expect(contactPatchSchema.parse({})).toEqual({});
    expect(contactPatchSchema.parse({ notes: " she likes jasmine " })).toEqual({ notes: "she likes jasmine" });
    expect(contactPatchSchema.parse({ interests: ["Sarees", "sarees", " Coffee "] })).toEqual({ interests: ["sarees", "coffee"] });
    expect(contactPatchSchema.parse({ budgetMax: "2500" })).toEqual({ budgetMax: 2500 });
    expect(contactPatchSchema.parse({ budgetMax: "" })).toEqual({ budgetMax: null });
  });

  it("a patch refuses nonsense: too many interests, a zero budget, a huge note", () => {
    expect(contactPatchSchema.safeParse({ interests: Array.from({ length: 16 }, (_, i) => `interest-${i}`) }).success).toBe(false);
    expect(contactPatchSchema.safeParse({ budgetMax: "0" }).success).toBe(false);
    expect(contactPatchSchema.safeParse({ notes: "n".repeat(1001) }).success).toBe(false);
    expect(contactPatchSchema.safeParse({ tagline: "t".repeat(81) }).success).toBe(false);
  });
});

describe("gift plan input", () => {
  const eventId = "6f1c1c0e-6a3a-4a52-9d5b-2b2b6a1f0a11";
  const productId = "0b0d7d0c-1c0e-4f3e-9a7b-3c6f5f8f9d22";

  it("accepts a date and an occurrence, with a product, a written idea or neither", () => {
    expect(planSchema.parse({ eventId, occasionDate: "2026-10-03" })).toMatchObject({ eventId, occasionDate: "2026-10-03", productId: null, giftName: null, note: null, status: null });
    expect(planSchema.parse({ eventId, occasionDate: "2026-10-03", productId, note: " she loves the scent " })).toMatchObject({ productId, note: "she loves the scent" });
    expect(planSchema.parse({ eventId, occasionDate: "2026-10-03", giftName: "Jasmine candle", status: "wrapped" })).toMatchObject({ giftName: "Jasmine candle", status: "wrapped" });
  });

  it("refuses a bad id, a bad date, an unknown step and over-long text", () => {
    expect(planSchema.safeParse({ eventId: "nope", occasionDate: "2026-10-03" }).success).toBe(false);
    expect(planSchema.safeParse({ eventId, occasionDate: "2026-02-30" }).success).toBe(false);
    expect(planSchema.safeParse({ eventId, occasionDate: "2026-10-03", status: "shipped" }).success).toBe(false);
    expect(planSchema.safeParse({ eventId, occasionDate: "2026-10-03", note: "n".repeat(301) }).success).toBe(false);
    expect(planSchema.safeParse({ eventId, occasionDate: "2026-10-03", giftName: "g".repeat(121) }).success).toBe(false);
  });
});
