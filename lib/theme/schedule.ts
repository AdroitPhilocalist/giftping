/**
 * Scheduled festival themes — pure and unit-tested, the same IST-calendar-day convention as coupons/banners
 * (see lib/admin/coupons.ts startOfDayIST/endOfDayIST, and lib/content/banners.ts for the same status shape).
 * A row is "live" when it's active and `now` falls within [starts_at, ends_at] (either bound optional).
 */
export interface ThemeScheduleRow {
  id: string;
  themeId: string;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export type ThemeScheduleStatus = "live" | "scheduled" | "paused" | "expired";

export function themeScheduleStatus(row: Pick<ThemeScheduleRow, "isActive" | "startsAt" | "endsAt">, now: Date = new Date()): ThemeScheduleStatus {
  if (!row.isActive) return "paused";
  if (row.startsAt && new Date(row.startsAt).getTime() > now.getTime()) return "scheduled";
  if (row.endsAt && new Date(row.endsAt).getTime() < now.getTime()) return "expired";
  return "live";
}

/**
 * The theme id that should be showing right now, or null for the native default. When more than one row is
 * live at once (an admin's overlap, not something the form prevents), the one that started most recently
 * wins, tie-broken by which was created most recently — so bringing in a new festival is just "add it",
 * never "remember to end the old one first".
 */
export function resolveScheduledThemeId(rows: ThemeScheduleRow[], now: Date = new Date()): string | null {
  const live = rows.filter((r) => themeScheduleStatus(r, now) === "live");
  if (live.length === 0) return null;
  const startMs = (r: ThemeScheduleRow) => (r.startsAt ? new Date(r.startsAt).getTime() : -Infinity);
  const winner = [...live].sort((a, b) => startMs(b) - startMs(a) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return winner.themeId;
}
