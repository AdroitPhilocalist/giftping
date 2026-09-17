-- ============================================================================
-- Cart (absent from the original SRS schema; required by the persistent
-- multi-vendor cart feature)
-- ============================================================================

create table public.cart (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  guest_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_owner_check check (
    (user_id is not null and guest_token is null) or (user_id is null and guest_token is not null)
  )
);

create unique index cart_user_id_unique on public.cart(user_id) where user_id is not null;
create unique index cart_guest_token_unique on public.cart(guest_token) where guest_token is not null;

create trigger set_cart_updated_at
  before update on public.cart
  for each row execute function public.set_updated_at();

-- Deliberately no uniqueness constraint on (cart_id, product_id, variant_id): two line items
-- for the same product/variant can legitimately differ by personalization (different
-- recipient name/message), so "merge vs. add new row" is an application-layer decision made
-- in lib/commerce/cart.ts, not something the schema can determine on its own.
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.cart(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  vendor_id uuid not null references public.vendors(id),
  quantity integer not null check (quantity > 0),
  personalization jsonb not null default '{}'::jsonb,
  unit_price_snapshot numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cart_items_cart_id_idx on public.cart_items(cart_id);
create index cart_items_product_id_idx on public.cart_items(product_id);

create trigger set_cart_items_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Coupons
-- ============================================================================

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10, 2) not null,
  min_order_amount numeric(10, 2) not null default 0,
  max_discount_amount numeric(10, 2),
  usage_limit integer,
  per_user_limit integer not null default 1,
  used_count integer not null default 0,
  vendor_id uuid references public.vendors(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coupons_vendor_id_idx on public.coupons(vendor_id);

create trigger set_coupons_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Orders
-- ============================================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid not null references public.users(id),
  delivery_address jsonb not null,
  gift_message text,
  gift_wrap_selected boolean not null default false,
  gift_wrap_charge numeric(10, 2) not null default 0,
  subtotal numeric(10, 2) not null,
  discount_amount numeric(10, 2) not null default 0,
  delivery_charge numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) not null,
  coupon_id uuid references public.coupons(id) on delete set null,
  coupon_code text,
  notes text,
  -- Coarse rollup recomputed by recompute_order_status() (below, fired from shipments)
  -- rather than hand-set from many call sites — a multi-vendor order ships independently
  -- per vendor, so a single flat status has to be derived, not directly assigned.
  status text not null default 'created' check (status in (
    'created', 'payment_initiated', 'payment_verified', 'confirmed',
    'processing', 'partially_shipped', 'shipped', 'partially_delivered',
    'delivered', 'cancelled', 'refunded'
  )),
  razorpay_order_id text,
  placed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders(customer_id);
create index orders_status_idx on public.orders(status);

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  vendor_id uuid not null references public.vendors(id),
  variant_id uuid references public.product_variants(id),
  product_name text not null,
  product_image text,
  variant_label text,
  personalization jsonb not null default '{}'::jsonb,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null,
  total_price numeric(10, 2) not null,
  commission_rate numeric(5, 2),
  commission_amount numeric(10, 2),
  vendor_payout numeric(10, 2),
  fulfilment_status text not null default 'pending' check (fulfilment_status in (
    'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned'
  )),
  returned_quantity integer not null default 0,
  refunded_amount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_vendor_id_idx on public.order_items(vendor_id);

-- ============================================================================
-- Payments
-- ============================================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  razorpay_signature text,
  amount numeric(10, 2) not null,
  currency text not null default 'INR',
  status text not null default 'pending' check (status in ('pending', 'processing', 'captured', 'failed', 'refunded')),
  payment_method text,
  failure_reason text,
  captured_at timestamptz,
  created_at timestamptz not null default now()
);

create index payments_order_id_idx on public.payments(order_id);

-- ============================================================================
-- Shipments — one row per vendor per order, since a multi-vendor order is
-- fulfilled/shipped independently by each vendor.
-- ============================================================================

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id),
  shiprocket_order_id text,
  awb_number text,
  courier_name text,
  tracking_url text,
  status text not null default 'pending' check (status in (
    'pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery',
    'delivered', 'rto_initiated', 'cancelled'
  )),
  is_return boolean not null default false,
  return_awb_number text,
  estimated_delivery date,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shipments_order_id_idx on public.shipments(order_id);
create index shipments_vendor_id_idx on public.shipments(vendor_id);

create trigger set_shipments_updated_at
  before update on public.shipments
  for each row execute function public.set_updated_at();

-- Recomputes the coarse orders.status rollup from this order's non-return shipment
-- statuses. Skips orders already in a terminal cancelled/refunded state.
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
  select array_agg(status) into v_statuses
  from public.shipments
  where order_id = v_order_id and is_return = false;

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
  where id = v_order_id and status not in ('cancelled', 'refunded');

  return coalesce(new, old);
end;
$$;

create trigger shipments_recompute_order_status
  after insert or update of status on public.shipments
  for each row execute function public.recompute_order_status();

-- ============================================================================
-- Coupon redemptions — tracks per-user usage so per_user_limit is enforceable
-- (the SRS's flat used_count alone can't express a per-user cap).
-- ============================================================================

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  discount_amount numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index coupon_redemptions_coupon_id_idx on public.coupon_redemptions(coupon_id);
create index coupon_redemptions_user_id_idx on public.coupon_redemptions(user_id);

-- ============================================================================
-- Vendor settlements
-- ============================================================================

create table public.vendor_settlements (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  amount numeric(10, 2) not null,
  settlement_period_start date,
  settlement_period_end date,
  razorpay_transfer_id text,
  invoice_url text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'settled', 'failed')),
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index vendor_settlements_vendor_id_idx on public.vendor_settlements(vendor_id);
