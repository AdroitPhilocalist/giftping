-- ============================================================================
-- A settlement statement must keep showing what was actually settled.
--
-- Refunds after a line was settled are recorded as debits (vendor_adjustments) that come off the NEXT payout. If the statement of the earlier
-- settlement recalculated its lines from the live (refund-reduced) numbers, its lines would no longer add up to the amount that was paid.
-- So each line's payout/commission is snapshotted onto the line at the moment it is put into a settlement.
-- ============================================================================
alter table public.order_item_financials
  add column settled_payout numeric(10, 2),
  add column settled_commission numeric(10, 2);

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

  select coalesce(sum(amount), 0) into v_adj from public.vendor_adjustments where vendor_id = p_vendor_id and settlement_id is null;
  v_net := v_lines + v_adj;
  if v_net <= 0 then
    return jsonb_build_object('result', 'debits_exceed', 'payable', round(v_lines, 2), 'adjustments', round(v_adj, 2));
  end if;

  insert into public.vendor_settlements (vendor_id, amount, adjustments_amount, settlement_period_start, settlement_period_end, status, item_count, created_by)
  values (p_vendor_id, round(v_net, 2), round(v_adj, 2), v_from::date, v_to::date, 'pending', v_count, p_admin_id)
  returning id into v_id;

  update public.order_item_financials f
  set settlement_id = v_id, settled_payout = i.payout, settled_commission = i.commission
  from public.settlement_items_all(p_vendor_id) i
  where i.is_due and f.order_item_id = i.order_item_id;

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
  -- A refund recorded AFTER a line was settled became a debit for the next payout. Once the line goes back to the pool its live payout already
  -- reflects that refund, so keeping the debit would deduct it twice: drop the line's own open debits. If one was already netted into another
  -- payout the books can't be unwound safely from here — that payout has to be voided first.
  if exists (
    select 1 from public.vendor_adjustments a
    join public.order_item_financials f on f.order_item_id = a.order_item_id
    where f.settlement_id = p_settlement_id and a.settlement_id is not null and a.settlement_id <> p_settlement_id
  ) then
    return jsonb_build_object('result', 'debit_in_other_settlement');
  end if;
  delete from public.vendor_adjustments a
  using public.order_item_financials f
  where f.settlement_id = p_settlement_id and a.order_item_id = f.order_item_id and a.settlement_id is null;
  update public.order_item_financials set settlement_id = null, settled_payout = null, settled_commission = null where settlement_id = p_settlement_id;
  update public.vendor_adjustments set settlement_id = null where settlement_id = p_settlement_id;
  update public.vendor_settlements set status = 'failed', notes = left(coalesce(p_note, 'Voided'), 300) where id = p_settlement_id;
  return jsonb_build_object('result', 'voided');
end;
$$;

revoke all on function public.create_settlement(uuid, uuid) from public, anon, authenticated;
revoke all on function public.void_settlement(uuid, text) from public, anon, authenticated;
grant execute on function public.create_settlement(uuid, uuid) to service_role;
grant execute on function public.void_settlement(uuid, text) to service_role;
