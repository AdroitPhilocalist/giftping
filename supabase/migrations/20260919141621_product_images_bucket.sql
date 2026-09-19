-- Public-read bucket for vendor/product photography. Deliberately NO insert/update/delete policies on
-- storage.objects for anon/authenticated: every write goes through the vendor upload route handler,
-- which authenticates the vendor, validates and re-encodes the image with sharp, and then writes with
-- the service-role client. That means a client can never upload arbitrary bytes/filenames straight
-- into the bucket with its own JWT — only the re-encoded WebP the server produced gets stored.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
