-- ============================================================================
-- Role/ownership helper functions used throughout the policies below. Defined
-- here (rather than in the extensions_and_helpers migration) because they
-- query public.users/public.vendors, which don't exist until core_tables runs.
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and deleted_at is null
  );
$$;

create or replace function public.is_vendor_owner(target_vendor_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.vendors
    where id = target_vendor_id and user_id = auth.uid()
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.owns_product(target_product_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.products p
    join public.vendors v on v.id = p.vendor_id
    where p.id = target_product_id and v.user_id = auth.uid()
  );
$$;

create or replace function public.own_vendor_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.vendors where user_id = auth.uid();
$$;

create or replace function public.vendor_has_order_item(target_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.order_items oi
    join public.vendors v on v.id = oi.vendor_id
    where oi.order_id = target_order_id and v.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- Security triggers — RLS governs row *visibility*, not which columns a
-- permitted UPDATE may touch. These close the gaps that matter most: a user
-- granting themselves admin, or a vendor self-approving their own listing.
-- ============================================================================

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an admin can change a user''s role';
  end if;
  return new;
end;
$$;

create trigger users_prevent_role_self_escalation
  before update on public.users
  for each row execute function public.prevent_role_self_escalation();

create or replace function public.prevent_vendor_admin_field_tampering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
    or new.commission_rate is distinct from old.commission_rate
    or new.is_featured is distinct from old.is_featured
    or new.approved_at is distinct from old.approved_at
    or new.suspended_at is distinct from old.suspended_at
  then
    raise exception 'Only an admin can change vendor status, commission rate, or featured flag';
  end if;
  return new;
end;
$$;

create trigger vendors_prevent_admin_field_tampering
  before update on public.vendors
  for each row execute function public.prevent_vendor_admin_field_tampering();

-- A vendor editing their own product can only ever move it back to 'pending' (per the
-- feature spec: edits re-enter admin review) or 'inactive' (self-deactivate when out of
-- stock) — never directly to 'active'/'approved'/'rejected', which only an admin may set.
create or replace function public.enforce_product_status_transitions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status and new.status not in ('pending', 'inactive') then
    raise exception 'Vendors may only set product status to pending or inactive; admin approval is required otherwise';
  end if;
  if new.is_in_house is distinct from old.is_in_house then
    raise exception 'Only an admin can change is_in_house';
  end if;
  return new;
end;
$$;

create trigger products_enforce_status_transitions
  before update on public.products
  for each row execute function public.enforce_product_status_transitions();

-- A review's rating/title/body/verified-purchase status belongs to the reviewer (and is
-- derived from real purchase data, not client input); a vendor may only ever add their own
-- response underneath it.
create or replace function public.enforce_review_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.user_id or public.is_admin() then
    return new;
  end if;
  if public.owns_product(old.product_id) then
    if new.rating is distinct from old.rating
      or new.title is distinct from old.title
      or new.body is distinct from old.body
      or new.user_id is distinct from old.user_id
      or new.is_verified_purchase is distinct from old.is_verified_purchase
    then
      raise exception 'Vendors may only set vendor_response on a review';
    end if;
    return new;
  end if;
  raise exception 'Not authorized to update this review';
end;
$$;

create trigger reviews_enforce_update_scope
  before update on public.reviews
  for each row execute function public.enforce_review_update_scope();

-- is_verified_purchase is derived server-side from real order data on insert, never trusted
-- from client input.
create or replace function public.set_review_verified_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.is_verified_purchase := exists (
    select 1 from public.order_items oi
    where oi.id = new.order_item_id
      and oi.product_id = new.product_id
      and oi.fulfilment_status = 'delivered'
      and exists (
        select 1 from public.orders o where o.id = oi.order_id and o.customer_id = new.user_id
      )
  );
  return new;
end;
$$;

create trigger reviews_set_verified_purchase
  before insert on public.reviews
  for each row execute function public.set_review_verified_purchase();

-- Validates and returns discount details for a coupon code without exposing the coupons
-- table to direct client SELECT (which would let anyone enumerate every active code).
create or replace function public.validate_coupon(
  p_code text,
  p_order_amount numeric,
  p_vendor_id uuid default null
)
returns table (
  coupon_id uuid,
  discount_type text,
  discount_value numeric,
  max_discount_amount numeric,
  is_valid boolean,
  error_message text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_coupon public.coupons%rowtype;
  v_user_redemptions integer;
begin
  select * into v_coupon from public.coupons where code = p_code and is_active = true;

  if not found then
    return query select null::uuid, null::text, null::numeric, null::numeric, false, 'Invalid coupon code';
    return;
  end if;

  if v_coupon.valid_until is not null and v_coupon.valid_until < now() then
    return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, false, 'Coupon has expired';
    return;
  end if;

  if v_coupon.vendor_id is not null and v_coupon.vendor_id is distinct from p_vendor_id then
    return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, false, 'Coupon is not valid for this vendor';
    return;
  end if;

  if p_order_amount < v_coupon.min_order_amount then
    return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, false, format('Minimum order amount is %s', v_coupon.min_order_amount);
    return;
  end if;

  if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
    return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, false, 'Coupon usage limit reached';
    return;
  end if;

  select count(*) into v_user_redemptions
  from public.coupon_redemptions
  where coupon_id = v_coupon.id and user_id = auth.uid();

  if v_user_redemptions >= v_coupon.per_user_limit then
    return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, false, 'You have already used this coupon';
    return;
  end if;

  return query select v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_coupon.max_discount_amount, true, null::text;
end;
$$;

-- ============================================================================
-- Enable RLS everywhere
-- ============================================================================

alter table public.users enable row level security;
alter table public.addresses enable row level security;
alter table public.vendors enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_qna enable row level security;
alter table public.cart enable row level security;
alter table public.cart_items enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.vendor_settlements enable row level security;
alter table public.diary_contacts enable row level security;
alter table public.diary_events enable row level security;
alter table public.gift_history enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.banners enable row level security;
alter table public.loyalty_ledger enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================================
-- users
-- ============================================================================

create policy users_select_own_or_admin on public.users
  for select using (id = auth.uid() or public.is_admin());

create policy users_update_own_or_admin on public.users
  for update using (id = auth.uid() or public.is_admin());
-- No insert/delete policy: rows are created by handle_new_auth_user() (security definer)
-- and never hard-deleted (see deleted_at/anonymized_at instead).

-- ============================================================================
-- addresses — owner + admin only; never exposed to vendors directly (they see
-- the order's delivery_address snapshot instead).
-- ============================================================================

create policy addresses_all_own_or_admin on public.addresses
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- vendors — public can see approved storefronts; owner sees their own row at
-- any status; admin sees everything.
-- ============================================================================

create policy vendors_select_public_or_own_or_admin on public.vendors
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());

create policy vendors_insert_own on public.vendors
  for insert with check (user_id = auth.uid());

create policy vendors_update_own_or_admin on public.vendors
  for update using (user_id = auth.uid() or public.is_admin());
-- Field-level enforcement (status/commission_rate/is_featured/approved_at/suspended_at)
-- is handled by vendors_prevent_admin_field_tampering above.

-- ============================================================================
-- categories — public read of active categories; admin manages the taxonomy.
-- ============================================================================

create policy categories_select_active_or_admin on public.categories
  for select using (is_active or public.is_admin());

create policy categories_write_admin_only on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- products — public read of active listings; vendor manages their own catalog
-- (status transitions constrained by products_enforce_status_transitions).
-- ============================================================================

create policy products_select_public_or_own_or_admin on public.products
  for select using (
    status = 'active' or public.owns_product(id) or public.is_admin()
  );

create policy products_insert_own_vendor_or_admin on public.products
  for insert with check (public.is_vendor_owner(vendor_id) or public.is_admin());

create policy products_update_own_or_admin on public.products
  for update using (public.owns_product(id) or public.is_admin());

create policy products_delete_own_or_admin on public.products
  for delete using (public.owns_product(id) or public.is_admin());

create policy product_images_select_public_or_own_or_admin on public.product_images
  for select using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
    or public.owns_product(product_id)
    or public.is_admin()
  );

create policy product_images_write_own_or_admin on public.product_images
  for all using (public.owns_product(product_id) or public.is_admin())
  with check (public.owns_product(product_id) or public.is_admin());

create policy product_variants_select_public_or_own_or_admin on public.product_variants
  for select using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
    or public.owns_product(product_id)
    or public.is_admin()
  );

create policy product_variants_write_own_or_admin on public.product_variants
  for all using (public.owns_product(product_id) or public.is_admin())
  with check (public.owns_product(product_id) or public.is_admin());

create policy product_qna_select on public.product_qna
  for select using (
    is_published or asked_by = auth.uid() or public.owns_product(product_id) or public.is_admin()
  );

create policy product_qna_insert_authenticated on public.product_qna
  for insert with check (asked_by = auth.uid());

create policy product_qna_update_own_product_or_admin on public.product_qna
  for update using (public.owns_product(product_id) or public.is_admin());

-- ============================================================================
-- cart / cart_items — authenticated owner only. Guest carts (user_id null,
-- identified by guest_token) have no client-side RLS path at all: guest cart
-- reads/writes go through a server route using the service-role client, which
-- is responsible for checking the request's guest_token cookie itself before
-- touching the row. A raw anon-key client can never read or write a guest cart.
-- ============================================================================

create policy cart_all_own on public.cart
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy cart_items_all_own on public.cart_items
  for all using (
    exists (select 1 from public.cart c where c.id = cart_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.cart c where c.id = cart_id and c.user_id = auth.uid())
  );

-- ============================================================================
-- coupons — no direct client SELECT (would let anyone list every active code);
-- validity is checked exclusively through validate_coupon() above. Admin (and
-- a vendor for their own vendor-scoped coupons) can manage them directly.
-- ============================================================================

create policy coupons_select_own_vendor_or_admin on public.coupons
  for select using (
    (vendor_id is not null and vendor_id = public.own_vendor_id()) or public.is_admin()
  );

create policy coupons_write_own_vendor_or_admin on public.coupons
  for all using (
    (vendor_id is not null and vendor_id = public.own_vendor_id()) or public.is_admin()
  )
  with check (
    (vendor_id is not null and vendor_id = public.own_vendor_id()) or public.is_admin()
  );

-- ============================================================================
-- orders / order_items / payments / shipments / coupon_redemptions /
-- vendor_settlements — read-scoped to the relevant party; writes are
-- deliberately NOT exposed to any client-side role. Every mutation (order
-- creation, payment verification, shipment updates, settlements) happens in a
-- trusted server route using the service-role client, which already bypasses
-- RLS — this keeps "never trust client-submitted totals/status" enforceable
-- at the data layer, not just in application code.
-- ============================================================================

create policy orders_select_customer_vendor_or_admin on public.orders
  for select using (
    customer_id = auth.uid() or public.vendor_has_order_item(id) or public.is_admin()
  );

create policy order_items_select_customer_vendor_or_admin on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
    or vendor_id = public.own_vendor_id()
    or public.is_admin()
  );

-- Customers never see raw payment records, only their order's status.
create policy payments_select_admin_only on public.payments
  for select using (public.is_admin());

create policy shipments_select_customer_vendor_or_admin on public.shipments
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
    or vendor_id = public.own_vendor_id()
    or public.is_admin()
  );

create policy coupon_redemptions_select_own_or_admin on public.coupon_redemptions
  for select using (user_id = auth.uid() or public.is_admin());

create policy vendor_settlements_select_own_or_admin on public.vendor_settlements
  for select using (vendor_id = public.own_vendor_id() or public.is_admin());

-- ============================================================================
-- Personal Gifting Diary — strictly owner-only. Deliberately NO admin bypass:
-- the feature spec explicitly promises admins see only an aggregate count of a
-- customer's diary entries, never their content, so is_admin() is intentionally
-- absent from every policy below (unlike the rest of this file).
-- ============================================================================

create policy diary_contacts_all_own on public.diary_contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy diary_events_all_own on public.diary_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy gift_history_all_own on public.gift_history
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- reviews — public read; authenticated write of one's own (verified-purchase
-- flag is server-derived, see set_review_verified_purchase above); vendor may
-- only add a response (enforced by enforce_review_update_scope above).
-- ============================================================================

create policy reviews_select_public on public.reviews
  for select using (true);

create policy reviews_insert_own on public.reviews
  for insert with check (user_id = auth.uid());

create policy reviews_update_own_or_product_vendor_or_admin on public.reviews
  for update using (user_id = auth.uid() or public.owns_product(product_id) or public.is_admin());

create policy reviews_delete_own_or_admin on public.reviews
  for delete using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- wishlists / notification_preferences — owner-only.
-- ============================================================================

create policy wishlists_all_own on public.wishlists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_preferences_all_own on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- notifications — owner can read and mark as read; created only by trusted
-- server code (service role), never inserted directly by a client.
-- ============================================================================

create policy notifications_select_own_or_admin on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());

create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- banners — public read of active banners; admin-managed.
-- ============================================================================

create policy banners_select_active_or_admin on public.banners
  for select using (is_active or public.is_admin());

create policy banners_write_admin_only on public.banners
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- loyalty_ledger — owner read-only; entries are written exclusively by
-- trusted server code (order completion, redemption, expiry jobs).
-- ============================================================================

create policy loyalty_ledger_select_own_or_admin on public.loyalty_ledger
  for select using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- audit_logs — admin read-only; written exclusively by trusted server code.
-- ============================================================================

create policy audit_logs_select_admin_only on public.audit_logs
  for select using (public.is_admin());
