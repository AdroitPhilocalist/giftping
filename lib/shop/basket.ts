import type { BoxTone } from "../../components/art/GiftBoxArt";

/**
 * The shopper's basket as the little woven-basket drawing shows it: which of their real items peek over the rim, where, and at what angle — plus
 * the "free delivery" nudge and the compact payload the header's mini-basket loads. Pure and tested; no React, no database.
 */
export interface BasketItem {
  id: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
}

export interface BasketTile extends BasketItem {
  /** centre x in the basket drawing's 200-wide coordinate space */
  x: number;
  /** degrees; alternating tilts so the photos look tucked in by hand, not stamped out in a row */
  tilt: number;
  /** the stand-in gift box colour for an item with no photo */
  tone: BoxTone;
}

export interface BasketLayout {
  tiles: BasketTile[];
  /** items that didn't fit over the rim — shown as "+N" */
  hidden: number;
  /** total units, for the badge */
  units: number;
}

/** What fits comfortably over the rim of the drawing. */
export const MAX_BASKET_TILES = 5;
const TILTS = [-9, 6, -4, 10, -7];
const TONES: BoxTone[] = ["green", "copper", "peach", "ivory"];

/**
 * Newest items are the LAST in the cart, so when there are more than fit we keep the most recent ones (the one just added is always visible) and
 * count the rest. Tiles are spread evenly across the rim, left to right in the order added.
 */
export function layoutBasket(items: readonly BasketItem[], max = MAX_BASKET_TILES): BasketLayout {
  const cap = Math.max(1, Math.floor(max));
  const visible = items.slice(-cap);
  const n = visible.length;
  return {
    tiles: visible.map((item, i) => ({
      ...item,
      x: n === 1 ? 100 : 52 + (i * 96) / (n - 1),
      tilt: TILTS[i % TILTS.length],
      tone: TONES[(items.length - n + i) % TONES.length],
    })),
    hidden: items.length - n,
    units: items.reduce((sum, it) => sum + Math.max(0, it.quantity), 0),
  };
}

/**
 * next/image's own resizing endpoint, for places that can't use <Image> (an SVG <image>): the 400px+ product renditions would otherwise be
 * downloaded in full just to be drawn at ~40px. The widths Next allows are fixed (128 is one of them).
 */
export function optimizedImageUrl(src: string, width = 128): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

export type DeliveryNudge =
  | { kind: "none" }
  | { kind: "progress"; boutique: string; remaining: number; pct: number }
  | { kind: "unlocked" };

/**
 * Free delivery is decided per boutique (each ships separately). For one summary line — the mini-basket's — pick the boutique closest to unlocking
 * it: the highest subtotal still under the threshold. If every boutique has reached it, say so.
 */
export function deliveryNudge(groups: readonly { vendorName: string; subtotal: number }[], threshold: number): DeliveryNudge {
  if (!(threshold > 0) || groups.length === 0) return { kind: "none" };
  const below = groups.filter((g) => g.subtotal < threshold);
  if (below.length === 0) return { kind: "unlocked" };
  const best = below.reduce((a, b) => (b.subtotal > a.subtotal ? b : a));
  return {
    kind: "progress",
    boutique: best.vendorName,
    remaining: Math.round((threshold - best.subtotal) * 100) / 100,
    // never show 100% while something is still missing
    pct: Math.min(99, Math.max(0, Math.round((best.subtotal / threshold) * 100))),
  };
}

export interface MiniBasketLine {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  quantity: number;
  lineTotal: number;
  /** can't be bought right now (delisted, out of stock…) */
  problem: boolean;
}

export interface MiniBasket {
  itemCount: number;
  subtotal: number;
  /** oldest first, newest last — capped */
  lines: MiniBasketLine[];
  nudge: DeliveryNudge;
}

export const MINI_BASKET_MAX_LINES = 12;

interface CartLike {
  groups: { vendorName: string; subtotal: number; lines: { id: string; name: string; slug: string; imageUrl: string | null; quantity: number; lineTotal: number; status: string }[] }[];
  itemCount: number;
  subtotal: number;
}

/** The small JSON the header's mini-basket loads: only what it shows (no personalisation text, addresses or anything else in the cart). */
export function miniBasket(cart: CartLike, freeDeliveryThreshold: number): MiniBasket {
  const lines = cart.groups.flatMap((g) => g.lines).slice(-MINI_BASKET_MAX_LINES);
  return {
    itemCount: cart.itemCount,
    subtotal: cart.subtotal,
    lines: lines.map((l) => ({ id: l.id, name: l.name, slug: l.slug, imageUrl: l.imageUrl, quantity: l.quantity, lineTotal: l.lineTotal, problem: l.status !== "ok" })),
    nudge: deliveryNudge(cart.groups, freeDeliveryThreshold),
  };
}

/** What the product page knows the moment something is added — enough to show it in the mini-basket before the server has re-read the cart. */
export interface AddedItem {
  slug: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  /** price per unit as the shopper saw it (options included) */
  unitPrice: number;
}

/**
 * A stable key per cart line that survives the server's answer replacing the provisional one: the product slug plus which occurrence of it this is
 * (a product can be in the cart twice with different options). The real line ids don't exist yet when we draw the provisional basket, so ids can't be used.
 */
export function displayKeys(lines: readonly { slug: string }[]): string[] {
  const seen = new Map<string, number>();
  return lines.map((l) => {
    const n = (seen.get(l.slug) ?? 0) + 1;
    seen.set(l.slug, n);
    return `${l.slug}#${n}`;
  });
}

/**
 * The basket as it will look once `added` is in it, built from the last basket we loaded (if any) — shown instantly while the real cart is fetched.
 * It only ever APPENDS a line; the server's answer then replaces it (it may fold the same product into an existing line, which is fine).
 */
export function withAddedLine(previous: MiniBasket | null, added: AddedItem): MiniBasket {
  const line: MiniBasketLine = {
    id: `pending:${added.slug}`,
    name: added.name,
    slug: added.slug,
    imageUrl: added.imageUrl,
    quantity: added.quantity,
    lineTotal: Math.round(added.unitPrice * added.quantity * 100) / 100,
    problem: false,
  };
  return {
    itemCount: (previous?.itemCount ?? 0) + added.quantity,
    subtotal: Math.round(((previous?.subtotal ?? 0) + line.lineTotal) * 100) / 100,
    lines: [...(previous?.lines ?? []), line].slice(-MINI_BASKET_MAX_LINES),
    nudge: previous?.nudge ?? { kind: "none" },
  };
}
