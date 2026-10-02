import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { fetchAllRows } from "@/lib/db/paginate";
import { PAID_ORDER_STATUSES } from "@/lib/db/admin-stats";
import { SEGMENTS, pickSegment, type SegmentKey, type SegmentOrder } from "./segments";

const MAX_ROWS = 200_000;

export interface Subscriber {
  id: string;
  email: string;
  fullName: string | null;
}

/**
 * Everyone currently opted in AND still a real, active customer account. This is the only place "who can receive marketing" is
 * defined — campaigns queue from it and re-check against it at send time. Names/emails are read here (the email has to go
 * somewhere) but only ever handed to the sender; the admin UI shows counts, never lists of addresses.
 */
export async function loadSubscribers(): Promise<Subscriber[]> {
  const admin = createAdminClient();
  const { rows } = await fetchAllRows(
    (a, b) =>
      admin
        .from("users")
        .select("id, email, full_name")
        .eq("role", "customer")
        .eq("marketing_opt_in", true)
        .eq("is_active", true)
        .is("deleted_at", null)
        .is("anonymized_at", null)
        .not("email", "is", null)
        .order("id", { ascending: true })
        .range(a, b),
    { maxRows: MAX_ROWS },
  );
  return rows.map((u) => ({ id: u.id, email: u.email, fullName: u.full_name }));
}

async function loadPaidOrders(): Promise<SegmentOrder[]> {
  const admin = createAdminClient();
  const { rows } = await fetchAllRows(
    (a, b) =>
      admin
        .from("orders")
        .select("customer_id, placed_at")
        .in("status", PAID_ORDER_STATUSES)
        .order("placed_at", { ascending: true })
        .order("id", { ascending: true })
        .range(a, b),
    { maxRows: MAX_ROWS },
  );
  return rows.filter((o): o is SegmentOrder => o.placed_at !== null);
}

/** The subscribers in one segment (full records — for queueing a campaign). */
export async function resolveAudience(segment: SegmentKey, now = new Date()): Promise<Subscriber[]> {
  const subscribers = await loadSubscribers();
  if (segment === "all") return subscribers;
  const ids = new Set(pickSegment(segment, subscribers.map((s) => s.id), await loadPaidOrders(), now));
  return subscribers.filter((s) => ids.has(s.id));
}

/** How many people each segment would reach — counts only. */
export async function audienceCounts(now = new Date()): Promise<Record<SegmentKey, number>> {
  const subscribers = await loadSubscribers();
  const ids = subscribers.map((s) => s.id);
  const orders = subscribers.length > 0 ? await loadPaidOrders() : [];
  return Object.fromEntries(SEGMENTS.map((s) => [s.key, pickSegment(s.key, ids, orders, now).length])) as Record<SegmentKey, number>;
}
