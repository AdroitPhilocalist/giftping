import { describe, expect, it } from "vitest";
import { reviewSchema } from "./review.schema";

const valid = { rating: 5, title: "Lovely!", body: "This arrived beautifully wrapped and on time." };

describe("reviewSchema", () => {
  it("accepts a valid review", () => {
    expect(reviewSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects a rating outside 1-5", () => {
    expect(reviewSchema.safeParse({ ...valid, rating: 0 }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...valid, rating: 6 }).success).toBe(false);
  });
  it("rejects a non-integer rating", () => {
    expect(reviewSchema.safeParse({ ...valid, rating: 4.5 }).success).toBe(false);
  });
  it("requires a body of at least 10 characters", () => {
    expect(reviewSchema.safeParse({ ...valid, body: "Too short" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...valid, body: "Ten chars!" }).success).toBe(true);
  });
  it("makes title optional, turning a blank one into null", () => {
    const r = reviewSchema.safeParse({ ...valid, title: "" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.title).toBeNull();
    expect(reviewSchema.safeParse({ rating: 4, body: valid.body }).success).toBe(true);
  });
  it("survives re-parsing its own output", () => {
    const first = reviewSchema.parse(valid);
    expect(reviewSchema.safeParse(first).success).toBe(true);
  });
});
