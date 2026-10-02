import { describe, expect, it } from "vitest";
import { MAX_BASKET_TILES, deliveryNudge, displayKeys, layoutBasket, miniBasket, optimizedImageUrl, withAddedLine } from "./basket";

const item = (n: number, quantity = 1) => ({ id: `i${n}`, name: `Item ${n}`, imageUrl: n % 2 ? `/img/${n}.webp` : null, quantity });

describe("layoutBasket", () => {
  it("is empty for no items", () => {
    expect(layoutBasket([])).toEqual({ tiles: [], hidden: 0, units: 0 });
  });
  it("centres a single item", () => {
    expect(layoutBasket([item(1)]).tiles[0].x).toBe(100);
  });
  it("spreads several items evenly across the rim, in the order added", () => {
    const l = layoutBasket([item(1), item(2), item(3)]);
    expect(l.tiles.map((t) => t.id)).toEqual(["i1", "i2", "i3"]);
    expect(l.tiles.map((t) => t.x)).toEqual([52, 100, 148]);
    expect(l.hidden).toBe(0);
  });
  it("keeps the NEWEST items when there are too many, and counts the rest", () => {
    const items = [1, 2, 3, 4, 5, 6, 7].map((n) => item(n));
    const l = layoutBasket(items);
    expect(l.tiles).toHaveLength(MAX_BASKET_TILES);
    expect(l.tiles.map((t) => t.id)).toEqual(["i3", "i4", "i5", "i6", "i7"]); // the one just added (last) is always visible
    expect(l.hidden).toBe(2);
  });
  it("adds up units across quantities, including items that are hidden", () => {
    expect(layoutBasket([item(1, 3), item(2, 2), item(3, 1), item(4, 1), item(5, 1), item(6, 4)]).units).toBe(12);
  });
  it("ignores a negative quantity when totalling", () => {
    expect(layoutBasket([item(1, -5), item(2, 2)]).units).toBe(2);
  });
  it("alternates tilts so tiles aren't all parallel, and every x stays inside the drawing", () => {
    const l = layoutBasket([1, 2, 3, 4, 5].map((n) => item(n)));
    expect(new Set(l.tiles.map((t) => t.tilt)).size).toBeGreaterThan(2);
    for (const t of l.tiles) {
      expect(t.x).toBeGreaterThanOrEqual(40);
      expect(t.x).toBeLessThanOrEqual(160);
    }
  });
  it("gives a photo-less item a stand-in colour, deterministically", () => {
    expect(layoutBasket([item(2)]).tiles[0].tone).toBe(layoutBasket([item(2)]).tiles[0].tone);
  });
  it("respects a custom cap and never goes below one tile", () => {
    expect(layoutBasket([item(1), item(2), item(3)], 2).tiles).toHaveLength(2);
    expect(layoutBasket([item(1), item(2)], 0).tiles).toHaveLength(1);
  });
});

describe("optimizedImageUrl", () => {
  it("routes through Next's resizer with the source encoded", () => {
    expect(optimizedImageUrl("https://x.supabase.co/storage/v1/object/public/a b.webp", 128)).toBe("/_next/image?url=https%3A%2F%2Fx.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fa%20b.webp&w=128&q=75");
    expect(optimizedImageUrl("/seed-images/hamper.webp")).toContain("w=128");
  });
});

describe("deliveryNudge", () => {
  it("says nothing without a threshold or items", () => {
    expect(deliveryNudge([{ vendorName: "A", subtotal: 100 }], 0)).toEqual({ kind: "none" });
    expect(deliveryNudge([], 999)).toEqual({ kind: "none" });
  });
  it("is unlocked when every boutique has reached the threshold (exactly at it counts)", () => {
    expect(deliveryNudge([{ vendorName: "A", subtotal: 999 }, { vendorName: "B", subtotal: 1500 }], 999)).toEqual({ kind: "unlocked" });
  });
  it("points at the boutique closest to unlocking it", () => {
    expect(deliveryNudge([{ vendorName: "A", subtotal: 200 }, { vendorName: "B", subtotal: 700 }, { vendorName: "C", subtotal: 1200 }], 1000)).toEqual({ kind: "progress", boutique: "B", remaining: 300, pct: 70 });
  });
  it("never shows 100% while something is missing, and rounds the money to paise", () => {
    expect(deliveryNudge([{ vendorName: "A", subtotal: 998.99 }], 999)).toEqual({ kind: "progress", boutique: "A", remaining: 0.01, pct: 99 });
  });
});

describe("miniBasket", () => {
  const line = (n: number, status = "ok") => ({ id: `l${n}`, name: `P${n}`, slug: `p-${n}`, imageUrl: null, quantity: 1, lineTotal: 100, status, personalization: { giftMessage: "secret" } });
  const cart = { groups: [{ vendorName: "A", subtotal: 300, lines: [line(1), line(2)] }, { vendorName: "B", subtotal: 100, lines: [line(3, "out_of_stock")] }], itemCount: 3, subtotal: 400 };
  it("flattens lines, flags problems and includes the nudge", () => {
    const m = miniBasket(cart, 999);
    expect(m.lines.map((l) => l.id)).toEqual(["l1", "l2", "l3"]);
    expect(m.lines[2].problem).toBe(true);
    expect(m.lines[0].problem).toBe(false);
    expect(m.nudge.kind).toBe("progress");
    expect(m.itemCount).toBe(3);
  });
  it("never leaks personalisation or other cart detail into the payload", () => {
    expect(JSON.stringify(miniBasket(cart, 999))).not.toContain("secret");
  });
  it("caps very long carts to the newest lines", () => {
    const big = { groups: [{ vendorName: "A", subtotal: 1, lines: Array.from({ length: 30 }, (_, i) => line(i)) }], itemCount: 30, subtotal: 3000 };
    const m = miniBasket(big, 999);
    expect(m.lines).toHaveLength(12);
    expect(m.lines.at(-1)?.id).toBe("l29");
  });
});

describe("displayKeys", () => {
  it("numbers repeat occurrences of the same product so keys stay unique and stable", () => {
    expect(displayKeys([{ slug: "a" }, { slug: "b" }, { slug: "a" }])).toEqual(["a#1", "b#1", "a#2"]);
    expect(displayKeys([])).toEqual([]);
  });
  it("gives a provisional line and the server's real line for the same product the SAME key (so the photo doesn't drop in twice)", () => {
    const prev = miniBasket({ groups: [{ vendorName: "A", subtotal: 500, lines: [{ id: "l1", name: "Old", slug: "old", imageUrl: null, quantity: 1, lineTotal: 500, status: "ok" }] }], itemCount: 1, subtotal: 500 }, 999);
    const provisional = withAddedLine(prev, { slug: "new", name: "New", imageUrl: "/n.webp", quantity: 1, unitPrice: 700 });
    const real = miniBasket({ groups: [{ vendorName: "A", subtotal: 1200, lines: [{ id: "l1", name: "Old", slug: "old", imageUrl: null, quantity: 1, lineTotal: 500, status: "ok" }, { id: "l2", name: "New", slug: "new", imageUrl: "/n.webp", quantity: 1, lineTotal: 700, status: "ok" }] }], itemCount: 2, subtotal: 1200 }, 999);
    expect(displayKeys(provisional.lines)).toEqual(displayKeys(real.lines));
  });
});

describe("withAddedLine", () => {
  const added = { slug: "hamper", name: "Hamper", imageUrl: "/h.webp", quantity: 2, unitPrice: 1499.5 };
  it("builds a one-line basket when there was none", () => {
    const b = withAddedLine(null, added);
    expect(b.itemCount).toBe(2);
    expect(b.subtotal).toBe(2999);
    expect(b.lines).toHaveLength(1);
    expect(b.lines[0]).toMatchObject({ name: "Hamper", quantity: 2, lineTotal: 2999, problem: false });
    expect(b.nudge).toEqual({ kind: "none" });
  });
  it("appends to an earlier basket (newest last), keeps its nudge, and adds up the totals", () => {
    const prev = { itemCount: 3, subtotal: 800, lines: [{ id: "x", name: "X", slug: "x", imageUrl: null, quantity: 3, lineTotal: 800, problem: false }], nudge: { kind: "unlocked" } as const };
    const b = withAddedLine(prev, added);
    expect(b.lines.map((l) => l.slug)).toEqual(["x", "hamper"]);
    expect(b.itemCount).toBe(5);
    expect(b.subtotal).toBe(3799);
    expect(b.nudge).toEqual({ kind: "unlocked" });
  });
  it("rounds money to paise", () => {
    expect(withAddedLine(null, { ...added, quantity: 3, unitPrice: 0.1 }).subtotal).toBe(0.3);
  });
  it("never grows past the mini-basket cap", () => {
    const lines = Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, name: `${i}`, slug: `s${i}`, imageUrl: null, quantity: 1, lineTotal: 1, problem: false }));
    const b = withAddedLine({ itemCount: 12, subtotal: 12, lines, nudge: { kind: "none" } }, added);
    expect(b.lines).toHaveLength(12);
    expect(b.lines.at(-1)?.slug).toBe("hamper");
  });
});
