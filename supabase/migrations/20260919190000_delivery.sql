-- ============================================================================
-- Stage 8 — delivery (Shiprocket)
--
--  1. Shared token cache + pincode serviceability cache (service-role only)
--  2. shipments: package details, Shiprocket ids, one live shipment per vendor per order
--  3. shipment_events: the tracking timeline shown to customers (deduplicated)
--  4. recompute_order_status(): fixed for multi-vendor orders (see below)
--  5. apply_shipment_update(): the ONE atomic, idempotent, monotonic place a courier status change is applied
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. caches — RLS on, no policies: only the service role can touch them
-- ---------------------------------------------------------------------------
create table public.integration_tokens (
  provider text primary key,
  token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.integration_tokens enable row level security;

create table public.serviceability_cache (
  pickup_pincode text not null,
  delivery_pincode text not null,
  serviceable boolean not null,
  etd_days integer,
  courier_count integer not null default 0,
  checked_at timestamptz not null default now(),
  primary key (pickup_pincode, delivery_pincode)
);
alter table public.serviceability_cache enable row level security;

alter table public.vendor_private add column shiprocket_pickup_location text;

-- ---------------------------------------------------------------------------
-- 2. shipments
-- ---------------------------------------------------------------------------
alter table public.shipments
  add column shiprocket_shipment_id text,
  add column package_weight_grams integer,
  add column package_length_cm numeric(6, 1),
  add column package_breadth_cm numeric(6, 1),
  add column package_height_cm numeric(6, 1),
  add column last_event_at timestamptz;

-- One live outbound shipment per vendor per order (a cancelled one can be re-booked).
create unique index shipments_one_live_per_vendor_order on public.shipments (order_id, vendor_id)
  where is_return = false and status <> 'cancelled';
create unique index shipments_awb_unique on public.shipments (awb_number) where awb_number is not null and is_return = false;

-- ---------------------------------------------------------------------------
-- 3. tracking timeline
-- ---------------------------------------------------------------------------
create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  raw_status text not null,
  activity text,
  location text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (shipment_id, occurred_at, raw_status)
);
create index shipment_events_shipment_idx on public.shipment_events (shipment_id, occurred_at desc);

alter table public.shipment_events enable row level security;

-- Same audience as the shipment itself: the buyer, the vendor that ships it, admins. Writes: service role only.
create policy shipment_events_select on public.shipment_events
  for select using (
    exists (
      select 1 from public.shipments s
      where s.id = shipment_id
        and (
          exists (select 1 from public.orders o where o.id = s.order_id and o.customer_id = auth.uid())
          or s.vendor_id = public.own_vendor_id()
        )
    )
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 4. order status rollup, fixed for multi-vendor orders.
--    The original counted only vendors that already HAVE a shipment row, so once vendor A shipped and vendor B
--    hadn't booked yet, the order read as fully "shipped". A vendor with no live shipment now counts as 'pending'.
-- ---------------------------------------------------------------------------
create or replace function public.recompute_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
  v_statuses text[];
  v_new_status text;
begin
  select array_agg(coalesce(sh.status, 'pending')) into v_statuses
  from (select distinct vendor_id from public.order_items where order_id = v_order_id) v
  left join lateral (
    select s.status from public.shipments s
    where s.order_id = v_order_id and s.vendor_id = v.vendor_id and s.is_return = false and s.status <> 'cancelled'
    order by s.created_at desc limit 1
  ) sh on true;

  if v_statuses is null then
    return coalesce(new, old);
  elsif v_statuses <@ array['delivered'] then
    v_new_status := 'delivered';
  elsif 'delivered' = any(v_statuses) then
    v_new_status := 'partially_delivered';
  elsif v_statuses <@ array['picked_up', 'in_transit', 'out_for_delivery'] then
    v_new_status := 'shipped';
  elsif v_statuses && array['picked_up', 'in_transit', 'out_for_delivery'] then
    v_new_status := 'partially_shipped';
  else
    v_new_status := 'processing';
  end if;

  update public.orders
  set status = v_new_status
  where id = v_order_id and status not in ('cancelled', 'refunded', 'created', 'payment_initiated');

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. apply_shipment_update — courier status changes.
--    Idempotent (events dedupe on shipment+time+status) and MONOTONIC: couriers send events late and out of order,
--    so a status only ever moves forward (pending < confirmed < picked_up < in_transit < out_for_delivery <
--    delivered); delivered/cancelled are terminal; rto_initiated sticks unless cancelled.
--    Also keeps order_items.fulfilment_status in step for that vendor's lines in that order.
-- ---------------------------------------------------------------------------
create or replace function public.apply_shipment_update(
  p_awb text,
  p_new_status text,
  p_raw_status text,
  p_etd date,
  p_events jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shipments%rowtype;
  v_old text;
  v_final text;
  v_order constant text[] := array['pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
  ev record;
  v_last timestamptz;
begin
  select * into s from public.shipments where awb_number = p_awb and is_return = false for update;
  if not found then
    return jsonb_build_object('result', 'unknown_awb');
  end if;
  v_old := s.status;
  v_final := v_old;

  for ev in
    select * from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb))
      as x(occurred_at timestamptz, raw_status text, activity text, location text)
  loop
    if ev.occurred_at is not null and ev.raw_status is not null then
      insert into public.shipment_events (shipment_id, raw_status, activity, location, occurred_at)
      values (s.id, ev.raw_status, left(ev.activity, 500), left(ev.location, 200), ev.occurred_at)
      on conflict (shipment_id, occurred_at, raw_status) do nothing;
      v_last := greatest(coalesce(v_last, ev.occurred_at), ev.occurred_at);
    end if;
  end loop;

  if p_new_status is not null and v_old not in ('delivered', 'cancelled') then
    if p_new_status = 'cancelled' then
      v_final := 'cancelled';
    elsif p_new_status = 'rto_initiated' then
      v_final := 'rto_initiated';
    elsif v_old = 'rto_initiated' then
      v_final := v_old;
    elsif array_position(v_order, p_new_status) > array_position(v_order, v_old) then
      v_final := p_new_status;
    end if;
  end if;

  update public.shipments
  set status = v_final,
      estimated_delivery = coalesce(p_etd, estimated_delivery),
      last_event_at = coalesce(v_last, last_event_at),
      shipped_at = case when shipped_at is null and v_final in ('picked_up', 'in_transit', 'out_for_delivery', 'delivered') then now() else shipped_at end,
      delivered_at = case when v_final = 'delivered' and delivered_at is null then now() else delivered_at end
  where id = s.id;

  if v_final <> v_old then
    if v_final in ('picked_up', 'in_transit', 'out_for_delivery') then
      update public.order_items set fulfilment_status = 'shipped'
      where order_id = s.order_id and vendor_id = s.vendor_id and fulfilment_status in ('pending', 'confirmed');
    elsif v_final = 'delivered' then
      update public.order_items set fulfilment_status = 'delivered'
      where order_id = s.order_id and vendor_id = s.vendor_id and fulfilment_status in ('pending', 'confirmed', 'shipped');
    elsif v_final = 'cancelled' then
      update public.order_items set fulfilment_status = 'confirmed'
      where order_id = s.order_id and vendor_id = s.vendor_id and fulfilment_status = 'shipped';
    end if;
  end if;

  return jsonb_build_object(
    'result', case when v_final <> v_old then 'updated' else 'unchanged' end,
    'shipment_id', s.id, 'order_id', s.order_id, 'vendor_id', s.vendor_id,
    'old_status', v_old, 'new_status', v_final
  );
end;
$$;

revoke all on function public.apply_shipment_update(text, text, text, date, jsonb) from public, anon, authenticated;
grant execute on function public.apply_shipment_update(text, text, text, date, jsonb) to service_role;
