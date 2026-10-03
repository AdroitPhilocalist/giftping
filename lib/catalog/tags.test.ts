import { describe, expect, it } from "vitest";
import { worldTagFor } from "./tags";

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
