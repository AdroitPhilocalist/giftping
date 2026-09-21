import { describe, expect, it } from "vitest";
import { IMAGE_POSITIONS, MALL_ZONES, PLAN_POSITIONS } from "./mall";

describe("mall directory", () => {
  it("has nine numbered places with unique ids and numbers 1..9", () => {
    expect(MALL_ZONES).toHaveLength(9);
    expect(MALL_ZONES.map((z) => z.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(MALL_ZONES.map((z) => z.id)).size).toBe(9);
  });
  it("every place links to a real site route (a path, never an external URL)", () => {
    for (const z of MALL_ZONES) expect(z.href, z.id).toMatch(/^\/[a-z0-9/-]*$/);
  });
  it("every place has a position on both the drawn plan and the illustration, inside the artwork", () => {
    for (const z of MALL_ZONES) for (const set of [PLAN_POSITIONS, IMAGE_POSITIONS]) {
      const p = set[z.id];
      expect(p, z.id).toBeDefined();
      expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(100);
      expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(100);
    }
  });
  it("no two markers sit on top of each other", () => {
    for (const set of [PLAN_POSITIONS, IMAGE_POSITIONS]) {
      const pts = Object.values(set);
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(8);
    }
  });
});
