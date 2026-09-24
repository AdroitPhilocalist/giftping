import { describe, expect, it } from "vitest";
import { giftsForHref } from "./gift-links";

describe("giftsForHref", () => {
  it("sends each kind of relationship to the matching shop page", () => {
    expect(giftsForHref("Mother")).toBe("/gifts-for/parents");
    expect(giftsForHref("Grandparent")).toBe("/gifts-for/parents");
    expect(giftsForHref("Husband")).toBe("/gifts-for/partner");
    expect(giftsForHref("Partner")).toBe("/gifts-for/partner");
    expect(giftsForHref("Friend")).toBe("/gifts-for/friends");
    expect(giftsForHref("Colleague")).toBe("/gifts-for/colleagues");
    expect(giftsForHref("Boss")).toBe("/gifts-for/colleagues");
    expect(giftsForHref("Daughter")).toBe("/gifts-for/kids");
  });
  it("falls back to the whole mall", () => {
    expect(giftsForHref("Other")).toBe("/categories");
    expect(giftsForHref(null)).toBe("/categories");
    expect(giftsForHref("")).toBe("/categories");
  });
});
