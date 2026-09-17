-- Correcting the previous fix (20260917182540): switching is_service_role() from
-- current_user to session_user did not fix the real bug, and hand-testing again after that
-- migration showed the vendor self-approval was STILL not blocked.
--
-- Root cause, confirmed with a temporary RAISE NOTICE inside the trigger: the enforcement
-- trigger functions themselves (prevent_role_self_escalation,
-- prevent_vendor_admin_field_tampering, enforce_product_status_transitions,
-- enforce_review_update_scope) were declared SECURITY DEFINER. Per Postgres semantics, that
-- makes current_user equal to the function's OWNER (postgres) for the function's entire
-- body — including any nested calls it makes — regardless of who actually fired the
-- triggering statement. So is_service_role() was reading current_user = 'postgres' for
-- every single caller, vendor included, not just genuine trusted server connections.
--
-- These four functions never actually needed SECURITY DEFINER: all they do is inspect
-- NEW/OLD (already available to any caller with UPDATE rights on the row) and delegate to
-- is_admin()/is_service_role()/owns_product(), which are independently privileged where
-- they need to be. Declaring them SECURITY INVOKER instead leaves current_user exactly as
-- it was when the triggering statement ran — 'authenticated'/'anon' for a normal request,
-- 'service_role' for a trusted server connection — which is what is_service_role() needs.
--
-- Re-verified end to end after this fix: a vendor's own session can no longer self-approve
-- a product or escalate their own role, while a genuine service-role/trusted-server update
-- still succeeds.

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select current_user in ('service_role', 'postgres');
$$;

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
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
