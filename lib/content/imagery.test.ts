import { describe, expect, it } from "vitest";
import { siteImage } from "./imagery";

describe("siteImage", () => {
  it("returns null (=> draw the placeholder) for artwork that doesn't exist yet", () => {
    // a key that will never be delivered, so this stays true as artwork arrives
    expect(siteImage("world-not-delivered")).toBeNull();
    expect(siteImage("world-not-delivered", "diwali")).toBeNull();
  });
  it("falls back to the native artwork for a theme that has none of its own", () => {
    const native = siteImage("mall-map");
    expect(siteImage("mall-map", "diwali")).toEqual(native);
  });
  it("never throws on hostile theme ids, and never serves another entry for them", () => {
    const native = siteImage("mall-map");
    expect(siteImage("mall-map", "__proto__")).toEqual(native);
    expect(siteImage("mall-map", "../../etc")).toEqual(native);
    expect(siteImage("world-not-delivered", "__proto__")).toBeNull();
  });
});
