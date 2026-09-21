import { describe, expect, it } from "vitest";
import { siteImage } from "./imagery";

describe("siteImage", () => {
  it("returns null (=> draw the placeholder) for artwork that doesn't exist yet", () => {
    expect(siteImage("hero-atrium")).toBeNull();
    expect(siteImage("hero-atrium", "diwali")).toBeNull();
  });
  it("never throws on hostile theme ids", () => {
    expect(siteImage("mall-map", "__proto__")).toBeNull();
    expect(siteImage("mall-map", "../../etc")).toBeNull();
  });
});
