-- ============================================================================
-- Stage 7 — payments (Razorpay)
--
--  1. payments: refund bookkeeping.  webhook_events: idempotency + audit for gateway callbacks.
--  2. Vendors must NOT see unpaid / abandoned / cancelled orders (they'd get the buyer's address and phone
--     for an order that may never be paid) — tightened in RLS.
--  3. place_order / resolve_coupon now also treat a `payment_initiated` order as the shopper's own open draft
--     (an abandoned Razorpay modal must not lock them out of their coupon or leave two live orders).
--  4. confirm_order_payment(): the ONE atomic, idempotent fulfilment step — used by both the webhook and the
--     client callback. Amount check -> stock decrement (rolled back if anything is short) -> order confirmed ->
--     cart lines removed. If it can't fulfil (sold out, cancelled draft, wrong amount) it tells the caller a
--     refund is needed instead of silently keeping the money.
-- ============================================================================

alter table public.payments
  add column refund_id text,
  add column refund_reason text,
  add column refunded_at timestamptz;

create table public.webhook_events (
  id text primary key,                      -- the gateway's event id: the idempotency key
  provider text not null default 'razorpay',
  event_type text not null,
  payment_id text,
  gateway_order_id text,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  result text,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
create index webhook_events_payment_idx on public.webhook_events (payment_id);

-- Service role only: RLS on, no policies, so no client role can read or write it.
alter table public.webhook_events enable row level security;

-- ---------------------------------------------------------------------------
-- 2. vendor visibility: only orders that are actually paid
-- ---------------------------------------------------------------------------
create or replace function public.order_visible_to_vendors(target_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select status not in ('created', 'payment_initiated', 'cancelled') from public.orders where id = target_order_id),
    false
  );
$$;

create or replace function public.vendor_has_order_item(target_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.order_visible_to_vendors(target_order_id)
    and exists (
      select 1 from public.order_items oi
      join public.vendors v on v.id = oi.vendor_id
      where oi.order_id = target_order_id and v.user_id = auth.uid()
    );
$$;

drop policy order_items_select_customer_vendor_or_admin on public.order_items;
create policy order_items_select_customer_vendor_or_admin on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
    or (vendor_id = public.own_vendor_id() and public.order_visible_to_vendors(order_id))
    or public.is_admin()
  );

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
  where r.coupon_id = c.id and r.user_id = p_user_id and o.status in ('created', 'payment_initiated');

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
  for v_prev in select id from public.orders where customer_id = p_customer_id and status in ('created', 'payment_initiated') loop
    update public.coupons c set used_count = greatest(0, c.used_count - x.n)
    from (select coupon_id, count(*) as n from public.coupon_redemptions where order_id = v_prev.id group by coupon_id) x
    where c.id = x.coupon_id;
    delete from public.coupon_redemptions where order_id = v_prev.id;
    update public.orders set status = 'cancelled' where id = v_prev.id;
    update public.payments set status = 'failed', failure_reason = 'Superseded by a newer checkout'
    where order_id = v_prev.id and status in ('pending', 'processing');
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

-- ---------------------------------------------------------------------------
-- 4. fulfilment
-- ---------------------------------------------------------------------------
create or replace function public.release_order_coupon(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coupons c set used_count = greatest(0, c.used_count - x.n)
  from (select coupon_id, count(*) as n from public.coupon_redemptions where order_id = p_order_id group by coupon_id) x
  where c.id = x.coupon_id;
  delete from public.coupon_redemptions where order_id = p_order_id;
end;
$$;

revoke all on function public.release_order_coupon(uuid) from public, anon, authenticated;
grant execute on function public.release_order_coupon(uuid) to service_role;

-- Result values: confirmed | already | refund_needed | unknown_order
create or replace function public.confirm_order_payment(
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_amount_paise bigint,
  p_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  it record;
  v_reason text;
  v_count integer;
begin
  select * into o from public.orders where razorpay_order_id = p_razorpay_order_id for update;
  if not found then
    return jsonb_build_object('result', 'unknown_order');
  end if;

  -- already fulfilled (webhook replay, callback + webhook, order.paid after payment.captured …)
  if o.status not in ('created', 'payment_initiated', 'cancelled') then
    if exists (
      select 1 from public.payments where order_id = o.id and razorpay_payment_id = p_razorpay_payment_id
    ) then
      return jsonb_build_object('result', 'already', 'order_id', o.id);
    end if;
    -- a DIFFERENT payment landed on an order that is already paid: the shopper was charged twice
    return jsonb_build_object('result', 'refund_needed', 'reason', 'DUPLICATE_PAYMENT', 'order_id', o.id, 'record', false);
  end if;

  if o.status = 'cancelled' then
    v_reason := 'ORDER_CANCELLED';
  elsif p_amount_paise is distinct from round(o.total_amount * 100)::bigint then
    v_reason := 'AMOUNT_MISMATCH';
  else
    -- decrement stock; any shortfall raises and the sub-transaction rolls every decrement back
    begin
      for it in
        select product_id, variant_ids, quantity from public.order_items where order_id = o.id order by product_id
      loop
        update public.products
        set stock_quantity = stock_quantity - it.quantity, total_sold = total_sold + it.quantity
        where id = it.product_id and stock_quantity >= it.quantity;
        get diagnostics v_count = row_count;
        if v_count <> 1 then
          raise exception 'OUT_OF_STOCK';
        end if;

        if cardinality(it.variant_ids) > 0 then
          update public.product_variants
          set stock_quantity = stock_quantity - it.quantity
          where id = any (it.variant_ids) and stock_quantity >= it.quantity;
          get diagnostics v_count = row_count;
          if v_count <> cardinality(it.variant_ids) then
            raise exception 'OUT_OF_STOCK';
          end if;
        end if;
      end loop;
    exception when others then
      if sqlerrm = 'OUT_OF_STOCK' then
        v_reason := 'OUT_OF_STOCK';
      else
        raise;
      end if;
    end;
  end if;

  -- record the captured payment either way: money was taken and must be traceable
  insert into public.payments (order_id, razorpay_order_id, razorpay_payment_id, amount, status, payment_method, captured_at, failure_reason)
  values (o.id, p_razorpay_order_id, p_razorpay_payment_id, p_amount_paise / 100.0, 'captured', p_method, now(), v_reason)
  on conflict (razorpay_order_id) do update
    set razorpay_payment_id = excluded.razorpay_payment_id, status = 'captured',
        payment_method = excluded.payment_method, captured_at = now(), failure_reason = excluded.failure_reason;

  if v_reason is not null then
    if o.status <> 'cancelled' then
      update public.orders set status = 'cancelled' where id = o.id;
      perform public.release_order_coupon(o.id);
    end if;
    return jsonb_build_object('result', 'refund_needed', 'reason', v_reason, 'order_id', o.id, 'record', true);
  end if;

  update public.orders set status = 'confirmed', placed_at = now() where id = o.id;

  -- remove exactly the lines that were ordered from the shopper's cart (anything they added since stays)
  delete from public.cart_items ci
  using public.cart c, public.order_items oi
  where c.user_id = o.customer_id and ci.cart_id = c.id
    and oi.order_id = o.id and oi.product_id = ci.product_id
    and oi.variant_ids = ci.variant_ids and oi.personalization = ci.personalization;
  update public.cart set coupon_code = null where user_id = o.customer_id and coupon_code is not distinct from o.coupon_code;

  return jsonb_build_object('result', 'confirmed', 'order_id', o.id);
end;
$$;

revoke all on function public.confirm_order_payment(text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(text, text, bigint, text) to service_role;
