import { describe, expect, it } from "vitest";
import { summariseOrders, type StatsOrder } from "./stats";

const item = (over: Partial<StatsOrder["items"][number]> = {}): StatsOrder["items"][number] => ({ product_id: "p1", product_name: "Hamper", vendor_id: "v1", vendor_name: "Originals", quantity: 1, total_price: 1000, discount_amount: 0, commission_amount: 100, ...over });
const order = (id: string, placed_at: string, total: number, items: StatsOrder["items"]): StatsOrder => ({ id, total_amount: total, placed_at, items });
const today = "2026-09-20";

describe("summariseOrders", () => {
  it("empty period: zeros, no divide-by-zero, a zero-filled daily series", () => {
    const s = summariseOrders([], { days: 7, today });
    expect(s).toMatchObject({ orders: 0, gmv: 0, aov: 0, commission: 0, unitsSold: 0, topProducts: [], topVendors: [] });
    expect(s.daily).toHaveLength(7);
    expect(s.daily[6].date).toBe("2026-09-20");
    expect(s.daily[0].date).toBe("2026-09-14");
    expect(s.daily.every((d) => d.gmv === 0)).toBe(true);
  });
  it("totals, average order value and commission", () => {
    const s = summariseOrders([order("a", "2026-09-20T10:00:00+05:30", 1500, [item({ total_price: 1500, commission_amount: 150 })]), order("b", "2026-09-19T10:00:00+05:30", 2500, [item({ total_price: 2500, commission_amount: 250, quantity: 2 })])], { days: 7, today });
    expect(s).toMatchObject({ orders: 2, gmv: 4000, aov: 2000, commission: 400, unitsSold: 3 });
  });
  it("buckets by IST day, not UTC (11:30pm IST is still 'today')", () => {
    const s = summariseOrders([order("a", "2026-09-20T23:30:00+05:30", 100, [item()])], { days: 3, today });
    expect(s.daily.find((d) => d.date === "2026-09-20")).toEqual({ date: "2026-09-20", gmv: 100, orders: 1 });
    const early = summariseOrders([order("b", "2026-09-20T00:10:00+05:30", 50, [item()])], { days: 3, today }); // still the 19th in UTC
    expect(early.daily.find((d) => d.date === "2026-09-20")!.gmv).toBe(50);
  });
  it("ranks products and vendors by revenue net of discounts, with stable ties", () => {
    const s = summariseOrders([order("a", "2026-09-20T10:00:00+05:30", 0, [
      item({ product_id: "p1", product_name: "A", vendor_id: "v1", vendor_name: "One", total_price: 1000, discount_amount: 400 }),
      item({ product_id: "p2", product_name: "B", vendor_id: "v2", vendor_name: "Two", total_price: 700, discount_amount: 0 }),
      item({ product_id: "p3", product_name: "C", vendor_id: "v2", vendor_name: "Two", total_price: 700, discount_amount: 0 }),
    ])], { days: 7, today });
    expect(s.topProducts.map((p) => p.name)).toEqual(["B", "C", "A"]); // A nets 600 after its discount; B and C tie at 700 -> alphabetical
    expect(s.topVendors.map((v) => [v.name, v.revenue])).toEqual([["Two", 1400], ["One", 600]]);
  });
  it("orders outside the window are ignored in the series but still counted in totals only if the caller passed them", () => {
    const s = summariseOrders([order("old", "2026-01-01T10:00:00+05:30", 999, [item()])], { days: 7, today });
    expect(s.daily.reduce((a, d) => a + d.gmv, 0)).toBe(0);
  });
  it("keeps only the top five", () => {
    const items = Array.from({ length: 8 }, (_, i) => item({ product_id: `p${i}`, product_name: `P${i}`, total_price: 100 * (i + 1) }));
    expect(summariseOrders([order("a", "2026-09-20T10:00:00+05:30", 3600, items)], { days: 7, today }).topProducts).toHaveLength(5);
  });
  it("ranks by revenue net of refunds and counts only the commission kept", () => {
    const s = summariseOrders([order("a", "2026-09-20T10:00:00+05:30", 0, [
      item({ product_id: "p1", product_name: "A", vendor_id: "v1", vendor_name: "One", total_price: 1000, refunded_amount: 800, commission_amount: 20 }),
      item({ product_id: "p2", product_name: "B", vendor_id: "v2", vendor_name: "Two", total_price: 500, commission_amount: 50 }),
    ])], { days: 3, today });
    expect(s.topProducts.map((p) => [p.name, p.revenue])).toEqual([["B", 500], ["A", 200]]);
    expect(s.commission).toBe(70);
  });
});
