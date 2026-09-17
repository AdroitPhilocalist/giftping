-- Extensions
create extension if not exists "pgcrypto" with schema extensions;   -- gen_random_uuid(), vendor bank-detail encryption
create extension if not exists "pg_trgm" with schema extensions;    -- fuzzy/partial text search support

-- updated_at auto-maintenance, reused by every table with an updated_at column
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Role/ownership helper functions (is_admin, is_vendor_owner, current_user_role) live in the
-- row_level_security migration instead of here, since they query public.users/public.vendors,
-- which don't exist yet at this point in migration order.
