import { createClient } from "@/lib/db/server";
import { findLinkedOrder, stepIndex, type DiaryPlanRow, type LinkedOrder } from "@/lib/diary/plans";
import type { DiaryContactRow, DiaryEventRow, DiaryGiftRow } from "@/lib/diary/view";

/**
 * Everything the diary shows, read with the USER's session: RLS (owner-only, no admin bypass) is what guarantees nobody
 * else's rows can appear here, whatever this query asks for.
 */
export async function getDiaryRows(userId: string) {
  const supabase = await createClient();
  const [contacts, events, gifts, plans, profile] = await Promise.all([
    supabase.from("diary_contacts").select("id, name, relationship, interests, gift_preferences, notes, budget_max, is_favorite, tagline, photo_url").eq("user_id", userId).order("name"),
    supabase.from("diary_events").select("id, contact_id, event_type, title, event_date, is_recurring, reminder_days, is_active, notes, created_at").eq("user_id", userId),
    supabase
      .from("gift_history")
      .select("id, contact_id, gift_name, product_id, event_type, amount, gifted_at, notes, item:order_items(product_id, product_name, product_image)")
      .eq("user_id", userId)
      .order("gifted_at", { ascending: false })
      .limit(500),
    supabase.from("diary_gift_plans").select("id, contact_id, event_id, occasion_date, product_id, gift_name, note, status, order_id, created_at").eq("user_id", userId).order("occasion_date", { ascending: false }).limit(500),
    supabase.from("users").select("timezone").eq("id", userId).single(),
  ]);
  for (const r of [contacts, events, gifts, plans]) if (r.error) throw r.error;

  const giftRows = (gifts.data ?? []).map((g) => {
    const item = Array.isArray(g.item) ? g.item[0] : g.item;
    return { ...g, product_id: g.product_id ?? item?.product_id ?? null, gift_name: g.gift_name ?? item?.product_name ?? null, image: item?.product_image ?? null, item: undefined };
  });
  const planRows = (plans.data ?? []) as DiaryPlanRow[];

  // A plan whose chosen product was really ordered is "ordered" without anyone saying so: look for those paid orders (the shopper's own, under RLS).
  const linkedOrders = new Map<string, LinkedOrder>();
  const open = planRows.filter((p) => p.product_id && stepIndex(p.status) < stepIndex("ordered"));
  if (open.length > 0) {
    const wanted = new Set(open.map((p) => p.product_id!));
    const since = open.reduce((min, p) => (p.created_at < min ? p.created_at : min), open[0].created_at);
    const { data: recent } = await supabase
      .from("orders")
      .select("id, order_number, status, created_at, placed_at, items:order_items(product_id)")
      .eq("customer_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100);
    const byOrder = new Map<string, { order: LinkedOrder; productIds: string[] }>();
    for (const o of recent ?? []) {
      const productIds = (o.items ?? []).map((i) => i.product_id).filter((id): id is string => !!id && wanted.has(id));
      if (productIds.length) byOrder.set(o.id, { order: { id: o.id, orderNumber: o.order_number, status: o.status, placedAt: o.placed_at ?? o.created_at }, productIds });
    }
    const newestFirst = Array.from(byOrder.values()).sort((a, b) => b.order.placedAt.localeCompare(a.order.placedAt));
    for (const p of open) {
      const found = findLinkedOrder(p, newestFirst);
      if (found) linkedOrders.set(p.id, found);
    }
  }

  return {
    contacts: (contacts.data ?? []) as DiaryContactRow[],
    events: (events.data ?? []) as DiaryEventRow[],
    gifts: giftRows as (DiaryGiftRow & { id: string })[],
    plans: planRows,
    linkedOrders,
    timezone: profile.data?.timezone ?? "Asia/Kolkata",
  };
}

export type DiaryRows = Awaited<ReturnType<typeof getDiaryRows>>;
