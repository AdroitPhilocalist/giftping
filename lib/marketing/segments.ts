/**
 * Who a campaign goes to. Pure and tested. Segments use ONLY purchase history — never diary content (the Gifting Diary is private
 * by design and has no admin read path) and nothing sensitive. Every segment starts from people who have opted in; a segment can
 * only narrow that, never widen it.
 */
export const SEGMENTS = [
  { key: "all", label: "Everyone who opted in", description: "Every customer who has opted in to marketing emails." },
  { key: "buyers", label: "Past buyers", description: "Opted-in customers who have placed at least one paid order." },
  { key: "non_buyers", label: "Haven't bought yet", description: "Opted-in customers with no paid order — a nudge to make a first purchase." },
  { key: "lapsed", label: "Lapsed buyers", description: "Opted-in customers who bought before, but not in the last 90 days." },
] as const;

export type SegmentKey = (typeof SEGMENTS)[number]["key"];
export const SEGMENT_KEYS = SEGMENTS.map((s) => s.key) as [SegmentKey, ...SegmentKey[]];
export const LAPSED_AFTER_DAYS = 90;

const DAY_MS = 86_400_000;

export interface SegmentOrder {
  customer_id: string;
  placed_at: string;
}

/** The ids (of the given opted-in subscribers) that belong to `segment`. Order-independent; never returns an id that wasn't passed in. */
export function pickSegment(segment: SegmentKey, subscriberIds: readonly string[], paidOrders: readonly SegmentOrder[], now: Date): string[] {
  if (segment === "all") return [...new Set(subscriberIds)];
  const lastOrder = new Map<string, number>();
  for (const o of paidOrders) {
    const t = Date.parse(o.placed_at);
    if (Number.isNaN(t)) continue;
    if (t > (lastOrder.get(o.customer_id) ?? -Infinity)) lastOrder.set(o.customer_id, t);
  }
  const cutoff = now.getTime() - LAPSED_AFTER_DAYS * DAY_MS;
  return [...new Set(subscriberIds)].filter((id) => {
    const last = lastOrder.get(id);
    if (segment === "buyers") return last !== undefined;
    if (segment === "non_buyers") return last === undefined;
    return last !== undefined && last < cutoff; // lapsed
  });
}
