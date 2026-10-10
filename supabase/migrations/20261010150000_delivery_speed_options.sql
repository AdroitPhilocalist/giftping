-- ============================================================================
-- Delivery speed options (Standard vs Express) — real Shiprocket serviceability data now backs a genuine choice,
-- not a hand-waved surcharge (see docs/progress/2026-10-01-spec-gap-analysis.md gap #5 — blocked until real
-- Shiprocket credentials existed; they do now).
--
--  1. serviceability_cache: caches the standard/express split alongside the existing single ETA
--  2. orders.delivery_speed: per-vendor speed choice + the preferred courier id, written by place_order()
--  3. platform_settings: the express surcharge (admin-editable later, same as delivery_charge/gift_wrap_charge
--     already are — no admin settings UI exists yet for any of these, a pre-existing gap, not new here)
-- ============================================================================

alter table public.serviceability_cache
  add column standard_etd_days integer,
  add column express_etd_days integer,
  add column express_courier_id integer;

-- Shape: { "<vendorId>": { "speed": "standard" | "express", "courierId": number | null, "etdDays": number | null } }
-- One entry per vendor shipment in the order. Read only server-side and always projected down to a single
-- boolean before reaching any one vendor's own UI (lib/db/vendor-portal.ts) — the whole order row (and so this
-- whole jsonb blob, every vendor's choice) is visible to any vendor with a line in a multi-vendor order under
-- the existing order_visible_to_vendors() policy, same as every other order column.
alter table public.orders add column delivery_speed jsonb not null default '{}'::jsonb;

insert into public.platform_settings (key, value, description) values
  ('express_delivery_surcharge', '99'::jsonb, 'Flat surcharge (INR) per vendor shipment for Express delivery, on top of the normal delivery charge')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- place_order(): accept and store delivery_speed. Nothing else about the function changes — the express
-- surcharge is already folded into p_order.delivery_charge by lib/commerce/totals.ts before this is called, so
-- the existing TOTALS_MISMATCH consistency check already covers it with no changes needed here.
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
    subtotal, discount_amount, delivery_charge, gst_amount, total_amount, coupon_id, coupon_code, notes,
    idempotency_key, delivery_speed
  ) values (
    v_number, p_customer_id, p_order->'delivery_address', nullif(p_order->>'gift_message', ''),
    coalesce((p_order->>'gift_wrap_selected')::boolean, false), v_wrap,
    v_subtotal, v_discount, v_delivery, v_gst, v_total, v_coupon_id, nullif(p_order->>'coupon_code', ''),
    nullif(p_order->>'notes', ''), v_key, coalesce(p_order->'delivery_speed', '{}'::jsonb)
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
