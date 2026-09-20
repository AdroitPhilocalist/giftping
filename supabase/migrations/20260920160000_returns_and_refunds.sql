-- ============================================================================
-- Stage 11 — returns and partial refunds
--
--  * return_requests   a customer asks to send back (part of) a delivered line; an admin approves or rejects
--  * refunds           the ledger of every refund of a LINE (money going back to the customer). Reserved first ("pending"), then confirmed with the
--                      gateway, then applied ("processed") — a pending row counts against the line's cap so two admins can't refund the same money twice
--  * vendor_adjustments  a debit against a vendor when a refund touches a line that was already put into a settlement; it is netted off their next payout
--
-- Ordering (same rule as cancellation): reserve in the database -> refund at the gateway -> apply the consequences atomically.
-- A failed gateway call leaves a failed/pending row that can be retried; nothing is ever applied that the gateway didn't confirm.
-- Everything that moves money state is service_role-only; customers and vendors can only READ their own rows.
-- ============================================================================

insert into public.platform_settings (key, value, description) values
  ('return_window_days', '7'::jsonb, 'Days after delivery during which a customer can request a return')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------
create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id),
  quantity integer not null check (quantity > 0),
  reason text not null check (reason in ('damaged', 'wrong_item', 'not_as_described', 'quality', 'changed_mind', 'other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'refunded', 'cancelled')),
  decision_note text check (decision_note is null or char_length(decision_note) <= 300),
  decided_by uuid references public.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index return_requests_order_idx on public.return_requests (order_id);
create index return_requests_customer_idx on public.return_requests (customer_id, created_at desc);
create index return_requests_vendor_idx on public.return_requests (vendor_id, created_at desc);
create index return_requests_status_idx on public.return_requests (status);
-- one live request per line: a second one can only be opened once the first is finished
create unique index return_requests_one_open_per_item on public.return_requests (order_item_id) where status in ('requested', 'approved');
create trigger set_return_requests_updated_at before update on public.return_requests for each row execute function public.set_updated_at();

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  return_request_id uuid references public.return_requests(id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0),
  reason text not null check (char_length(reason) between 3 and 200),
  returned_quantity integer not null default 0 check (returned_quantity >= 0),
  restock boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  gateway_refund_id text unique,
  failure_reason text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index refunds_order_idx on public.refunds (order_id);
create index refunds_item_idx on public.refunds (order_item_id);
create index refunds_status_idx on public.refunds (status);
-- a return request can be refunded once
create unique index refunds_one_per_return on public.refunds (return_request_id) where return_request_id is not null and status <> 'failed';

create table public.vendor_adjustments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id),
  refund_id uuid not null unique references public.refunds(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  amount numeric(10, 2) not null check (amount <> 0),   -- negative = a debit against the vendor
  reason text not null,
  settlement_id uuid references public.vendor_settlements(id) on delete set null,
  created_at timestamptz not null default now()
);
create index vendor_adjustments_vendor_idx on public.vendor_adjustments (vendor_id, settlement_id);

alter table public.order_item_financials
  add column refunded_commission numeric(10, 2) not null default 0,
  add column refunded_payout numeric(10, 2) not null default 0;

-- ---------------------------------------------------------------------------
-- RLS: read-only for the people involved; NO client write policies at all
-- ---------------------------------------------------------------------------
alter table public.return_requests enable row level security;
alter table public.refunds enable row level security;
alter table public.vendor_adjustments enable row level security;

create policy return_requests_select_involved on public.return_requests
  for select using (customer_id = auth.uid() or vendor_id = public.own_vendor_id() or public.is_admin());

create policy refunds_select_involved on public.refunds
  for select using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
    or exists (select 1 from public.order_items oi where oi.id = order_item_id and oi.vendor_id = public.own_vendor_id())
  );

create policy vendor_adjustments_select_own_or_admin on public.vendor_adjustments
  for select using (vendor_id = public.own_vendor_id() or public.is_admin());

-- The blanket grants migration only covered tables that existed then, and new tables inherit default privileges: strip writes explicitly.
revoke insert, update, delete on public.return_requests, public.refunds, public.vendor_adjustments from anon, authenticated;
revoke all on public.return_requests, public.refunds, public.vendor_adjustments from anon;

-- ---------------------------------------------------------------------------
-- returns
-- ---------------------------------------------------------------------------
create or replace function public.create_return_request(
  p_customer_id uuid, p_order_item_id uuid, p_quantity integer, p_reason text, p_details text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  it public.order_items%rowtype;
  o public.orders%rowtype;
  v_delivered timestamptz;
  v_window integer;
  v_id uuid;
begin
  select * into it from public.order_items where id = p_order_item_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  select * into o from public.orders where id = it.order_id;
  if o.customer_id is distinct from p_customer_id then
    return jsonb_build_object('result', 'not_found');          -- somebody else's order looks exactly like a missing one
  end if;
  if o.status in ('cancelled', 'refunded') or it.fulfilment_status <> 'delivered' then
    return jsonb_build_object('result', 'not_delivered');
  end if;

  select sh.delivered_at into v_delivered from public.shipments sh
  where sh.order_id = it.order_id and sh.vendor_id = it.vendor_id and sh.is_return = false and sh.status = 'delivered' and sh.delivered_at is not null
  order by sh.delivered_at desc limit 1;
  select coalesce((select (value #>> '{}')::integer from public.platform_settings where key = 'return_window_days'), 7) into v_window;
  if v_delivered is null or v_delivered + make_interval(days => v_window) < now() then
    return jsonb_build_object('result', 'window_closed', 'window_days', v_window);
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > it.quantity - it.returned_quantity then
    return jsonb_build_object('result', 'bad_quantity', 'available', it.quantity - it.returned_quantity);
  end if;
  if it.refunded_amount >= it.total_price - it.discount_amount then
    return jsonb_build_object('result', 'already_refunded');
  end if;
  if exists (select 1 from public.return_requests where order_item_id = it.id and status in ('requested', 'approved')) then
    return jsonb_build_object('result', 'already_open');
  end if;

  insert into public.return_requests (order_id, order_item_id, customer_id, vendor_id, quantity, reason, details)
  values (it.order_id, it.id, p_customer_id, it.vendor_id, p_quantity, p_reason, nullif(left(trim(coalesce(p_details, '')), 500), ''))
  returning id into v_id;
  return jsonb_build_object('result', 'created', 'id', v_id, 'order_id', it.order_id, 'vendor_id', it.vendor_id, 'order_number', o.order_number, 'product_name', it.product_name);
end;
$$;

create or replace function public.decide_return_request(p_id uuid, p_admin_id uuid, p_approve boolean, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.return_requests%rowtype;
begin
  select * into r from public.return_requests where id = p_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  if r.status <> 'requested' then
    return jsonb_build_object('result', 'not_pending', 'status', r.status);
  end if;
  if not p_approve and char_length(trim(coalesce(p_note, ''))) < 5 then
    return jsonb_build_object('result', 'note_required');
  end if;
  update public.return_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      decision_note = nullif(left(trim(coalesce(p_note, '')), 300), ''), decided_by = p_admin_id, decided_at = now()
  where id = p_id;
  return jsonb_build_object('result', case when p_approve then 'approved' else 'rejected' end,
                            'customer_id', r.customer_id, 'vendor_id', r.vendor_id, 'order_id', r.order_id);
end;
$$;

create or replace function public.cancel_return_request(p_id uuid, p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.return_requests%rowtype;
begin
  select * into r from public.return_requests where id = p_id and customer_id = p_customer_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  if r.status <> 'requested' then
    return jsonb_build_object('result', 'not_cancellable', 'status', r.status);
  end if;
  update public.return_requests set status = 'cancelled' where id = p_id;
  return jsonb_build_object('result', 'cancelled');
end;
$$;

-- ---------------------------------------------------------------------------
-- refunds: step 1 — validate and RESERVE (row-locks the order so concurrent refunds serialise)
-- ---------------------------------------------------------------------------
create or replace function public.begin_refund(
  p_order_item_id uuid, p_amount numeric, p_reason text, p_return_request_id uuid, p_returned_qty integer, p_restock boolean, p_admin_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  it public.order_items%rowtype;
  o public.orders%rowtype;
  pay public.payments%rowtype;
  rr public.return_requests%rowtype;
  v_amount numeric := round(p_amount, 2);
  v_paid numeric;
  v_reserved numeric;
  v_pending_qty integer;
  v_order_refunded numeric;
  v_id uuid;
begin
  select * into it from public.order_items where id = p_order_item_id;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  select * into o from public.orders where id = it.order_id for update;   -- serialise everything that refunds this order
  select * into it from public.order_items where id = p_order_item_id;   -- re-read under the lock

  if v_amount is null or v_amount <= 0 then
    return jsonb_build_object('result', 'bad_amount');
  end if;
  if o.status in ('created', 'payment_initiated', 'cancelled', 'refunded') or it.fulfilment_status <> 'delivered' then
    return jsonb_build_object('result', 'not_delivered');
  end if;
  select * into pay from public.payments where order_id = o.id and status in ('captured', 'refunded') order by captured_at desc nulls last limit 1;
  if not found or pay.status <> 'captured' or pay.razorpay_payment_id is null then
    return jsonb_build_object('result', 'no_payment');
  end if;

  v_paid := it.total_price - it.discount_amount;
  select coalesce(sum(amount), 0), coalesce(sum(returned_quantity), 0) into v_reserved, v_pending_qty
  from public.refunds where order_item_id = it.id and status = 'pending';
  if v_amount > v_paid - it.refunded_amount - v_reserved then
    return jsonb_build_object('result', 'exceeds_line', 'remaining', greatest(0, v_paid - it.refunded_amount - v_reserved));
  end if;
  select coalesce(sum(amount), 0) into v_order_refunded from public.refunds where order_id = o.id and status in ('pending', 'processed');
  if v_order_refunded + v_amount > pay.amount then
    return jsonb_build_object('result', 'exceeds_payment');
  end if;

  if p_returned_qty is null or p_returned_qty < 0 or p_returned_qty > it.quantity - it.returned_quantity - v_pending_qty then
    return jsonb_build_object('result', 'bad_quantity');
  end if;

  if p_return_request_id is not null then
    select * into rr from public.return_requests where id = p_return_request_id for update;
    if not found or rr.order_item_id <> it.id then
      return jsonb_build_object('result', 'return_not_found');
    end if;
    if rr.status <> 'approved' then
      return jsonb_build_object('result', 'return_not_approved', 'status', rr.status);
    end if;
    if exists (select 1 from public.refunds where return_request_id = rr.id and status <> 'failed') then
      return jsonb_build_object('result', 'return_already_refunded');
    end if;
  end if;

  insert into public.refunds (order_id, order_item_id, return_request_id, amount, reason, returned_quantity, restock, created_by)
  values (o.id, it.id, p_return_request_id, v_amount, left(trim(p_reason), 200), p_returned_qty, coalesce(p_restock, false) and p_returned_qty > 0, p_admin_id)
  returning id into v_id;

  return jsonb_build_object('result', 'reserved', 'refund_id', v_id, 'amount', v_amount, 'razorpay_payment_id', pay.razorpay_payment_id,
                            'order_id', o.id, 'order_number', o.order_number, 'customer_id', o.customer_id);
end;
$$;

-- a failed refund gave its reservation back; retrying must re-check the cap against what has happened since
create or replace function public.reopen_refund(p_refund_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f public.refunds%rowtype;
  it public.order_items%rowtype;
  o public.orders%rowtype;
  v_reserved numeric;
  v_pending_qty integer;
begin
  select * into f from public.refunds where id = p_refund_id;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  select * into o from public.orders where id = f.order_id for update;
  select * into f from public.refunds where id = p_refund_id for update;
  if f.status = 'processed' then
    return jsonb_build_object('result', 'already_processed');
  end if;
  if f.status = 'pending' then
    return jsonb_build_object('result', 'reserved', 'refund_id', f.id);
  end if;
  select * into it from public.order_items where id = f.order_item_id;
  select coalesce(sum(amount), 0), coalesce(sum(returned_quantity), 0) into v_reserved, v_pending_qty
  from public.refunds where order_item_id = it.id and status = 'pending';
  if f.amount > it.total_price - it.discount_amount - it.refunded_amount - v_reserved
     or f.returned_quantity > it.quantity - it.returned_quantity - v_pending_qty then
    return jsonb_build_object('result', 'exceeds_line');
  end if;
  if f.return_request_id is not null and exists (select 1 from public.refunds where return_request_id = f.return_request_id and status <> 'failed' and id <> f.id) then
    return jsonb_build_object('result', 'return_already_refunded');
  end if;
  update public.refunds set status = 'pending', failure_reason = null where id = f.id;
  return jsonb_build_object('result', 'reserved', 'refund_id', f.id);
end;
$$;

create or replace function public.fail_refund(p_refund_id uuid, p_error text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.refunds set status = 'failed', failure_reason = left(coalesce(p_error, 'Gateway error'), 300)
  where id = p_refund_id and status = 'pending';
$$;

-- ---------------------------------------------------------------------------
-- refunds: step 3 — the gateway confirmed the money went back; apply every consequence atomically and idempotently
-- ---------------------------------------------------------------------------
create or replace function public.complete_refund(p_refund_id uuid, p_gateway_refund_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f public.refunds%rowtype;
  it public.order_items%rowtype;
  fin public.order_item_financials%rowtype;
  o public.orders%rowtype;
  pay public.payments%rowtype;
  v_paid numeric;
  v_new_refunded numeric;
  v_ratio numeric;
  v_new_commission numeric;
  v_new_payout numeric;
  v_delta_payout numeric;
  v_total_refunded numeric;
begin
  select * into f from public.refunds where id = p_refund_id;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  select * into o from public.orders where id = f.order_id for update;
  select * into f from public.refunds where id = p_refund_id for update;
  if f.status = 'processed' then
    return jsonb_build_object('result', 'already_processed');
  end if;
  -- 'failed' is allowed here on purpose: the gateway may have completed a refund we believed failed (timeout); the money HAS moved, so record it.

  select * into it from public.order_items where id = f.order_item_id for update;
  select * into fin from public.order_item_financials where order_item_id = it.id for update;
  v_paid := it.total_price - it.discount_amount;
  v_new_refunded := it.refunded_amount + f.amount;

  update public.order_items
  set refunded_amount = v_new_refunded,
      returned_quantity = returned_quantity + f.returned_quantity,
      fulfilment_status = case when v_new_refunded >= v_paid then 'returned' else fulfilment_status end
  where id = it.id;

  -- vendor payout and commission shrink in the same proportion (cumulative, so partial refunds sum exactly to the whole)
  if found and fin.order_item_id is not null and v_paid > 0 then
    v_ratio := least(1, v_new_refunded / v_paid);
    v_new_commission := round(fin.commission_amount * v_ratio, 2);
    v_new_payout := round(fin.vendor_payout * v_ratio, 2);
    v_delta_payout := v_new_payout - fin.refunded_payout;
    update public.order_item_financials set refunded_commission = v_new_commission, refunded_payout = v_new_payout where order_item_id = it.id;
    -- the line already belongs to a settlement (paid or being paid): the vendor keeps that money for now, so record a debit for their next payout
    if fin.settlement_id is not null and v_delta_payout <> 0 then
      insert into public.vendor_adjustments (vendor_id, refund_id, order_item_id, amount, reason)
      values (it.vendor_id, f.id, it.id, -v_delta_payout, 'Refund on ' || o.order_number || ' — ' || it.product_name)
      on conflict (refund_id) do nothing;
    end if;
  end if;

  -- units coming back can go back on the shelf (only if the admin said the item is resellable)
  if f.restock and f.returned_quantity > 0 then
    if it.product_id is not null then
      update public.products set stock_quantity = stock_quantity + f.returned_quantity, total_sold = greatest(0, total_sold - f.returned_quantity) where id = it.product_id;
    end if;
    if cardinality(it.variant_ids) > 0 then
      update public.product_variants set stock_quantity = stock_quantity + f.returned_quantity where id = any (it.variant_ids);
    end if;
  end if;

  if f.return_request_id is not null then
    update public.return_requests set status = 'refunded' where id = f.return_request_id and status = 'approved';
  end if;

  update public.refunds set status = 'processed', gateway_refund_id = p_gateway_refund_id, processed_at = now(), failure_reason = null where id = f.id;

  select coalesce(sum(amount), 0) into v_total_refunded from public.refunds where order_id = o.id and status = 'processed';
  select * into pay from public.payments where order_id = o.id and status in ('captured', 'refunded') order by captured_at desc nulls last limit 1;
  if found and v_total_refunded >= pay.amount then
    update public.payments set status = 'refunded', refunded_at = now(), refund_reason = coalesce(refund_reason, 'Fully refunded by line refunds') where id = pay.id;
  end if;

  return jsonb_build_object('result', 'processed', 'order_id', o.id, 'order_number', o.order_number, 'customer_id', o.customer_id,
                            'vendor_id', it.vendor_id, 'amount', f.amount, 'line_fully_refunded', v_new_refunded >= v_paid, 'product_name', it.product_name,
                            'debit', case when fin.settlement_id is not null then coalesce(v_delta_payout, 0) else 0 end);
end;
$$;

-- ---------------------------------------------------------------------------
-- payouts now net out refunds: unsettled lines shrink, already-settled lines become debits on the next settlement
-- ---------------------------------------------------------------------------
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
         (oi.total_price - oi.discount_amount - oi.refunded_amount) as customer_paid,
         f.commission_amount - f.refunded_commission, f.vendor_payout - f.refunded_payout,
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
    and (f.vendor_payout - f.refunded_payout) > 0
    and o.status not in ('cancelled', 'refunded');
$$;

alter table public.vendor_settlements add column adjustments_amount numeric(10, 2) not null default 0;

create or replace function public.create_settlement(p_vendor_id uuid, p_admin_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lines numeric;
  v_adj numeric;
  v_net numeric;
  v_count integer;
  v_from timestamptz;
  v_to timestamptz;
  v_id uuid;
begin
  perform 1 from public.vendors where id = p_vendor_id for update;
  if not found then
    return jsonb_build_object('result', 'vendor_not_found');
  end if;

  select sum(payout), count(*), min(delivered_at), max(delivered_at)
    into v_lines, v_count, v_from, v_to
  from public.settlement_items_all(p_vendor_id) where is_due;

  if v_count is null or v_count = 0 or coalesce(v_lines, 0) <= 0 then
    return jsonb_build_object('result', 'nothing_payable');
  end if;

  -- refund debits from lines that were already paid out come off this payout
  select coalesce(sum(amount), 0) into v_adj from public.vendor_adjustments where vendor_id = p_vendor_id and settlement_id is null;
  v_net := v_lines + v_adj;
  if v_net <= 0 then
    return jsonb_build_object('result', 'debits_exceed', 'payable', round(v_lines, 2), 'adjustments', round(v_adj, 2));   -- the debit carries forward
  end if;

  insert into public.vendor_settlements (vendor_id, amount, adjustments_amount, settlement_period_start, settlement_period_end, status, item_count, created_by)
  values (p_vendor_id, round(v_net, 2), round(v_adj, 2), v_from::date, v_to::date, 'pending', v_count, p_admin_id)
  returning id into v_id;

  update public.order_item_financials f
  set settlement_id = v_id
  where f.order_item_id in (select order_item_id from public.settlement_items_all(p_vendor_id) where is_due);

  update public.vendor_adjustments set settlement_id = v_id where vendor_id = p_vendor_id and settlement_id is null;

  return jsonb_build_object('result', 'created', 'settlement_id', v_id, 'amount', round(v_net, 2), 'items', v_count, 'adjustments', round(v_adj, 2));
end;
$$;

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
    return jsonb_build_object('result', 'already_settled');
  end if;
  if s.status = 'failed' then
    return jsonb_build_object('result', 'already_voided');
  end if;
  update public.order_item_financials set settlement_id = null where settlement_id = p_settlement_id;
  update public.vendor_adjustments set settlement_id = null where settlement_id = p_settlement_id;
  update public.vendor_settlements set status = 'failed', notes = left(coalesce(p_note, 'Voided'), 300) where id = p_settlement_id;
  return jsonb_build_object('result', 'voided');
end;
$$;

drop function public.payout_overview();
create function public.payout_overview()
returns table (vendor_id uuid, business_name text, status text, payable numeric, payable_items integer, in_hold numeric, settled numeric, open_settlements integer, open_adjustments numeric)
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
         (select count(*)::integer from public.vendor_settlements s where s.vendor_id = v.id and s.status in ('pending', 'processing')),
         coalesce((select sum(a.amount) from public.vendor_adjustments a where a.vendor_id = v.id and a.settlement_id is null), 0)
  from public.vendors v
  where v.status in ('approved', 'suspended')
    and not exists (select 1 from public.products p where p.vendor_id = v.id and p.is_in_house)
  order by v.business_name;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'create_return_request(uuid, uuid, integer, text, text)', 'decide_return_request(uuid, uuid, boolean, text)', 'cancel_return_request(uuid, uuid)',
    'begin_refund(uuid, numeric, text, uuid, integer, boolean, uuid)', 'reopen_refund(uuid)', 'fail_refund(uuid, text)', 'complete_refund(uuid, text)',
    'settlement_items_all(uuid)', 'create_settlement(uuid, uuid)', 'void_settlement(uuid, text)', 'payout_overview()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end $$;
