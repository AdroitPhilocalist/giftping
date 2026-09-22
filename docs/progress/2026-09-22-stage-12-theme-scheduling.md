# Stage 12 (slice 7) — theme scheduling + admin preview

The mechanism `docs/design/DESIGN_DIRECTION.md` described from the start ("scheduled start/end in admin,
like banners, or an admin-only preview") is now built. No festival theme exists yet — the client hasn't
asked for one — so this slice is the machinery, proven with the two demo themes.

## Built

- **`site_themes` table** (migration `20260922100000_site_themes.sql`): `theme_id`, optional `note`/
  `starts_at`/`ends_at`, `is_active`. RLS reuses the banners shape exactly (`is_admin() OR live-right-now`)
  even though a theme's CSS ships in the public bundle regardless of scheduling — no real secrecy need,
  just the same proven pattern for one table rather than inventing a second one. **Deliberately no DB CHECK
  pinning `theme_id` to the code registry** (`lib/theme/themes.ts` changes every time a festival is added;
  keeping an enum in sync here would be one more thing to remember) — validated instead at the Server
  Action layer against `schedulableThemes()`; a bad id can only reach the table via direct SQL, and just
  falls back to native (`resolveTheme()`) if it ever does. Noted in the migration and here so it doesn't
  read as an oversight.
- **`lib/theme/schedule.ts`** (pure, tested — 11 cases): `themeScheduleStatus` (live/scheduled/paused/
  expired, same shape as `bannerStatus`) and `resolveScheduledThemeId` — when two schedules overlap (an
  admin's mistake, not something the form prevents), the one that **started most recently** wins, tie-
  broken by which was created most recently. Deliberate: bringing in a new festival is just "add it," never
  "remember to end the old one first."
- **`lib/db/themes.ts`** `getScheduledThemeId()` — same two-layer shape as `getHomeBanners()`.
- **`lib/theme/preview.ts`** `getThemePreviewOverride()` — reads the `gp_theme_preview` cookie, but only
  ever honours it after re-checking the *current* session is really an admin (never trusts the cookie's
  presence alone — a non-admin who sets it by hand is silently ignored, harmless since it's cosmetic).
  React `cache()`-wrapped since both `getActiveTheme()` and the root layout's preview strip need it per
  request.
- **`getActiveTheme()`** priority: admin's own preview → scheduled festival → native.
- **`/admin/themes`**: a preview panel (try any registered theme, including the demo ones, in your own
  browser only) + a schedule list/dialog for `schedulableThemes()` (currently empty — an honest empty state
  explains why and links `/design`, rather than pretending a festival exists). A floating "Previewing X —
  visible to you only · Stop" strip (`ThemePreviewStrip`) now shows on every page while an admin is
  previewing, not just on the admin screen.
- `lib/admin/theme-actions.ts`: `saveThemeScheduleAction`/`setThemeScheduleActiveAction`/
  `deleteThemeScheduleAction` (role-gated, mirror `banner-actions.ts`) + `setThemePreviewAction` (sets/
  clears the cookie, `requireRole("admin")`).

## Verified

tsc, eslint, vitest (254, incl. the 11 new schedule tests and the theme-safety guard), `next build`.
Browser: the preview panel and the honest "no festival theme yet" empty state, and the floating preview
strip, via a temporary page mounting the components directly (admin routes need a session I don't create;
removed after). **Not seen in a real admin session**: clicking a preview button and watching the whole site
restyle across a real navigation, and scheduling a theme end-to-end. The mechanism is the same one already
proven working on `/design` (client-side) plus the same `data-theme` attribute banners' scheduling code
already uses — please click through `/admin/themes` once when you're free.

## Still open

No festival theme built (waiting on the client to ask, per `CLAUDE.md`). When one is: `app/themes/<id>.css`
+ a `festival` entry in `THEMES` + artwork keys in `lib/content/imagery.ts` is all that's needed — it then
appears automatically in both the preview panel and the schedule dialog on `/admin/themes`.
