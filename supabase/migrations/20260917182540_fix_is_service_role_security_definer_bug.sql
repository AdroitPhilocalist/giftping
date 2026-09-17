-- Critical bug fix: is_service_role() checked current_user, but every function that calls
-- it (prevent_role_self_escalation, prevent_vendor_admin_field_tampering,
-- enforce_product_status_transitions, enforce_review_update_scope) is SECURITY DEFINER —
-- which makes current_user become the function's OWNER (postgres) for the duration of the
-- call, regardless of who is actually calling it. That made is_service_role() return true
-- unconditionally, silently disabling every one of these security triggers for every role,
-- including a plain authenticated vendor. Confirmed by hand-testing: a vendor's own
-- authenticated session was able to set their own pending product straight to 'active'.
--
-- session_user is NOT affected by SECURITY DEFINER context switches — it always reflects
-- the role that actually authenticated the session (postgres/service_role for a trusted
-- server connection, "authenticated" or "anon" for a normal client request) — so it's the
-- correct check here.

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select session_user in ('postgres', 'service_role');
$$;
