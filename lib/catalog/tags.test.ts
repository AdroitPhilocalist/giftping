import { describe, expect, it } from "vitest";
import { worldOrClause, worldTagFor } from "./tags";

describe("worldTagFor", () => {
  it("treats occasion and recipient slugs as worlds", () => {
    expect(worldTagFor("birthday")).toEqual({ kind: "occasion", tag: "birthday" });
    expect(worldTagFor("thank-you")).toEqual({ kind: "occasion", tag: "thank-you" });
    expect(worldTagFor("for-her")).toEqual({ kind: "recipient", tag: "for-her" });
  });
  it("leaves every other category alone, including hostile slugs", () => {
    expect(worldTagFor("corporate-gifting")).toBeNull();
    expect(worldTagFor("festivals")).toBeNull();
    expect(worldTagFor("birthday,id.neq.1")).toBeNull();
    expect(worldTagFor("")).toBeNull();
  });
});

describe("worldOrClause", () => {
  it("unions the category with the tag", () => {
    expect(worldOrClause("abc", { kind: "occasion", tag: "birthday" })).toBe("category_id.eq.abc,occasion_tags.cs.{birthday}");
    expect(worldOrClause("abc", { kind: "recipient", tag: "for-him" })).toBe("category_id.eq.abc,recipient_tags.cs.{for-him}");
  });
});
