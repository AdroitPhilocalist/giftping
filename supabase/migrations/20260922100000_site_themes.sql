-- ============================================================================
-- Stage 12 — scheduled festival themes (admin-managed, additive over the native look)
--
--  * A "theme" is a set of CSS variable overrides that already ships in the client bundle
--    (app/themes/<id>.css) for every registered id — there is no secret content here the way a
--    banner's copy/image can be, so unlike banners this table has no real "hide it before it
--    starts" requirement. The same RLS shape is used anyway (public read = live rows only, admin
--    reads everything): getActiveTheme() runs for every visitor on every request, and reusing the
--    already-proven banners pattern is simpler than inventing a second one for one table.
--  * theme_id has NO database CHECK against the code registry (lib/theme/themes.ts) on purpose:
--    the registry changes every time a festival theme is added, and keeping an enum here in sync
--    would be one more place to remember. It is validated at the Server Action layer
--    (schedulableThemes()) before every write instead; a bad id can therefore only ever reach this
--    table via direct SQL, and simply falls back to the native theme (resolveTheme()) if it does —
--    never a broken page.
-- ============================================================================

create table public.site_themes (
  id uuid primary key default gen_random_uuid(),
  theme_id text not null,
  note text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_themes_theme_id_length check (char_length(theme_id) between 1 and 60),
  constraint site_themes_note_length check (note is null or char_length(note) <= 100),
  constraint site_themes_window_order check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index site_themes_display_idx on public.site_themes (is_active, starts_at);

alter table public.site_themes enable row level security;

create trigger set_site_themes_updated_at
  before update on public.site_themes
  for each row execute function public.set_updated_at();

create policy site_themes_select_live_or_admin on public.site_themes
  for select using (
    public.is_admin()
    or (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
  );

create policy site_themes_write_admin_only on public.site_themes
  for all using (public.is_admin()) with check (public.is_admin());
