-- Commission resolution (vendor override -> category default -> platform default) needs somewhere to
-- store the latter two. vendor_private.commission_rate (nullable = "no override") already covers the
-- first.

alter table public.categories
  add column commission_rate numeric(5, 2)
  check (commission_rate is null or commission_rate between 0 and 100);

-- Small typed key/value store for platform-wide knobs an admin should be able to change without a
-- deploy. Admin-only: nothing here is meant for customers or vendors to read directly.
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger set_platform_settings_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

create policy platform_settings_admin_all on public.platform_settings
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.platform_settings (key, value, description) values
  ('default_commission_rate', '10'::jsonb, 'Platform-wide commission % applied when neither the vendor nor the category overrides it');

-- Vendor uploads are resized server-side into fixed sizes (see lib/storage/resize.ts). url stays the
-- full-size image; the smaller renditions get their own columns so cards/emails never guess filenames.
alter table public.product_images
  add column thumb_url text,
  add column medium_url text,
  add column width integer,
  add column height integer,
  add column storage_path text;
