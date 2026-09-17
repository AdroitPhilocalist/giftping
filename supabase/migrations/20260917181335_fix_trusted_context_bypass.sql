-- Bug fix: RLS policies are automatically skipped for roles with BYPASSRLS (postgres,
-- service_role), but ordinary triggers are NOT — they fire unconditionally for every role.
-- The security triggers added in row_level_security.sql (prevent_role_self_escalation,
-- prevent_vendor_admin_field_tampering, enforce_product_status_transitions,
-- enforce_review_update_scope) all gated on is_admin(), which reads auth.uid() from a JWT
-- claim that simply doesn't exist in a service-role/superuser session — so a trusted
-- server-side update (e.g. an admin action performed via lib/db/admin.ts, or a manual fix
-- in the SQL editor) would have been incorrectly rejected. Verified by reproducing exactly
-- this failure while testing RLS by hand.

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select current_user in ('postgres', 'service_role');
$$;

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not (public.is_admin() or public.is_service_role()) then
    raise exception 'Only an admin can change a user''s role';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_vendor_admin_field_tampering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or public.is_service_role() then
    return new;
  end if;
  if new.status is distinct from old.status
    or new.commission_rate is distinct from old.commission_rate
    or new.is_featured is distinct from old.is_featured
    or new.approved_at is distinct from old.approved_at
    or new.suspended_at is distinct from old.suspended_at
  then
    raise exception 'Only an admin can change vendor status, commission rate, or featured flag';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_product_status_transitions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or public.is_service_role() then
    return new;
  end if;
  if new.status is distinct from old.status and new.status not in ('pending', 'inactive') then
    raise exception 'Vendors may only set product status to pending or inactive; admin approval is required otherwise';
  end if;
  if new.is_in_house is distinct from old.is_in_house then
    raise exception 'Only an admin can change is_in_house';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_review_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.user_id or public.is_admin() or public.is_service_role() then
    return new;
  end if;
  if public.owns_product(old.product_id) then
    if new.rating is distinct from old.rating
      or new.title is distinct from old.title
      or new.body is distinct from old.body
      or new.user_id is distinct from old.user_id
      or new.is_verified_purchase is distinct from old.is_verified_purchase
    then
      raise exception 'Vendors may only set vendor_response on a review';
    end if;
    return new;
  end if;
  raise exception 'Not authorized to update this review';
end;
$$;
