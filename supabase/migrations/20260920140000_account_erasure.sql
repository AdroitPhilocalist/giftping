-- ============================================================================
-- Stage 11 — DPDP-style account erasure.
--
-- orders.customer_id has no ON DELETE, by design: financial records (orders, payments, coupon redemptions) must survive for accounting and tax.
-- So a user is ANONYMISED, not deleted: everything personal is removed or scrubbed, the users row stays as "Deleted User".
--
--   removed:   diary (people, dates, gifts, reminder history), addresses, wishlist, cart, reviews, Q&A questions, notifications and preferences, loyalty ledger
--   scrubbed:  users (name, email, phone, avatar, birth date, gender, referral/onesignal ids); order delivery addresses (keeps city/state/pincode for tax & logistics stats),
--              gift messages and notes
--   kept:      orders, order items, payments, coupon redemptions, audit log (none of which carry the person's identity once the above is done)
--
-- Refused (nothing is changed): admin accounts, accounts that own a vendor profile, and customers with an order still in progress —
-- a vendor needs the real address to deliver it. The function is idempotent, so a retry after a partial failure is safe.
-- ============================================================================
create or replace function public.anonymize_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.users%rowtype;
  v_placeholder text;
begin
  select * into u from public.users where id = p_user_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  if u.anonymized_at is not null then
    return jsonb_build_object('result', 'already_erased');
  end if;
  if u.role = 'admin' then
    return jsonb_build_object('result', 'admin_protected');
  end if;
  if exists (select 1 from public.vendors where user_id = p_user_id) then
    return jsonb_build_object('result', 'vendor_account');
  end if;
  if exists (
    select 1 from public.orders o
    where o.customer_id = p_user_id and o.status not in ('delivered', 'cancelled', 'refunded')
  ) then
    return jsonb_build_object('result', 'open_orders');
  end if;

  -- ---- remove everything personal
  delete from public.gift_history where user_id = p_user_id;
  delete from public.diary_contacts where user_id = p_user_id;      -- cascades diary_events and diary_reminder_log
  delete from public.addresses where user_id = p_user_id;
  delete from public.wishlists where user_id = p_user_id;
  delete from public.cart where user_id = p_user_id;                 -- cascades cart_items
  delete from public.reviews where user_id = p_user_id;              -- the rating rollup trigger recomputes the product's average
  delete from public.product_qna where asked_by = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.loyalty_ledger where user_id = p_user_id;
  update public.users set referred_by = null where referred_by = p_user_id;

  -- ---- scrub what must stay (order records): no name, phone or street address any more
  update public.orders
  set delivery_address = jsonb_build_object(
        'recipient_name', 'Deleted User',
        'city', delivery_address->>'city', 'state', delivery_address->>'state',
        'pincode', delivery_address->>'pincode', 'country', coalesce(delivery_address->>'country', 'India')),
      gift_message = null,
      notes = null
  where customer_id = p_user_id;

  -- ---- the user row itself. The email stays unique and non-deliverable (".invalid" is reserved and can never resolve).
  v_placeholder := 'deleted-' || replace(p_user_id::text, '-', '') || '@deleted.giftping.invalid';
  update public.users
  set email = v_placeholder,
      full_name = 'Deleted User',
      phone = null, phone_verified = false, avatar_url = null, date_of_birth = null, gender = null,
      referral_code = null, onesignal_player_id = null, marketing_opt_in = false,
      is_active = false, deleted_at = coalesce(deleted_at, now()), anonymized_at = now()
  where id = p_user_id;

  return jsonb_build_object('result', 'erased');
end;
$$;

revoke all on function public.anonymize_user(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_user(uuid) to service_role;
