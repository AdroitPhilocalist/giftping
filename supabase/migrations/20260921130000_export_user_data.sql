-- ============================================================================
-- Stage 11 — "download my data" (DPDP right of access)
--
-- export_user_data(user) builds ONE json document of everything the platform holds about that person, from an explicit list of columns per table — never
-- `select *`, so a column added to a table later cannot leak into an export by accident. It is service_role only; the app calls it only for the
-- signed-in user's own id.
--
-- Deliberately NOT included (and said so inside the file): platform-internal money (commission, vendor payouts, order_item_financials), payment gateway
-- signatures, encrypted bank numbers, courier/Shiprocket internals, audit logs and admin notes about the account, other people's data, and push device ids.
-- ============================================================================
create or replace function public.export_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  u public.users%rowtype;
  v_vendor_id uuid;
  result jsonb;
begin
  select * into u from public.users where id = p_user_id;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  if u.anonymized_at is not null then
    return jsonb_build_object('result', 'erased');
  end if;
  select id into v_vendor_id from public.vendors where user_id = p_user_id;

  result := jsonb_build_object(
    'about_this_file', jsonb_build_object(
      'generated_at', now(),
      'description', 'A copy of the personal data GiftPing holds about you, in JSON.',
      'not_included', jsonb_build_array(
        'GiftPing''s internal accounting for orders (commission and vendor payout amounts)',
        'payment-gateway signatures and internal courier/booking identifiers',
        'encrypted bank account numbers (only the last 4 digits are shown for vendors)',
        'internal audit logs and staff notes',
        'information about other people'
      )
    ),

    'profile', jsonb_build_object(
      'id', u.id, 'email', u.email, 'full_name', u.full_name, 'phone', u.phone, 'phone_verified', u.phone_verified, 'avatar_url', u.avatar_url,
      'date_of_birth', u.date_of_birth, 'gender', u.gender, 'role', u.role, 'timezone', u.timezone, 'marketing_opt_in', u.marketing_opt_in,
      'referral_code', u.referral_code, 'joined_at', u.created_at, 'last_sign_in_at', u.last_login_at
    ),

    'addresses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', a.label, 'recipient_name', a.recipient_name, 'phone', a.phone, 'address_line1', a.address_line1, 'address_line2', a.address_line2,
        'landmark', a.landmark, 'city', a.city, 'state', a.state, 'pincode', a.pincode, 'country', a.country, 'is_default', a.is_default, 'saved_at', a.created_at
      ) order by a.created_at) from public.addresses a where a.user_id = p_user_id), '[]'::jsonb),

    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'order_number', o.order_number, 'status', o.status, 'placed_at', o.placed_at, 'created_at', o.created_at,
        'delivery_address', o.delivery_address, 'gift_message', o.gift_message, 'gift_wrap', o.gift_wrap_selected, 'gift_wrap_charge', o.gift_wrap_charge,
        'subtotal', o.subtotal, 'discount', o.discount_amount, 'coupon_code', o.coupon_code, 'delivery_charge', o.delivery_charge, 'gst_included', o.gst_amount,
        'total', o.total_amount, 'notes', o.notes,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'product', i.product_name, 'boutique', vd.business_name, 'option', i.variant_label, 'personalization', i.personalization, 'quantity', i.quantity,
            'unit_price', i.unit_price, 'line_total', i.total_price, 'discount', i.discount_amount, 'gst_rate', i.gst_rate, 'gst_amount', i.gst_amount,
            'status', i.fulfilment_status, 'units_returned', i.returned_quantity, 'amount_refunded', i.refunded_amount
          ) order by i.created_at)
          from public.order_items i left join public.vendors vd on vd.id = i.vendor_id where i.order_id = o.id), '[]'::jsonb),
        'payments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'amount', p.amount, 'currency', p.currency, 'status', p.status, 'method', p.payment_method, 'captured_at', p.captured_at,
            'gateway_order_id', p.razorpay_order_id, 'gateway_payment_id', p.razorpay_payment_id, 'refund_id', p.refund_id, 'refunded_at', p.refunded_at, 'refund_reason', p.refund_reason
          ) order by p.created_at) from public.payments p where p.order_id = o.id), '[]'::jsonb),
        'shipments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'boutique', vs.business_name, 'status', s.status, 'courier', s.courier_name, 'tracking_number', s.awb_number, 'tracking_url', s.tracking_url,
            'shipped_at', s.shipped_at, 'delivered_at', s.delivered_at, 'is_return', s.is_return
          ) order by s.created_at)
          from public.shipments s left join public.vendors vs on vs.id = s.vendor_id where s.order_id = o.id), '[]'::jsonb),
        'return_requests', coalesce((
          select jsonb_agg(jsonb_build_object(
            'product', ri.product_name, 'quantity', r.quantity, 'reason', r.reason, 'details', r.details, 'status', r.status, 'decision_note', r.decision_note, 'requested_at', r.created_at
          ) order by r.created_at)
          from public.return_requests r join public.order_items ri on ri.id = r.order_item_id where r.order_id = o.id), '[]'::jsonb),
        'refunds', coalesce((
          select jsonb_agg(jsonb_build_object(
            'product', fi.product_name, 'amount', f.amount, 'status', f.status, 'reason', f.reason, 'created_at', f.created_at, 'processed_at', f.processed_at
          ) order by f.created_at)
          from public.refunds f join public.order_items fi on fi.id = f.order_item_id where f.order_id = o.id), '[]'::jsonb)
      ) order by o.created_at)
      from public.orders o where o.customer_id = p_user_id), '[]'::jsonb),

    'wishlist', coalesce((
      select jsonb_agg(jsonb_build_object('product', pr.name, 'product_page', '/products/' || pr.slug, 'added_at', w.created_at) order by w.created_at)
      from public.wishlists w join public.products pr on pr.id = w.product_id where w.user_id = p_user_id), '[]'::jsonb),

    'cart', coalesce((
      select jsonb_agg(jsonb_build_object('product', pr.name, 'quantity', ci.quantity, 'personalization', ci.personalization, 'added_at', ci.created_at) order by ci.created_at)
      from public.cart c join public.cart_items ci on ci.cart_id = c.id join public.products pr on pr.id = ci.product_id where c.user_id = p_user_id), '[]'::jsonb),

    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product', pr.name, 'rating', rv.rating, 'title', rv.title, 'body', rv.body, 'verified_purchase', rv.is_verified_purchase, 'written_at', rv.created_at,
        'boutique_reply', rv.vendor_response
      ) order by rv.created_at)
      from public.reviews rv join public.products pr on pr.id = rv.product_id where rv.user_id = p_user_id), '[]'::jsonb),

    'product_questions', coalesce((
      select jsonb_agg(jsonb_build_object('product', pr.name, 'question', q.question, 'answer', q.answer, 'asked_at', q.created_at) order by q.created_at)
      from public.product_qna q join public.products pr on pr.id = q.product_id where q.asked_by = p_user_id), '[]'::jsonb),

    'gifting_diary', jsonb_build_object(
      'people', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', dc.name, 'relationship', dc.relationship, 'interests', dc.interests, 'gift_preferences', dc.gift_preferences, 'notes', dc.notes,
          'budget_max', dc.budget_max, 'favourite', dc.is_favorite, 'added_at', dc.created_at
        ) order by dc.created_at) from public.diary_contacts dc where dc.user_id = p_user_id), '[]'::jsonb),
      'dates', coalesce((
        select jsonb_agg(jsonb_build_object(
          'person', dc.name, 'type', de.event_type, 'title', de.title, 'date', de.event_date, 'repeats_yearly', de.is_recurring, 'notes', de.notes,
          'reminder_days_before', de.reminder_days, 'reminders_on', de.is_active
        ) order by de.event_date)
        from public.diary_events de join public.diary_contacts dc on dc.id = de.contact_id where de.user_id = p_user_id), '[]'::jsonb),
      'gifts_given', coalesce((
        select jsonb_agg(jsonb_build_object(
          'person', dc.name, 'gift', coalesce(gh.gift_name, pr.name), 'occasion', gh.event_type, 'amount', gh.amount, 'date', gh.gifted_at, 'notes', gh.notes
        ) order by gh.gifted_at)
        from public.gift_history gh left join public.diary_contacts dc on dc.id = gh.contact_id left join public.products pr on pr.id = gh.product_id
        where gh.user_id = p_user_id), '[]'::jsonb)
    ),

    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object('title', n.title, 'message', n.message, 'type', n.type, 'read', n.is_read, 'sent_at', n.created_at) order by n.created_at)
      from public.notifications n where n.user_id = p_user_id), '[]'::jsonb),

    'notification_preferences', coalesce((
      select jsonb_agg(jsonb_build_object('category', np.category, 'email', np.email_enabled, 'push', np.push_enabled) order by np.category)
      from public.notification_preferences np where np.user_id = p_user_id), '[]'::jsonb),

    'rewards', coalesce((
      select jsonb_agg(jsonb_build_object('type', l.type, 'points', l.points, 'balance_after', l.balance_after, 'description', l.description, 'at', l.created_at, 'expires_at', l.expires_at) order by l.created_at)
      from public.loyalty_ledger l where l.user_id = p_user_id), '[]'::jsonb),

    'coupons_used', coalesce((
      select jsonb_agg(jsonb_build_object('code', cp.code, 'discount', cr.discount_amount, 'used_at', cr.created_at) order by cr.created_at)
      from public.coupon_redemptions cr join public.coupons cp on cp.id = cr.coupon_id where cr.user_id = p_user_id), '[]'::jsonb)
  );

  -- A boutique owner also holds business data with us.
  if v_vendor_id is not null then
    result := result || jsonb_build_object('boutique', (
      select jsonb_build_object(
        'business_name', vd.business_name, 'business_type', vd.business_type, 'status', vd.status, 'description', vd.description, 'tagline', vd.short_description,
        'support_email', vd.support_email, 'support_phone', vd.support_phone, 'logo_url', vd.logo_url, 'banner_url', vd.banner_url, 'joined_at', vd.created_at,
        'legal_name', vp.legal_name, 'gstin', vp.gstin, 'pan', vp.pan, 'bank_account_name', vp.bank_account_name, 'bank_account_last4', vp.bank_account_last4,
        'bank_ifsc', vp.bank_ifsc, 'pickup_address', vp.warehouse_address,
        'products', coalesce((select jsonb_agg(jsonb_build_object('name', pd.name, 'status', pd.status, 'price', pd.base_price, 'sku', pd.sku, 'stock', pd.stock_quantity, 'created_at', pd.created_at) order by pd.created_at)
                              from public.products pd where pd.vendor_id = vd.id), '[]'::jsonb),
        'payouts', coalesce((select jsonb_agg(jsonb_build_object('amount', st.amount, 'status', st.status, 'created_at', st.created_at, 'paid_at', st.settled_at, 'bank_reference', st.payment_reference) order by st.created_at)
                             from public.vendor_settlements st where st.vendor_id = vd.id), '[]'::jsonb)
      )
      from public.vendors vd left join public.vendor_private vp on vp.vendor_id = vd.id where vd.id = v_vendor_id
    ));
  end if;

  return jsonb_build_object('result', 'ok', 'data', result);
end;
$$;

revoke all on function public.export_user_data(uuid) from public, anon, authenticated;
grant execute on function public.export_user_data(uuid) to service_role;
