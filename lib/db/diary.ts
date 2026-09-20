import { createClient } from "@/lib/db/server";
import type { DiaryContactRow, DiaryEventRow, DiaryGiftRow } from "@/lib/diary/view";

/**
 * Everything the diary shows, read with the USER's session: RLS (owner-only, no admin bypass) is what guarantees nobody
 * else's rows can appear here, whatever this query asks for.
 */
export async function getDiaryRows(userId: string) {
  const supabase = await createClient();
  const [contacts, events, gifts, profile] = await Promise.all([
    supabase.from("diary_contacts").select("id, name, relationship, interests, gift_preferences, notes, budget_max, is_favorite").eq("user_id", userId).order("name"),
    supabase.from("diary_events").select("id, contact_id, event_type, title, event_date, is_recurring, reminder_days, is_active, notes").eq("user_id", userId),
    supabase
      .from("gift_history")
      .select("id, contact_id, gift_name, product_id, event_type, amount, gifted_at, item:order_items(product_id, product_name)")
      .eq("user_id", userId)
      .order("gifted_at", { ascending: false })
      .limit(500),
    supabase.from("users").select("timezone").eq("id", userId).single(),
  ]);
  for (const r of [contacts, events, gifts]) if (r.error) throw r.error;

  const giftRows = (gifts.data ?? []).map((g) => {
    const item = Array.isArray(g.item) ? g.item[0] : g.item;
    return { ...g, product_id: g.product_id ?? item?.product_id ?? null, gift_name: g.gift_name ?? item?.product_name ?? null, item: undefined };
  });

  return {
    contacts: (contacts.data ?? []) as DiaryContactRow[],
    events: (events.data ?? []) as DiaryEventRow[],
    gifts: giftRows as (DiaryGiftRow & { id: string })[],
    timezone: profile.data?.timezone ?? "Asia/Kolkata",
  };
}
