-- ============================================================================
-- Stage 11 — vendor logo and banner
--
--  * A public `vendor-branding` bucket with NO client write policies (same model as product-images / site-banners): every byte is re-encoded by the upload
--    route, which writes with the service role after proving the caller owns an approved boutique.
--  * vendors.logo_url / banner_url used to accept ANY text — a vendor could point them at a tracking pixel, another boutique's picture, or something
--    Next's image optimiser then refuses to load. They are now pinned to this vendor's own folder in the bucket, whichever way the row is written.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vendor-branding', 'vendor-branding', true, 5242880, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

alter table public.vendors
  add constraint vendors_logo_url_own_file check (
    logo_url is null
    or logo_url ~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/vendor-branding/' || id::text || '/logo-[0-9a-f-]{36}\.webp$')
  ),
  add constraint vendors_banner_url_own_file check (
    banner_url is null
    or banner_url ~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/vendor-branding/' || id::text || '/banner-[0-9a-f-]{36}-full\.webp$')
  );
