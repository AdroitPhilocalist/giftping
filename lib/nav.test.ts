import { describe, expect, it } from "vitest";
import { isCurrent } from "./nav";

describe("isCurrent", () => {
  it("home is current only on the home page", () => {
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/vendors", "/")).toBe(false);
  });
  it("a section is current on itself and beneath it, not on a look-alike prefix", () => {
    expect(isCurrent("/vendors", "/vendors")).toBe(true);
    expect(isCurrent("/vendors/aurelia-gifts", "/vendors")).toBe(true);
    expect(isCurrent("/vendors-club", "/vendors")).toBe(false);
    expect(isCurrent("/categories/corporate-gifting", "/categories")).toBe(true);
  });
});
