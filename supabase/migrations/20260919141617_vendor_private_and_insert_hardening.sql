-- Two Stage 1 holes found by probing the live schema at the start of Stage 4 (both confirmed
-- with a real anon / authenticated session, not just by reading the SQL):
--
-- 1. RLS is row-level, not column-level. vendors_select_public_or_own_or_admin correctly lets
--    anyone read an *approved* vendor row (storefront pages need it) — but that meant PAN, GSTIN,
--    bank IFSC/account-holder name, warehouse address, Razorpay ids and the negotiated commission
--    rate were all publicly readable too. Sensitive fields move to vendor_private (owner+admin only).
-- 2. Stage 1's ownership triggers only guarded UPDATE. Nothing constrained INSERT, so any signed-in
--    customer could insert themselves as an already-'approved', featured, 0%-commission vendor and
--    an 'active' product with fake ratings, bypassing admin approval entirely. Insert policies now
--    require the pending/zeroed state, and the update triggers are widened to cover derived columns.

-- ---------------------------------------------------------------------------
-- vendor_private
-- ---------------------------------------------------------------------------

create table public.vendor_private (
  vendor_id uuid primary key references public.vendors(id) on delete cascade,
  legal_name text,
  gstin text,
  pan text,
  -- AES-256-GCM ciphertext (base64 of iv||tag||ciphertext), encrypted in the application layer
  -- (lib/security/encryption.ts) with a server-only key. The key never enters the database or its
  -- query logs, which pgcrypto's pgp_sym_encrypt(passphrase) would have required.
  bank_account_number_encrypted text,
  bank_account_last4 text,
  bank_ifsc text,
  bank_account_name text,
  razorpay_contact_id text,
  razorpay_fund_account_id text,
  warehouse_address jsonb,
  -- null = no vendor-specific override; falls through to category default, then platform default.
  commission_rate numeric(5, 2) check (commission_rate is null or commission_rate between 0 and 100),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_vendor_private_updated_at
  before update on public.vendor_private
  for each row execute function public.set_updated_at();

insert into public.vendor_private (
  vendor_id, gstin, pan, bank_ifsc, bank_account_name,
  razorpay_contact_id, razorpay_fund_account_id, warehouse_address, commission_rate, rejection_reason
)
select id, gstin, pan, bank_ifsc, bank_account_name,
       razorpay_contact_id, razorpay_fund_account_id, warehouse_address, commission_rate, rejection_reason
from public.vendors;

-- The guard function references NEW.commission_rate; replace it *before* dropping the column,
-- or every subsequent UPDATE on vendors would fail at runtime.
create or replace function public.prevent_vendor_admin_field_tampering()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() or public.is_service_role() then
    return new;
  end if;
  if new.status is distinct from old.status
    or new.is_featured is distinct from old.is_featured
    or new.approved_at is distinct from old.approved_at
    or new.suspended_at is distinct from old.suspended_at
    or new.average_rating is distinct from old.average_rating
    or new.review_count is distinct from old.review_count
    or new.total_sales is distinct from old.total_sales
    or new.user_id is distinct from old.user_id
  then
    raise exception 'Only an admin can change vendor status, featured flag, ratings, or ownership';
  end if;
  return new;
end;
$$;

alter table public.vendors
  drop column gstin,
  drop column pan,
  drop column bank_account_number_encrypted,
  drop column bank_ifsc,
  drop column bank_account_name,
  drop column razorpay_contact_id,
  drop column razorpay_fund_account_id,
  drop column warehouse_address,
  drop column commission_rate,
  drop column rejection_reason;

-- One vendor profile per user (the in-house vendor has user_id null and is unaffected).
create unique index vendors_user_id_unique on public.vendors(user_id) where user_id is not null;

-- ---------------------------------------------------------------------------
-- vendor_private RLS + admin-only-field guard
-- ---------------------------------------------------------------------------

alter table public.vendor_private enable row level security;

create policy vendor_private_select_own_or_admin on public.vendor_private
  for select using (public.is_vendor_owner(vendor_id) or public.is_admin());

create policy vendor_private_insert_own_or_admin on public.vendor_private
  for insert with check (public.is_vendor_owner(vendor_id) or public.is_admin());

create policy vendor_private_update_own_or_admin on public.vendor_private
  for update using (public.is_vendor_owner(vendor_id) or public.is_admin());

-- INVOKER on purpose (see the Stage 2 SECURITY DEFINER / current_user lesson in CLAUDE.md).
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
    then
      raise exception 'Commission, payout ids and rejection reason are set by an admin';
    end if;
  else
    if new.commission_rate is distinct from old.commission_rate
      or new.razorpay_contact_id is distinct from old.razorpay_contact_id
      or new.razorpay_fund_account_id is distinct from old.razorpay_fund_account_id
      or new.rejection_reason is distinct from old.rejection_reason
      or new.vendor_id is distinct from old.vendor_id
    then
      raise exception 'Commission, payout ids and rejection reason are set by an admin';
    end if;
  end if;
  return new;
end;
$$;

create trigger vendor_private_guard_admin_fields
  before insert or update on public.vendor_private
  for each row execute function public.guard_vendor_private_admin_fields();

-- ---------------------------------------------------------------------------
-- Insert-time hardening: vendors
-- ---------------------------------------------------------------------------

drop policy vendors_insert_own on public.vendors;
create policy vendors_insert_own_pending on public.vendors
  for insert with check (
    public.is_admin()
    or (
      user_id = auth.uid()
      and status = 'pending'
      and is_featured = false
      and approved_at is null
      and suspended_at is null
      and average_rating = 0
      and review_count = 0
      and total_sales = 0
    )
  );

-- ---------------------------------------------------------------------------
-- Insert-time hardening + widened update guard: products
-- ---------------------------------------------------------------------------

drop policy products_insert_own_vendor_or_admin on public.products;
create policy products_insert_own_pending on public.products
  for insert with check (
    public.is_admin()
    or (
      public.is_vendor_owner(vendor_id)
      and status = 'pending'
      and is_in_house = false
      and total_sold = 0
      and average_rating = 0
      and review_count = 0
      and view_count = 0
      and approved_at is null
      and rejection_reason is null
    )
  );

create or replace function public.enforce_product_status_transitions()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() or public.is_service_role() then
    return new;
  end if;
  if new.status is distinct from old.status and new.status not in ('pending', 'inactive') then
    raise exception 'Vendors may only set product status to pending or inactive; admin approval is required otherwise';
  end if;
  if new.is_in_house is distinct from old.is_in_house then
    raise exception 'Only an admin can change is_in_house';
  end if;
  if new.vendor_id is distinct from old.vendor_id then
    raise exception 'A product cannot be moved to another vendor';
  end if;
  if new.total_sold is distinct from old.total_sold
    or new.average_rating is distinct from old.average_rating
    or new.review_count is distinct from old.review_count
    or new.view_count is distinct from old.view_count
    or new.approved_at is distinct from old.approved_at
    or new.rejection_reason is distinct from old.rejection_reason
  then
    raise exception 'Sales, rating, view and approval fields are system-managed';
  end if;
  return new;
end;
$$;
