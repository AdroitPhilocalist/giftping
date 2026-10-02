/**
 * Wishlist price-drop alerts — the decisions, as pure functions (no database, no clock of their own).
 * lib/wishlist/price-drop-job.ts does the reading, sending and bookkeeping around them.
 *
 * Source of the events: the `products_record_price_drop` trigger (supabase/migrations/20261002110000_price_drop_events.sql),
 * which queues a row whenever a live product's effective price falls by at least 5%.
 */

/** Same 5% the trigger uses — keep them in step. */
export const MIN_DROP_FRACTION = 0.05;
/** A queued drop whose product still isn't live again after this long is dropped, not announced weeks late. */
export const EVENT_EXPIRY_DAYS = 14;
/** One alert per person per product per this many days, so cycling a price up and down can't spam anyone. */
export const COOLDOWN_DAYS = 7;
/** Items listed in one digest (the in-app/email message says "and N more" beyond this). */
export const MAX_ITEMS_PER_DIGEST = 10;

const DAY_MS = 86_400_000;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** What a customer actually pays: the cheaper of sale and base (the form requires sale < base, the database doesn't enforce it). */
export function effectivePrice(base: number | string, sale: number | string | null | undefined): number {
  const b = Number(base);
  return sale === null || sale === undefined ? b : Math.min(Number(sale), b);
}

export interface DropEvent {
  created_at: string;
  old_price: number | string;
  new_price: number | string;
}

export type DropVerdict =
  /** too old to announce — mark done without sending */
  | { kind: "expire" }
  /** the product isn't live yet (e.g. awaiting admin re-approval of the vendor's edit) — keep the events queued */
  | { kind: "wait" }
  /** the price is back up (or the net drop is under the threshold) — mark done without sending */
  | { kind: "settle" }
  | { kind: "alert"; from: number; to: number; percentOff: number; since: string };

/**
 * Decide what to do with the queued events for ONE product.
 *  - `from` is the price shoppers last saw: the `old_price` of the earliest queued event. `to` is the price right now.
 *    Judging the NET change (not each event) means a drop that was later reversed — or a cut followed by a smaller rise —
 *    sends nothing unless the product genuinely costs ≥5% less than before.
 *  - `since` is when the first drop was recorded; anyone who wishlisted the product after that already saw the lower price.
 */
export function classifyPriceDrop(args: { events: DropEvent[]; currentPrice: number; live: boolean; now: Date }): DropVerdict {
  const sorted = [...args.events].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const first = sorted[0];
  if (!first) return { kind: "settle" };
  if (args.now.getTime() - Date.parse(first.created_at) > EVENT_EXPIRY_DAYS * DAY_MS) return { kind: "expire" };
  if (!args.live) return { kind: "wait" };
  const from = Number(first.old_price);
  const to = args.currentPrice;
  if (!(from > 0) || !(to < from) || from - to < from * MIN_DROP_FRACTION) return { kind: "settle" };
  return { kind: "alert", from: r2(from), to: r2(to), percentOff: Math.round(((from - to) / from) * 100), since: first.created_at };
}

export interface AlertProduct {
  productId: string;
  name: string;
  slug: string;
  from: number;
  to: number;
  percentOff: number;
  since: string;
}
export interface WishlistRow {
  user_id: string;
  product_id: string;
  created_at: string;
}
export type DigestItem = AlertProduct;
export interface Digest {
  userId: string;
  /** biggest percentage drops first, capped at MAX_ITEMS_PER_DIGEST */
  items: DigestItem[];
  /** how many more dropped beyond the cap */
  more: number;
}

/**
 * Turn "these products dropped" + "who wishlisted what" into at most ONE digest per person, so a boutique-wide sale is one
 * message, not one per item. A person is skipped for a product when they added it AFTER the drop was recorded (they saw the
 * lower price when they added it) or were already alerted about it within the cooldown (`cooldown` holds "userId:productId").
 * Pure and order-independent; users come out in a stable (sorted) order.
 */
export function buildDigests(args: { alerts: AlertProduct[]; wishlist: WishlistRow[]; cooldown: ReadonlySet<string> }): Digest[] {
  const byProduct = new Map(args.alerts.map((a) => [a.productId, a]));
  const perUser = new Map<string, DigestItem[]>();
  for (const w of args.wishlist) {
    const alert = byProduct.get(w.product_id);
    if (!alert) continue;
    if (Date.parse(w.created_at) >= Date.parse(alert.since)) continue; // added after the drop: they already saw this price
    if (args.cooldown.has(`${w.user_id}:${w.product_id}`)) continue;
    const list = perUser.get(w.user_id) ?? [];
    if (!list.some((i) => i.productId === alert.productId)) list.push(alert); // a duplicate wishlist row must not double-list
    perUser.set(w.user_id, list);
  }
  return [...perUser.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([userId, list]) => {
      const sorted = [...list].sort((a, b) => b.percentOff - a.percentOff || a.name.localeCompare(b.name));
      return { userId, items: sorted.slice(0, MAX_ITEMS_PER_DIGEST), more: Math.max(0, sorted.length - MAX_ITEMS_PER_DIGEST) };
    });
}
