-- ============================================================================
-- Stage 11 — admin order cancellation (the atomic, money-safe half of "cancel & refund")
--
-- cancel_order_and_restock() runs BEFORE the gateway refund is attempted. Order of operations is deliberate:
--   1. cancel + restock atomically here      -> the vendor can no longer ship it, stock is back on the shelf
--   2. refund through the payment gateway    -> if this fails the order stays cancelled and the refund is simply retried
-- (The reverse order could leave a refunded order that a vendor still ships.)
--
-- Refuses when a courier is already booked for any part of the order: that has to be cancelled with the courier first.
-- ============================================================================
create or replace function public.cancel_order_and_restock(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  it record;
  v_paid boolean;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  if o.status in ('cancelled', 'refunded') then
    return jsonb_build_object('result', 'already_cancelled', 'status', o.status);
  end if;
  if o.status not in ('created', 'payment_initiated', 'confirmed', 'processing') then
    -- partially_shipped / shipped / delivered …: this is a return, not a cancellation
    return jsonb_build_object('result', 'not_cancellable', 'status', o.status);
  end if;
  if exists (
    select 1 from public.shipments s
    where s.order_id = o.id and s.is_return = false and s.status <> 'cancelled' and s.awb_number is not null
  ) then
    return jsonb_build_object('result', 'shipment_booked');
  end if;

  -- stock was only ever taken once the order was paid (see confirm_order_payment)
  v_paid := o.status in ('confirmed', 'processing');
  if v_paid then
    for it in select product_id, variant_ids, quantity from public.order_items where order_id = o.id order by product_id loop
      if it.product_id is not null then
        update public.products
        set stock_quantity = stock_quantity + it.quantity, total_sold = greatest(0, total_sold - it.quantity)
        where id = it.product_id;
      end if;
      if cardinality(it.variant_ids) > 0 then
        update public.product_variants set stock_quantity = stock_quantity + it.quantity where id = any (it.variant_ids);
      end if;
    end loop;
  end if;

  update public.order_items set fulfilment_status = 'cancelled' where order_id = o.id;
  update public.shipments set status = 'cancelled' where order_id = o.id and is_return = false and status <> 'cancelled';
  perform public.release_order_coupon(o.id);
  update public.payments set status = 'failed', failure_reason = coalesce(nullif(p_reason, ''), 'Cancelled by admin')
    where order_id = o.id and status in ('pending', 'processing');
  update public.orders set status = 'cancelled', notes = coalesce(nullif(p_reason, ''), notes) where id = o.id;

  return jsonb_build_object('result', 'cancelled', 'was_paid', v_paid, 'order_id', o.id);
end;
$$;

revoke all on function public.cancel_order_and_restock(uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_order_and_restock(uuid, text) to service_role;
