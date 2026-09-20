-- ============================================================================
-- Stage 11 — coupon integrity. Validation lives in the database too, because coupons are writable by vendors (their own) and admins
-- through the API, not only through our forms.
-- ============================================================================
alter table public.coupons
  add constraint coupons_code_format check (code ~ '^[A-Z0-9_-]{3,30}$'),
  add constraint coupons_value_valid check (
    (discount_type = 'percentage' and discount_value > 0 and discount_value <= 100)
    or (discount_type = 'fixed' and discount_value > 0 and discount_value <= 10000000)
  ),
  add constraint coupons_min_order_nonneg check (min_order_amount >= 0),
  add constraint coupons_max_discount_valid check (max_discount_amount is null or max_discount_amount > 0),
  add constraint coupons_limits_valid check ((usage_limit is null or usage_limit >= 1) and per_user_limit between 1 and 1000 and used_count >= 0),
  add constraint coupons_validity_window check (valid_until is null or valid_until > valid_from);

-- `used_count` is bookkeeping owned by place_order()/release_order_coupon() (SECURITY DEFINER, so is_service_role() is true there).
-- Nobody else — not a vendor editing their own coupon, not an admin session — may set or reset it, or the usage cap could be bypassed.
-- SECURITY INVOKER (Stage 2 rule): it reads current_user through is_service_role().
create or replace function public.coupons_protect_usage_counter()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.is_service_role() then
    return new;
  end if;
  if tg_op = 'INSERT' and new.used_count <> 0 then
    raise exception 'A new coupon starts with zero uses.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.used_count is distinct from old.used_count then
    raise exception 'The usage counter is maintained automatically.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger coupons_protect_usage_counter
  before insert or update on public.coupons
  for each row execute function public.coupons_protect_usage_counter();
