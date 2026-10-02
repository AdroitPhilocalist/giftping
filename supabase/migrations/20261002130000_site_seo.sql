-- Admin-editable SEO for the site's fixed pages (homepage, mall, occasions index, boutiques index, about, contact).
--
-- Category pages already have meta_title / meta_description columns (edited in /admin/categories) and product pages have their own — this
-- covers the pages that aren't database rows. The page KEYS and their code defaults live in lib/seo/pages.ts; a row here only OVERRIDES a
-- default, so deleting a row (or leaving a field blank) always falls back to something sensible. A missing row is the normal state.
--
-- Admin-only under RLS. The public pages read it with the service role (it's page-title text, not private, but there is no reason to expose
-- the table to the API); every admin action re-checks the role.

create table public.site_seo (
  page_key text primary key check (page_key ~ '^[a-z0-9-]{1,40}$'),
  meta_title text check (meta_title is null or (char_length(meta_title) between 1 and 70 and meta_title !~ '[\r\n]')),
  meta_description text check (meta_description is null or (char_length(meta_description) between 1 and 200 and meta_description !~ '[\r\n]')),
  -- true = ask search engines not to list this page (and leave it out of the sitemap)
  noindex boolean not null default false,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger set_site_seo_updated_at
  before update on public.site_seo
  for each row execute function public.set_updated_at();

alter table public.site_seo enable row level security;
create policy site_seo_admin_all on public.site_seo
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on table public.site_seo from anon;
