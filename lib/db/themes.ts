import { createClient } from "@/lib/db/server";
import { resolveScheduledThemeId, type ThemeScheduleRow } from "@/lib/theme/schedule";

/**
 * The theme id that should be live right now, from the schedule. Two layers decide, same shape as
 * lib/db/banners.ts: row-level security only ever returns rows that are live RIGHT NOW to a non-admin
 * session (so a scheduled festival can't be discovered early through the API), and resolveScheduledThemeId()
 * re-applies the same status check in case more than one happens to be live at once. A failure here must
 * never break the page — it just means nobody sees a scheduled theme yet.
 */
export async function getScheduledThemeId(): Promise<string | null> {
  try {
    const { data, error } = await (await createClient()).from("site_themes").select("id, theme_id, starts_at, ends_at, is_active, created_at");
    if (error) throw error;
    const rows: ThemeScheduleRow[] = (data ?? []).map((r) => ({
      id: r.id,
      themeId: r.theme_id,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
    return resolveScheduledThemeId(rows);
  } catch (error) {
    console.error("Couldn't load the theme schedule", error);
    return null;
  }
}
