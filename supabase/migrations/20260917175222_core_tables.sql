-- ============================================================================
-- Users
--
-- public.users.id references auth.users(id) directly (rather than minting its own uuid)
-- since we're using Supabase Auth directly as the identity provider — this keeps
-- auth.uid() usable as the join key everywhere and avoids a second identity concept.
-- A row is created automatically by the trigger below whenever a new auth.users row
-- appears (sign-up via email/password or Google OAuth both go through auth.users first).
-- ============================================================================

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  phone text,
  phone_verified boolean not null default false,
  avatar_url text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  role text not null default 'customer' check (role in ('customer', 'vendor', 'admin')),
  timezone text not null default 'Asia/Kolkata',
  marketing_opt_in boolean not null default true,
  referral_code text unique,
  referred_by uuid references public.users(id) on delete set null,
  onesignal_player_id text,
  last_login_at timestamptz,
  is_active boolean not null default true,
  -- DPDP-style account deletion: PII is scrubbed and anonymized_at is set, rather than a
  -- hard delete, so financial records (orders/payments) that reference this user survive
  -- for accounting/tax purposes. deleted_at marks user-initiated deactivation.
  deleted_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_role_idx on public.users(role);
create index users_referred_by_idx on public.users(referred_by);

create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================================
-- Addresses
-- ============================================================================

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  landmark text,
  city text not null,
  state text not null,
  pincode text not null,
  country text not null default 'India',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index addresses_user_id_idx on public.addresses(user_id);

create trigger set_addresses_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Vendors
-- ============================================================================

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  business_name text not null,
  slug text unique not null,
  business_type text,
  description text,
  short_description text,
  logo_url text,
  banner_url text,
  support_email text,
  support_phone text,
  social_links jsonb not null default '{}'::jsonb,
  year_established smallint,
  gstin text,
  pan text,
  -- Encrypted at rest via pgcrypto's pgp_sym_encrypt/pgp_sym_decrypt; the passphrase is a
  -- server-only secret supplied by the application layer, never stored in this database.
  bank_account_number_encrypted bytea,
  bank_ifsc text,
  bank_account_name text,
  razorpay_contact_id text,
  razorpay_fund_account_id text,
  warehouse_address jsonb,
  commission_rate numeric(5, 2) not null default 10.00,
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended', 'rejected')),
  rejection_reason text,
  is_featured boolean not null default false,
  average_rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  total_sales integer not null default 0,
  meta_title text,
  meta_description text,
  approved_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vendors_user_id_idx on public.vendors(user_id);
create index vendors_status_idx on public.vendors(status);

create trigger set_vendors_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Categories
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon_url text,
  banner_url text,
  theme_color text,
  parent_id uuid references public.categories(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_parent_id_idx on public.categories(parent_id);

create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Products
-- ============================================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  -- Always set, including in-house products — seeded as a real "GiftPing Originals" vendor
  -- row (is_in_house distinguishes it) so every product has consistent vendor attribution
  -- and joins never need to handle a null vendor_id.
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  category_id uuid references public.categories(id),
  name text not null,
  slug text unique not null,
  description text,
  short_description text,
  care_instructions text,
  base_price numeric(10, 2) not null,
  sale_price numeric(10, 2),
  gst_rate numeric(4, 2) not null default 18.00,
  hsn_code text,
  sku text unique,
  barcode text,
  weight_grams integer,
  dimensions jsonb,
  thumbnail_url text,
  video_url text,
  tags text[] not null default '{}',
  occasion_tags text[] not null default '{}',
  recipient_tags text[] not null default '{}',
  personalization_options jsonb not null default '[]'::jsonb,
  min_order_quantity integer not null default 1,
  max_order_quantity integer,
  stock_quantity integer not null default 0,
  is_in_house boolean not null default false,
  is_giftwrap_available boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'approved', 'active', 'inactive', 'rejected')),
  rejection_reason text,
  total_sold integer not null default 0,
  view_count integer not null default 0,
  average_rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  meta_title text,
  meta_description text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_vendor_id_idx on public.products(vendor_id);
create index products_category_id_idx on public.products(category_id);
create index products_status_idx on public.products(status);
create index products_occasion_tags_idx on public.products using gin(occasion_tags);
create index products_recipient_tags_idx on public.products using gin(recipient_tags);

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Dedicated table rather than a jsonb array, so images can be queried/reordered/tagged
-- with proper columns instead of being opaque blob contents.
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on public.product_images(product_id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  value text not null,
  price_adjustment numeric(10, 2) not null default 0,
  sku text,
  barcode text,
  image_url text,
  stock_quantity integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index product_variants_product_id_idx on public.product_variants(product_id);

create table public.product_qna (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  asked_by uuid references public.users(id) on delete set null,
  question text not null,
  answer text,
  answered_by uuid references public.users(id) on delete set null,
  answered_at timestamptz,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index product_qna_product_id_idx on public.product_qna(product_id);
