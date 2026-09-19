-- ============================================================================
-- Stage 6 — checkout (pre-payment)
--
--  1. addresses: format CHECKs, exactly one default per user, max 10 per user
--  2. cart.coupon_code: the coupon a shopper has applied (always re-validated server-side)
--  3. platform_settings: delivery / free-delivery threshold / gift-wrap defaults
--  4. order_items: GST + discount snapshot + variant_ids; the platform's financials
--     (commission, vendor payout) move to their own table so customers can't read the margin
--  5. orders: idempotency key, GST total, human-friendly order numbers
--  6. resolve_coupon() and place_order() — service_role-only, atomic
--
-- NOTE: `alter default privileges` in the grant migration gives anon/authenticated EXECUTE on every new
-- function, so each function here explicitly revokes it and grants service_role only.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. addresses
-- ---------------------------------------------------------------------------
alter table public.addresses
  add constraint addresses_pincode_format check (pincode ~ '^[1-9][0-9]{5}$'),
  add constraint addresses_phone_format check (phone ~ '^[6-9][0-9]{9}$');

create unique index addresses_one_default_per_user on public.addresses (user_id) where is_default;

-- SECURITY INVOKER: the caller can already see/update their own address rows through RLS.
create or replace function public.addresses_maintain_default_and_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.addresses where user_id = new.user_id) >= 10 then
      raise exception 'You can save up to 10 addresses.' using errcode = 'P0001';
    end if;
    -- the first address a user saves is their default
    if not exists (select 1 from public.addresses where user_id = new.user_id) then
      new.is_default := true;
    end if;
  end if;

  if new.is_default then
    update public.addresses set is_default = false
    where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$$;

create trigger addresses_maintain_default_and_limit
  before insert or update of is_default on public.addresses
  for each row execute function public.addresses_maintain_default_and_limit();

-- ---------------------------------------------------------------------------
-- 2. applied coupon on the cart (validated again on every read and at order time)
-- ---------------------------------------------------------------------------
alter table public.cart
  add column coupon_code text,
  add constraint cart_coupon_code_length check (coupon_code is null or char_length(coupon_code) between 1 and 40);

-- ---------------------------------------------------------------------------
-- 3. commerce settings (admin-editable later, Stage 11). Read server-side with the service role.
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value, description) values
  ('delivery_charge', '79'::jsonb, 'Flat delivery charge (INR) per vendor shipment when below the free-delivery threshold'),
  ('free_delivery_threshold', '999'::jsonb, 'A vendor shipment whose (post-discount) value reaches this amount ships free (INR)'),
  ('gift_wrap_charge', '49'::jsonb, 'Optional gift-wrap charge (INR) per order')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. order_items snapshot + financials
-- ---------------------------------------------------------------------------
alter table public.order_items
  add column variant_ids uuid[] not null default '{}',
  add column discount_amount numeric(10, 2) not null default 0,
  add column gst_rate numeric(4, 2) not null default 0,
  add column gst_amount numeric(10, 2) not null default 0,
  add column hsn_code text;

-- The platform's margin must not be readable by customers (order_items has a customer SELECT policy
-- and RLS is row- not column-level — same lesson as vendor_private in Stage 4). No orders exist yet, so
-- these columns are dropped rather than migrated.
alter table public.order_items
  drop column commission_rate,
  drop column commission_amount,
  drop column vendor_payout;

create table public.order_item_financials (
  order_item_id uuid primary key references public.order_items(id) on delete cascade,
  commission_rate numeric(5, 2) not null,
  -- gross line total minus any discount the VENDOR funded (vendor-scoped coupons). Platform-funded
  -- discounts don't reduce the vendor's base — the platform absorbs them.
  commission_base numeric(10, 2) not null,
  commission_amount numeric(10, 2) not null,
  vendor_payout numeric(10, 2) not null,
  vendor_funded_discount numeric(10, 2) not null default 0,
  platform_funded_discount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.order_item_financials enable row level security;

-- Vendors see their own lines' payout; admins see everything; customers see nothing. Writes: service role only.
create policy order_item_financials_select_vendor_or_admin on public.order_item_financials
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.order_items oi
      where oi.id = order_item_id and oi.vendor_id = public.own_vendor_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. orders
-- ---------------------------------------------------------------------------
alter table public.orders
  add column idempotency_key uuid,
  add column gst_amount numeric(10, 2) not null default 0;

create unique index orders_idempotency_unique on public.orders (customer_id, idempotency_key)
  where idempotency_key is not null;

create sequence public.order_number_seq start 100001;

-- ---------------------------------------------------------------------------
-- 6a. resolve_coupon — everything about a code that only the database can know (validity window,
--     usage caps, this user's redemptions). Scope (vendor/category) and the money maths are done by the
--     caller in lib/commerce/coupons.ts + totals.ts, which are pure and unit-tested.
--     The user's OWN still-unpaid draft orders don't count against limits: placing a new order
--     supersedes them (see place_order), so counting them would lock a shopper out of their own coupon.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_coupon(p_code text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v_own_draft integer;
  v_user_uses integer;
begin
  select * into c from public.coupons where upper(code) = upper(trim(p_code)) and is_active limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'That coupon code isn''t valid.');
  end if;
  if c.valid_from > now() then
    return jsonb_build_object('ok', false, 'error', 'That coupon isn''t active yet.');
  end if;
  if c.valid_until is not null and c.valid_until < now() then
    return jsonb_build_object('ok', false, 'error', 'That coupon has expired.');
  end if;

  select count(*) into v_own_draft
  from public.coupon_redemptions r join public.orders o on o.id = r.order_id
  where r.coupon_id = c.id and r.user_id = p_user_id and o.status = 'created';

  if c.usage_limit is not null and (c.used_count - v_own_draft) >= c.usage_limit then
    return jsonb_build_object('ok', false, 'error', 'That coupon has been fully redeemed.');
  end if;

  select count(*) into v_user_uses
  from public.coupon_redemptions where coupon_id = c.id and user_id = p_user_id;
  if (v_user_uses - v_own_draft) >= c.per_user_limit then
    return jsonb_build_object('ok', false, 'error', 'You''ve already used that coupon.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'coupon', jsonb_build_object(
      'id', c.id,
      'code', c.code,
      'discountType', c.discount_type,
      'discountValue', c.discount_value,
      'minOrderAmount', c.min_order_amount,
      'maxDiscountAmount', c.max_discount_amount,
      'vendorId', c.vendor_id,
      'categoryId', c.category_id
    )
  );
end;
$$;

revoke all on function public.resolve_coupon(text, uuid) from public, anon, authenticated;
grant execute on function public.resolve_coupon(text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 6b. place_order — the ONLY way an order is created. One transaction:
--     idempotency -> lock the shopper -> supersede their unpaid drafts (releasing coupon uses) ->
--     re-check stock -> consume the coupon (race-safe) -> insert order + items + financials ->
--     cross-check that the numbers add up. The caller (server-side TS) computes the amounts from the
--     catalogue; this function refuses anything internally inconsistent, so a bug there can't silently
--     persist a wrong total.
-- ---------------------------------------------------------------------------
create or replace function public.place_order(p_customer_id uuid, p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key uuid := nullif(p_order->>'idempotency_key', '')::uuid;
  v_existing record;
  v_prev record;
  v_order_id uuid;
  v_number text;
  v_coupon_id uuid := nullif(p_order->>'coupon_id', '')::uuid;
  it record;
  v_item_id uuid;
  v_vids uuid[];
  v_vid uuid;
  v_stock integer;
  v_status text;
  v_sum_total numeric := 0;
  v_sum_discount numeric := 0;
  v_sum_gst numeric := 0;
  v_subtotal numeric := (p_order->>'subtotal')::numeric;
  v_discount numeric := coalesce((p_order->>'discount_amount')::numeric, 0);
  v_delivery numeric := coalesce((p_order->>'delivery_charge')::numeric, 0);
  v_wrap numeric := coalesce((p_order->>'gift_wrap_charge')::numeric, 0);
  v_total numeric := (p_order->>'total_amount')::numeric;
  v_gst numeric := coalesce((p_order->>'gst_amount')::numeric, 0);
begin
  if p_customer_id is null or jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_ORDER' using errcode = 'P0001';
  end if;

  -- serialise this shopper's checkouts (double-click, two tabs)
  perform 1 from public.users where id = p_customer_id for update;

  if v_key is not null then
    select id, order_number into v_existing from public.orders
    where customer_id = p_customer_id and idempotency_key = v_key;
    if found then
      return jsonb_build_object('order_id', v_existing.id, 'order_number', v_existing.order_number, 'existing', true);
    end if;
  end if;

  -- supersede this shopper's other unpaid drafts and hand their coupon uses back
  for v_prev in select id from public.orders where customer_id = p_customer_id and status = 'created' loop
    update public.coupons c set used_count = greatest(0, c.used_count - x.n)
    from (select coupon_id, count(*) as n from public.coupon_redemptions where order_id = v_prev.id group by coupon_id) x
    where c.id = x.coupon_id;
    delete from public.coupon_redemptions where order_id = v_prev.id;
    update public.orders set status = 'cancelled' where id = v_prev.id;
  end loop;

  -- stock re-check under a share lock (the caller checked already; this closes the gap)
  for it in select * from jsonb_to_recordset(p_items) as x(product_id uuid, variant_ids jsonb, quantity integer) loop
    select stock_quantity, status into v_stock, v_status from public.products where id = it.product_id for share;
    if v_status is distinct from 'active' or v_stock < it.quantity then
      raise exception 'OUT_OF_STOCK' using errcode = 'P0001';
    end if;
    for v_vid in select jsonb_array_elements_text(it.variant_ids)::uuid loop
      select stock_quantity into v_stock from public.product_variants
      where id = v_vid and product_id = it.product_id and is_active for share;
      if v_stock is null or v_stock < it.quantity then
        raise exception 'OUT_OF_STOCK' using errcode = 'P0001';
      end if;
    end loop;
  end loop;

  if v_coupon_id is not null then
    update public.coupons
    set used_count = used_count + 1
    where id = v_coupon_id and is_active
      and (valid_until is null or valid_until > now()) and valid_from <= now()
      and (usage_limit is null or used_count < usage_limit)
      and per_user_limit > (select count(*) from public.coupon_redemptions where coupon_id = v_coupon_id and user_id = p_customer_id);
    if not found then
      raise exception 'COUPON_UNAVAILABLE' using errcode = 'P0001';
    end if;
  end if;

  v_number := 'GP-' || lpad(nextval('public.order_number_seq')::text, 6, '0');

  insert into public.orders (
    order_number, customer_id, delivery_address, gift_message, gift_wrap_selected, gift_wrap_charge,
    subtotal, discount_amount, delivery_charge, gst_amount, total_amount, coupon_id, coupon_code, notes, idempotency_key
  ) values (
    v_number, p_customer_id, p_order->'delivery_address', nullif(p_order->>'gift_message', ''),
    coalesce((p_order->>'gift_wrap_selected')::boolean, false), v_wrap,
    v_subtotal, v_discount, v_delivery, v_gst, v_total, v_coupon_id, nullif(p_order->>'coupon_code', ''),
    nullif(p_order->>'notes', ''), v_key
  ) returning id into v_order_id;

  for it in select * from jsonb_to_recordset(p_items) as x(
    product_id uuid, vendor_id uuid, variant_id uuid, variant_ids jsonb, product_name text, product_image text,
    variant_label text, personalization jsonb, quantity integer, unit_price numeric, total_price numeric,
    discount_amount numeric, gst_rate numeric, gst_amount numeric, hsn_code text, commission_rate numeric,
    commission_base numeric, commission_amount numeric, vendor_payout numeric,
    vendor_funded_discount numeric, platform_funded_discount numeric
  ) loop
    v_vids := coalesce(array(select jsonb_array_elements_text(it.variant_ids)::uuid), '{}');
    insert into public.order_items (
      order_id, product_id, vendor_id, variant_id, variant_ids, product_name, product_image, variant_label,
      personalization, quantity, unit_price, total_price, discount_amount, gst_rate, gst_amount, hsn_code
    ) values (
      v_order_id, it.product_id, it.vendor_id, v_vids[1], v_vids, it.product_name, it.product_image, it.variant_label,
      coalesce(it.personalization, '{}'::jsonb), it.quantity, it.unit_price, it.total_price,
      coalesce(it.discount_amount, 0), coalesce(it.gst_rate, 0), coalesce(it.gst_amount, 0), it.hsn_code
    ) returning id into v_item_id;

    insert into public.order_item_financials (
      order_item_id, commission_rate, commission_base, commission_amount, vendor_payout,
      vendor_funded_discount, platform_funded_discount
    ) values (
      v_item_id, it.commission_rate, it.commission_base, it.commission_amount, it.vendor_payout,
      coalesce(it.vendor_funded_discount, 0), coalesce(it.platform_funded_discount, 0)
    );

    v_sum_total := v_sum_total + it.total_price;
    v_sum_discount := v_sum_discount + coalesce(it.discount_amount, 0);
    v_sum_gst := v_sum_gst + coalesce(it.gst_amount, 0);
  end loop;

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, user_id, order_id, discount_amount)
    values (v_coupon_id, p_customer_id, v_order_id, v_discount);
  end if;

  -- internal consistency: refuse (and roll everything back) if the caller's numbers don't add up
  if abs(v_sum_total - v_subtotal) > 0.01
     or abs(v_sum_discount - v_discount) > 0.01
     or abs(v_sum_gst - v_gst) > 0.01
     or abs((v_subtotal - v_discount + v_delivery + v_wrap) - v_total) > 0.01
     or v_total < 0 then
    raise exception 'TOTALS_MISMATCH' using errcode = 'P0001';
  end if;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_number, 'existing', false);
end;
$$;

revoke all on function public.place_order(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(uuid, jsonb, jsonb) to service_role;
