-- ============================================================================
-- Stage 11 — homepage banners (admin-managed hero carousel)
--
--  * Real constraints on the table Stage 1 left open (lengths, a safe link shape, a sane date window).
--  * PUBLIC READ now means "live right now": a scheduled campaign's banner (its image and copy) is not readable through the API before it starts, nor after it
--    ends. Previously any is_active row was readable by anyone, which would have leaked an upcoming sale.
--  * A public `site-banners` bucket with NO client write policies — every byte is re-encoded by the admin upload route (same model as product-images).
-- ============================================================================
alter table public.banners
  add column alt_text text,
  add column storage_path text,          -- the -full object in the site-banners bucket; the -medium sibling is derived from it
  add column image_medium_url text,
  add column updated_at timestamptz not null default now();

alter table public.banners
  add constraint banners_headline_length check (headline is null or char_length(headline) <= 80),
  add constraint banners_subheading_length check (subheading is null or char_length(subheading) <= 200),
  add constraint banners_cta_text_length check (cta_text is null or char_length(cta_text) <= 30),
  add constraint banners_alt_text_length check (alt_text is null or char_length(alt_text) <= 160),
  -- a path on this site ("/categories/birthday") or an https URL; never javascript:, data:, "//host" or anything with spaces/backslashes
  add constraint banners_cta_url_safe check (cta_url is null or cta_url ~ '^(/|/[^/\\\s][^\s\\]*|https://[^\s\\]+)$'),
  add constraint banners_window_order check (starts_at is null or ends_at is null or ends_at > starts_at);

create index banners_display_idx on public.banners (is_active, sort_order);
create trigger set_banners_updated_at before update on public.banners for each row execute function public.set_updated_at();

drop policy banners_select_active_or_admin on public.banners;
create policy banners_select_live_or_admin on public.banners
  for select using (
    public.is_admin()
    or (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-banners', 'site-banners', true, 5242880, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
