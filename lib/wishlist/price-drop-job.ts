import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { fetchAllRows } from "@/lib/db/paginate";
import { appBaseUrl, notifyUser } from "@/lib/notifications/notify";
import { buildPriceDropEmail } from "@/lib/notifications/templates";
import { formatCurrency } from "@/lib/utils/format";
import {
  COOLDOWN_DAYS,
  buildDigests,
  classifyPriceDrop,
  effectivePrice,
  type AlertProduct,
  type DropEvent,
  type Digest,
} from "./price-drops";

const CHUNK = 100; // ids per `.in()` — keeps the request URL comfortably short
const MAX_EVENTS = 5000;
const MAX_WISHLIST_ROWS = 100_000;
const SEND_BATCH = 10; // notifications sent concurrently
const NOTIFICATION_TYPE = "wishlist_price_drop";

const chunks = <T,>(list: T[], size = CHUNK): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export interface PriceDropReport {
  eventsSeen: number;
  /** drops announced to nobody because they were too old, reversed, or under the threshold */
  settled: number;
  expired: number;
  /** left queued because the product isn't live yet (e.g. awaiting admin re-approval) */
  waiting: number;
  productsAlerted: number;
  usersToNotify: number;
  usersNotified: number;
  truncated: boolean;
}

/**
 * Tell people when something in their wishlist got cheaper. Runs from the daily cron.
 *
 * Exactly-once leaning to AT-MOST-once: a product's queued events are CLAIMED (processed_at set, atomically, only if still
 * unclaimed) BEFORE anyone is notified, so two overlapping runs — or a retry after a crash — can never send the same alert twice.
 * The cost of that choice is that a crash between claim and send loses that product's alert; for a "price dropped" nudge a
 * missed email is far better than a duplicate. `notifyUser` itself never throws.
 */
export async function runPriceDropAlerts({ dryRun = false, now = new Date() }: { dryRun?: boolean; now?: Date } = {}): Promise<PriceDropReport> {
  const admin = createAdminClient();
  const report: PriceDropReport = { eventsSeen: 0, settled: 0, expired: 0, waiting: 0, productsAlerted: 0, usersToNotify: 0, usersNotified: 0, truncated: false };

  const queued = await fetchAllRows(
    (a, b) =>
      admin
        .from("price_drop_events")
        .select("id, product_id, old_price, new_price, created_at")
        .is("processed_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(a, b),
    { maxRows: MAX_EVENTS },
  );
  report.eventsSeen = queued.rows.length;
  report.truncated = queued.truncated;
  if (queued.rows.length === 0) return report;

  const eventsByProduct = new Map<string, (DropEvent & { id: string })[]>();
  for (const e of queued.rows) eventsByProduct.set(e.product_id, [...(eventsByProduct.get(e.product_id) ?? []), e]);

  // Current price + whether shoppers can actually buy it right now (live product AND approved boutique).
  const products = new Map<string, { name: string; slug: string; price: number; live: boolean }>();
  for (const ids of chunks([...eventsByProduct.keys()])) {
    const { data, error } = await admin.from("products").select("id, name, slug, base_price, sale_price, status, vendor:vendors ( status )").in("id", ids);
    if (error) throw error;
    for (const p of data ?? []) {
      products.set(p.id, { name: p.name, slug: p.slug, price: effectivePrice(p.base_price, p.sale_price), live: p.status === "active" && one(p.vendor)?.status === "approved" });
    }
  }

  // Decide per product. `finish` = events we're done with (claimed); `wait` ones stay queued for a later run.
  const finish: { productId: string; ids: string[]; alert?: Omit<AlertProduct, "productId" | "name" | "slug"> }[] = [];
  for (const [productId, events] of eventsByProduct) {
    const p = products.get(productId);
    const verdict = p ? classifyPriceDrop({ events, currentPrice: p.price, live: p.live, now }) : ({ kind: "expire" } as const);
    const ids = events.map((e) => e.id);
    if (verdict.kind === "wait") report.waiting += 1;
    else if (verdict.kind === "expire") { report.expired += 1; finish.push({ productId, ids }); }
    else if (verdict.kind === "settle") { report.settled += 1; finish.push({ productId, ids }); }
    else finish.push({ productId, ids, alert: { from: verdict.from, to: verdict.to, percentOff: verdict.percentOff, since: verdict.since } });
  }

  // Claim before sending (see the doc comment). Only ids we actually flipped count as ours.
  const alerts: AlertProduct[] = [];
  for (const f of finish) {
    let claimed = true;
    if (!dryRun) {
      const { data, error } = await admin.from("price_drop_events").update({ processed_at: now.toISOString() }).in("id", f.ids).is("processed_at", null).select("id");
      if (error) throw error;
      claimed = (data?.length ?? 0) > 0; // another run got there first -> not ours to send
    }
    const p = products.get(f.productId);
    if (f.alert && claimed && p) alerts.push({ productId: f.productId, name: p.name, slug: p.slug, ...f.alert });
  }
  report.productsAlerted = alerts.length;
  if (alerts.length === 0) return report;

  // Who wishlisted them (paged — PostgREST clamps one response to ~1,000 rows).
  const wishlist: { user_id: string; product_id: string; created_at: string }[] = [];
  for (const ids of chunks(alerts.map((a) => a.productId))) {
    const rows = await fetchAllRows(
      (a, b) => admin.from("wishlists").select("user_id, product_id, created_at").in("product_id", ids).order("id", { ascending: true }).range(a, b),
      { maxRows: MAX_WISHLIST_ROWS },
    );
    wishlist.push(...rows.rows);
    report.truncated ||= rows.truncated;
  }
  const userIds = [...new Set(wishlist.map((w) => w.user_id))];

  // Cooldown: anyone already alerted about the same product in the last COOLDOWN_DAYS (read back from their own notifications).
  const cooldown = new Set<string>();
  const since = new Date(now.getTime() - COOLDOWN_DAYS * 86_400_000).toISOString();
  for (const ids of chunks(userIds)) {
    const recent = await fetchAllRows(
      (a, b) => admin.from("notifications").select("user_id, metadata").eq("type", NOTIFICATION_TYPE).gte("created_at", since).in("user_id", ids).order("created_at", { ascending: true }).order("id", { ascending: true }).range(a, b),
      { maxRows: MAX_WISHLIST_ROWS },
    );
    for (const n of recent.rows) {
      const productIds = (n.metadata as { productIds?: unknown } | null)?.productIds;
      if (Array.isArray(productIds)) for (const id of productIds) cooldown.add(`${n.user_id}:${String(id)}`);
    }
  }

  const digests = buildDigests({ alerts, wishlist, cooldown });
  report.usersToNotify = digests.length;
  if (dryRun || digests.length === 0) return report;

  // Names + "is this account still real?" (a deleted/anonymised account gets nothing).
  const people = new Map<string, string>();
  for (const ids of chunks(digests.map((d) => d.userId))) {
    const { data, error } = await admin.from("users").select("id, full_name, deleted_at, anonymized_at").in("id", ids);
    if (error) throw error;
    for (const u of data ?? []) if (!u.deleted_at && !u.anonymized_at) people.set(u.id, (u.full_name ?? "").trim().split(/\s+/)[0] || "there");
  }

  const base = appBaseUrl();
  const send = async (d: Digest): Promise<boolean> => {
    const firstName = people.get(d.userId);
    if (!firstName) return false;
    const total = d.items.length + d.more;
    const first = d.items[0];
    const result = await notifyUser({
      userId: d.userId,
      category: "wishlist_alerts",
      type: NOTIFICATION_TYPE,
      title: total === 1 ? `Price drop: ${first.name}` : `Price drops on ${total} items in your wishlist`,
      message: total === 1 ? `${first.name} is now ${formatCurrency(first.to)} (was ${formatCurrency(first.from)}, ${first.percentOff}% off).` : `${d.items.slice(0, 3).map((i) => i.name).join(", ")}${total > 3 ? " and more" : ""} just got cheaper.`,
      linkUrl: "/wishlist",
      metadata: { productIds: d.items.map((i) => i.productId) },
      email: buildPriceDropEmail({
        firstName,
        items: d.items.map((i) => ({ name: i.name, url: `${base}/products/${i.slug}`, fromLabel: formatCurrency(i.from), toLabel: formatCurrency(i.to), percentOff: i.percentOff })),
        more: d.more,
        wishlistUrl: `${base}/wishlist`,
        preferencesUrl: `${base}/account/notifications`,
      }),
    });
    return result.inApp;
  };
  for (const batch of chunks(digests, SEND_BATCH)) {
    const outcomes = await Promise.all(batch.map(send));
    report.usersNotified += outcomes.filter(Boolean).length;
  }
  return report;
}
