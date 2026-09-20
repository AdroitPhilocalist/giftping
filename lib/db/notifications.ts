import { cache } from "react";
import { createClient } from "@/lib/db/server";

/** Unread count for the navbar bell — one cheap head-only query, memoised per request. */
export const getUnreadNotificationCount = cache(async (userId: string): Promise<number> => {
  const { count } = await (await createClient())
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
});

export async function getNotifications(userId: string, limit = 50) {
  const { data, error } = await (await createClient())
    .from("notifications")
    .select("id, title, message, type, link_url, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
