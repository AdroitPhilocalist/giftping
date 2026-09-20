-- ============================================================================
-- Stage 11 — vendor controls and the payout ledger
--
--  1. A SUSPENDED vendor's products disappear from the storefront. (Until now they stayed publicly visible and only checkout refused them.)
--  2. A vendor can no longer choose their own Shiprocket pickup-location name (they could have pointed it at another vendor's warehouse).
--  3. Payouts: every delivered line is settled EXACTLY ONCE, and only after a hold period (returns window). Settlements are created and marked
--     paid by admins through atomic functions; nothing is paid automatically.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. storefront visibility follows vendor status
-- ---------------------------------------------------------------------------
create or replace function public.vendor_is_approved(target_vendor_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select status = 'approved' from public.vendors where id = target_vendor_id), false);
$$;

drop policy products_select_public_or_own_or_admin on public.products;
create policy products_select_public_or_own_or_admin on public.products
  for select using (
    (status = 'active' and public.vendor_is_approved(vendor_id))
    or public.is_vendor_owner(vendor_id)
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 2. vendors may not set their own pickup-location name (INVOKER: reads current_user via is_service_role, Stage 2 rule)
-- ---------------------------------------------------------------------------
create or replace function public.guard_vendor_private_admin_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() or public.is_service_role() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.commission_rate is not null
      or new.razorpay_contact_id is not null
      or new.razorpay_fund_account_id is not null
      or new.rejection_reason is not null
      or new.shiprocket_pickup_location is not null
    then
      raise exception 'Commission, payout ids, courier pickup location and rejection reason are set by an admin';
    end if;
  else
    if new.commission_rate is distinct from old.commission_rate
      or new.razorpay_contact_id is distinct from old.razorpay_contact_id
      or new.razorpay_fund_account_id is distinct from old.razorpay_fund_account_id
      or new.rejection_reason is distinct from old.rejection_reason
      or new.shiprocket_pickup_location is distinct from old.shiprocket_pickup_location
      or new.vendor_id is distinct from old.vendor_id
    then
      raise exception 'Commission, payout ids, courier pickup location and rejection reason are set by an admin';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. payout ledger
-- ---------------------------------------------------------------------------
alter table public.vendor_settlements
  add column payment_reference text,
  add column notes text,
  add column item_count integer not null default 0,
  add column created_by uuid references public.users(id) on delete set null,
  add column paid_by uuid references public.users(id) on delete set null,
  add constraint vendor_settlements_amount_positive check (amount > 0);

-- null = not yet part of any settlement. A line can belong to at most one settlement, which is what makes double-paying impossible.
alter table public.order_item_financials
  add column settlement_id uuid references public.vendor_settlements(id) on delete set null;
create index order_item_financials_settlement_idx on public.order_item_financials (settlement_id);

insert into public.platform_settings (key, value, description) values
  ('payout_hold_days', '7'::jsonb, 'Days after delivery before a line becomes payable to the vendor (returns window)')
on conflict (key) do nothing;

-- Delivered, unsettled lines for a vendor, each flagged due / not-yet-due. Cancelled or refunded orders never appear.
create or replace function public.settlement_items_all(p_vendor_id uuid)
returns table (
  order_item_id uuid, order_id uuid, order_number text, product_name text, quantity integer,
  customer_paid numeric, commission numeric, payout numeric, delivered_at timestamptz, due_at timestamptz, is_due boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with hold as (
    select coalesce((select (value #>> '{}')::integer from public.platform_settings where key = 'payout_hold_days'), 7) as days
  )
  select oi.id, o.id, o.order_number, oi.product_name, oi.quantity,
         (oi.total_price - oi.discount_amount) as customer_paid,
         f.commission_amount, f.vendor_payout,
         s.delivered_at, s.delivered_at + make_interval(days => (select days from hold)),
         (s.delivered_at + make_interval(days => (select days from hold))) <= now()
  from public.order_items oi
  join public.order_item_financials f on f.order_item_id = oi.id
  join public.orders o on o.id = oi.order_id
  join lateral (
    select sh.delivered_at from public.shipments sh
    where sh.order_id = oi.order_id and sh.vendor_id = oi.vendor_id and sh.is_return = false
      and sh.status = 'delivered' and sh.delivered_at is not null
    order by sh.delivered_at desc limit 1
  ) s on true
  where oi.vendor_id = p_vendor_id
    and oi.fulfilment_status = 'delivered'
    and f.settlement_id is null
    and o.status not in ('cancelled', 'refunded');
$$;

-- Everything below is service_role only: money movement is done by trusted server code after an admin check.
create or replace function public.create_settlement(p_vendor_id uuid, p_admin_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_count integer;
  v_from timestamptz;
  v_to timestamptz;
  v_id uuid;
begin
  -- serialise per vendor: a second concurrent call waits here, then finds the lines already settled
  perform 1 from public.vendors where id = p_vendor_id for update;
  if not found then
    return jsonb_build_object('result', 'vendor_not_found');
  end if;

  select sum(payout), count(*), min(delivered_at), max(delivered_at)
    into v_total, v_count, v_from, v_to
  from public.settlement_items_all(p_vendor_id) where is_due;

  if v_count is null or v_count = 0 or coalesce(v_total, 0) <= 0 then
    return jsonb_build_object('result', 'nothing_payable');
  end if;

  insert into public.vendor_settlements (vendor_id, amount, settlement_period_start, settlement_period_end, status, item_count, created_by)
  values (p_vendor_id, round(v_total, 2), v_from::date, v_to::date, 'pending', v_count, p_admin_id)
  returning id into v_id;

  update public.order_item_financials f
  set settlement_id = v_id
  where f.order_item_id in (select order_item_id from public.settlement_items_all(p_vendor_id) where is_due);

  return jsonb_build_object('result', 'created', 'settlement_id', v_id, 'amount', round(v_total, 2), 'items', v_count);
end;
$$;

create or replace function public.mark_settlement_paid(p_settlement_id uuid, p_reference text, p_admin_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.vendor_settlements%rowtype;
begin
  if p_reference is null or char_length(trim(p_reference)) < 4 then
    return jsonb_build_object('result', 'reference_required');
  end if;
  select * into s from public.vendor_settlements where id = p_settlement_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  if s.status = 'settled' then
    return jsonb_build_object('result', 'already_settled');
  end if;
  if s.status = 'failed' then
    return jsonb_build_object('result', 'voided');
  end if;
  update public.vendor_settlements
  set status = 'settled', settled_at = now(), payment_reference = left(trim(p_reference), 100), paid_by = p_admin_id
  where id = p_settlement_id;
  return jsonb_build_object('result', 'settled', 'amount', s.amount, 'vendor_id', s.vendor_id);
end;
$$;

-- Void a settlement that was created by mistake (or whose transfer failed): its lines become payable again.
create or replace function public.void_settlement(p_settlement_id uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.vendor_settlements%rowtype;
begin
  select * into s from public.vendor_settlements where id = p_settlement_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  if s.status = 'settled' then
    return jsonb_build_object('result', 'already_settled'); -- money has moved; reverse it with a new adjustment, never by voiding
  end if;
  if s.status = 'failed' then
    return jsonb_build_object('result', 'already_voided');
  end if;
  update public.order_item_financials set settlement_id = null where settlement_id = p_settlement_id;
  update public.vendor_settlements set status = 'failed', notes = left(coalesce(p_note, 'Voided'), 300) where id = p_settlement_id;
  return jsonb_build_object('result', 'voided');
end;
$$;

-- One row per real (non-in-house) vendor for the admin overview.
create or replace function public.payout_overview()
returns table (vendor_id uuid, business_name text, status text, payable numeric, payable_items integer, in_hold numeric, settled numeric, open_settlements integer)
language sql
security definer
set search_path = public
stable
as $$
  select v.id, v.business_name, v.status,
         coalesce((select sum(i.payout) from public.settlement_items_all(v.id) i where i.is_due), 0),
         coalesce((select count(*)::integer from public.settlement_items_all(v.id) i where i.is_due), 0),
         coalesce((select sum(i.payout) from public.settlement_items_all(v.id) i where not i.is_due), 0),
         coalesce((select sum(s.amount) from public.vendor_settlements s where s.vendor_id = v.id and s.status = 'settled'), 0),
         (select count(*)::integer from public.vendor_settlements s where s.vendor_id = v.id and s.status in ('pending', 'processing'))
  from public.vendors v
  where v.status in ('approved', 'suspended')
    and not exists (select 1 from public.products p where p.vendor_id = v.id and p.is_in_house)   -- GiftPing Originals isn't paid out to itself
  order by v.business_name;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'settlement_items_all(uuid)', 'create_settlement(uuid, uuid)', 'mark_settlement_paid(uuid, text, uuid)', 'void_settlement(uuid, text)', 'payout_overview()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end $$;
