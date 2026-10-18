import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/db/admin";
import { resolveScheduledThemeId, type ThemeScheduleRow } from "@/lib/theme/schedule";

/**
 * The tag every cached read of the schedule carries, so the admin theme actions can drop it the moment a
 * schedule changes (see lib/admin/theme-actions.ts) instead of leaving other visitors on the old theme
 * for up to REVALIDATE_SECONDS.
 */
export const SITE_THEMES_TAG = "site-themes";

/**
 * How long a resolved schedule may be reused. This is the one query every single request pays for —
 * getActiveTheme() runs from the root layout (and therefore on every prefetch too), so it is worth
 * paying for once. A minute of staleness at a festival's start/end boundary is invisible, and the
 * admin actions revalidate the tag anyway.
 */
const REVALIDATE_SECONDS = 60;

/**
 * The theme id that should be live right now, from the schedule, or null for the native default.
 *
 * Two layers decide, same shape as lib/db/banners.ts: RLS on site_themes only ever exposes rows that are
 * live RIGHT NOW to a non-admin session, and resolveScheduledThemeId() re-applies that same status check
 * in case more than one happens to be live at once (an admin's overlap). A failure here must never break
 * the page — it just means nobody sees a scheduled theme yet.
 *
 * WHY THE SERVICE ROLE, AND WHY THAT IS STILL SAFE
 * ------------------------------------------------
 * Caching across requests and reading cookies are mutually exclusive (Next: "accessing uncached data
 * sources such as headers or cookies inside a cache scope is not supported"), and the session-scoped
 * client reads cookies — so this read has to use a client that does not depend on the caller.
 *
 * The service role bypasses RLS, which is fine *here* and only here for three reasons:
 *   1. The schedule is global, not per-user: there is no row a visitor is entitled to see and another is not.
 *   2. The RLS predicate for a non-admin is exactly `is_active and now within [starts_at, ends_at]`, and
 *      resolveScheduledThemeId() applies precisely that predicate again. So the extra rows the service role
 *      can see (scheduled/paused/expired ones) are filtered back out before anything is returned: the value
 *      this function produces is always one a public reader could already have received.
 *   3. Theme ids are not secret — every schedulable id already ships in the client bundle
 *      (app/themes/<id>.css, lib/theme/themes.ts); see the header of the site_themes migration.
 *
 * Only the resolved *id* is returned, so the rows themselves never leave this function.
 *
 * Fail-soft note: an error resolves to null (= native theme) and that null is what gets cached, so a
 * transient database blip can hold the native theme for up to REVALIDATE_SECONDS. That is the same
 * fallback as before, just held slightly longer — never a broken page.
 *
 * When Cache Components (`cacheComponents`) lands (see the deferred Partial Prerendering item), this
 * should become `"use cache"` + `cacheTag(SITE_THEMES_TAG)` — `unstable_cache` is the pre-Cache-Components
 * equivalent and Next 16 lists it as replaced.
 */
export const getScheduledThemeId = unstable_cache(
  async (): Promise<string | null> => {
    try {
      const { data, error } = await createAdminClient()
        .from("site_themes")
        .select("id, theme_id, starts_at, ends_at, is_active, created_at");
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
  },
  ["scheduled-theme-id"],
  { tags: [SITE_THEMES_TAG], revalidate: REVALIDATE_SECONDS },
);
