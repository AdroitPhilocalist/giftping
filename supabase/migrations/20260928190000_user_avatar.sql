-- ============================================================================
-- Profile management — a customer's own profile photo
--
--  * A public `user-avatars` bucket with NO client write policies (same model as vendor-branding /
--    product-images): every byte is re-encoded by the upload route, which writes with the service role
--    only after proving the caller is uploading their OWN avatar.
--  * users.avatar_url already existed (unused until now) as a plain text column — same lesson as
--    vendors.logo_url before Stage 11's fix: an unconstrained URL column could be pointed at anything.
--    Pinned to this user's own folder in the bucket, whichever way the row is written.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-avatars', 'user-avatars', true, 5242880, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

alter table public.users
  add constraint users_avatar_url_own_file check (
    avatar_url is null
    or avatar_url ~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/user-avatars/' || id::text || '/avatar-[0-9a-f-]{36}\.webp$')
  );
