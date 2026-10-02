import { describe, expect, it } from "vitest";
import { buildDigests, classifyPriceDrop, effectivePrice, type AlertProduct } from "./price-drops";

const now = new Date("2026-10-10T04:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe("effectivePrice", () => {
  it("is the base price with no sale price, and the sale price when it is lower", () => {
    expect(effectivePrice(1000, null)).toBe(1000);
    expect(effectivePrice("1000.00", "799.00")).toBe(799);
  });
  it("never lets a bad sale price above base raise the price", () => {
    expect(effectivePrice(1000, 1500)).toBe(1000);
  });
});

describe("classifyPriceDrop", () => {
  const ev = (old_price: number, new_price: number, at = daysAgo(1)) => ({ created_at: at, old_price, new_price });

  it("alerts on a real drop, measuring from the price shoppers last saw", () => {
    const v = classifyPriceDrop({ events: [ev(1000, 800)], currentPrice: 800, live: true, now });
    expect(v).toEqual({ kind: "alert", from: 1000, to: 800, percentOff: 20, since: daysAgo(1) });
  });

  it("judges the NET change across several queued events, from the earliest old price", () => {
    const v = classifyPriceDrop({ events: [ev(900, 800, daysAgo(1)), ev(1000, 900, daysAgo(3))], currentPrice: 800, live: true, now });
    expect(v).toMatchObject({ kind: "alert", from: 1000, to: 800, percentOff: 20, since: daysAgo(3) });
  });

  it("settles (no alert) when the drop was reversed", () => {
    expect(classifyPriceDrop({ events: [ev(1000, 700)], currentPrice: 1000, live: true, now })).toEqual({ kind: "settle" });
    expect(classifyPriceDrop({ events: [ev(1000, 700)], currentPrice: 1200, live: true, now })).toEqual({ kind: "settle" });
  });

  it("settles when a later rise leaves the net drop under 5%", () => {
    expect(classifyPriceDrop({ events: [ev(1000, 700)], currentPrice: 960, live: true, now })).toEqual({ kind: "settle" });
  });

  it("alerts at exactly 5% and not just under it", () => {
    expect(classifyPriceDrop({ events: [ev(1000, 950)], currentPrice: 950, live: true, now }).kind).toBe("alert");
    expect(classifyPriceDrop({ events: [ev(1000, 951)], currentPrice: 951, live: true, now }).kind).toBe("settle");
  });

  it("waits while the product isn't live (awaiting admin re-approval of the vendor's edit)", () => {
    expect(classifyPriceDrop({ events: [ev(1000, 800)], currentPrice: 800, live: false, now })).toEqual({ kind: "wait" });
  });

  it("expires events that waited too long, even if the product is live now", () => {
    expect(classifyPriceDrop({ events: [ev(1000, 800, daysAgo(15))], currentPrice: 800, live: true, now })).toEqual({ kind: "expire" });
    expect(classifyPriceDrop({ events: [ev(1000, 800, daysAgo(15))], currentPrice: 800, live: false, now })).toEqual({ kind: "expire" });
  });

  it("settles on no events or a nonsense old price instead of dividing by zero", () => {
    expect(classifyPriceDrop({ events: [], currentPrice: 800, live: true, now })).toEqual({ kind: "settle" });
    expect(classifyPriceDrop({ events: [ev(0, 0)], currentPrice: 0, live: true, now })).toEqual({ kind: "settle" });
  });
});

describe("buildDigests", () => {
  const alert = (id: string, percentOff: number, since = daysAgo(1)): AlertProduct => ({ productId: id, name: `Product ${id}`, slug: `p-${id}`, from: 1000, to: 1000 - percentOff * 10, percentOff, since });
  const wl = (user_id: string, product_id: string, created_at = daysAgo(30)) => ({ user_id, product_id, created_at });

  it("sends one digest per person listing all their dropped items, biggest drop first", () => {
    const d = buildDigests({ alerts: [alert("a", 10), alert("b", 40)], wishlist: [wl("u1", "a"), wl("u1", "b"), wl("u2", "a")], cooldown: new Set() });
    expect(d).toHaveLength(2);
    expect(d[0]).toMatchObject({ userId: "u1", more: 0 });
    expect(d[0].items.map((i) => i.productId)).toEqual(["b", "a"]);
    expect(d[1].items.map((i) => i.productId)).toEqual(["a"]);
  });

  it("ignores wishlisted products that didn't drop, and people with nothing to hear", () => {
    expect(buildDigests({ alerts: [alert("a", 10)], wishlist: [wl("u1", "zzz")], cooldown: new Set() })).toEqual([]);
  });

  it("skips someone who wishlisted the product AFTER the drop (they saw the lower price), but not before it", () => {
    const alerts = [alert("a", 10, daysAgo(2))];
    const d = buildDigests({ alerts, wishlist: [wl("early", "a", daysAgo(5)), wl("late", "a", daysAgo(1))], cooldown: new Set() });
    expect(d.map((x) => x.userId)).toEqual(["early"]);
  });

  it("respects the per-person, per-product cooldown without blocking their other products", () => {
    const d = buildDigests({ alerts: [alert("a", 10), alert("b", 10)], wishlist: [wl("u1", "a"), wl("u1", "b")], cooldown: new Set(["u1:a"]) });
    expect(d).toHaveLength(1);
    expect(d[0].items.map((i) => i.productId)).toEqual(["b"]);
  });

  it("doesn't double-list a product if the wishlist has a duplicate row", () => {
    const d = buildDigests({ alerts: [alert("a", 10)], wishlist: [wl("u1", "a"), wl("u1", "a")], cooldown: new Set() });
    expect(d[0].items).toHaveLength(1);
  });

  it("caps a digest and reports how many more dropped", () => {
    const alerts = Array.from({ length: 13 }, (_, i) => alert(String(i), 6 + i));
    const d = buildDigests({ alerts, wishlist: alerts.map((a) => wl("u1", a.productId)), cooldown: new Set() });
    expect(d[0].items).toHaveLength(10);
    expect(d[0].more).toBe(3);
    expect(d[0].items[0].percentOff).toBe(18); // biggest first
  });

  it("gives the same result whatever order the rows arrive in", () => {
    const alerts = [alert("a", 10), alert("b", 20)];
    const rows = [wl("u2", "a"), wl("u1", "b"), wl("u1", "a")];
    expect(buildDigests({ alerts, wishlist: rows, cooldown: new Set() })).toEqual(buildDigests({ alerts: [...alerts].reverse(), wishlist: [...rows].reverse(), cooldown: new Set() }));
  });
});
