-- Bug fix: validate_coupon()'s OUT parameter `coupon_id` collided with
-- coupon_redemptions.coupon_id in the per-user-limit check, causing
-- "column reference is ambiguous". Qualified with a table alias. Found by hand-testing
-- the RPC directly.

create or replace function public.validate_coupon(
  p_code text,
  p_order_amount numeric,
  p_vendor_id uuid default null
)
returns table (
  coupon_id uuid,
  discount_type text,
  discount_value numeric,
  max_discount_amount numeric,
  is_valid boolean,
  error_message text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_coupon public.coupons%rowtype;
  v_user_redemptions integer;
begin
  select * into v_coupon from public.coupons where code = p_code and is_active = true;

  if not found then
    return query select null::uuid, null::text, null::numeric, null::numeric, false, 'Invalid coupon code';
    return;
  end if;

  if v_coupon.valid_until is not null and v_coupon.valid_until < now() then
    return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, false, 'Coupon has expired';
    return;
  end if;

  if v_coupon.vendor_id is not null and v_coupon.vendor_id is distinct from p_vendor_id then
    return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, false, 'Coupon is not valid for this vendor';
    return;
  end if;

  if p_order_amount < v_coupon.min_order_amount then
    return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, false, format('Minimum order amount is %s', v_coupon.min_order_amount);
    return;
  end if;

  if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
    return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, false, 'Coupon usage limit reached';
    return;
  end if;

  select count(*) into v_user_redemptions
  from public.coupon_redemptions cr
  where cr.coupon_id = v_coupon.id and cr.user_id = auth.uid();

  if v_user_redemptions >= v_coupon.per_user_limit then
    return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, false, 'You have already used this coupon';
    return;
  end if;

  return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, true, null::text;
end;
$$;
