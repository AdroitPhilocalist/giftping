-- Product-type taxonomy + category-specific attributes — a new axis, parallel to `categories`.
--
-- `categories` is the OCCASION/world axis (Birthday, Wedding, For Her...) and stays exactly as it is — this
-- does not touch it. A product needs BOTH an occasion AND a product-type at once (a wedding gift is also a
-- piece of jewellery), which a single FK can't express, so this is a second, independent tree rather than a
-- rebuild of `categories` (whose own `parent_id` self-reference, added Stage 1, was never wired into any
-- query/validation/admin-UI — confirmed before writing this — and stays unused; repurposing it would still
-- only give one axis, not two).
--
-- Three new tables:
--   product_types             — the tree itself (Jewellery > Necklaces, ...), same parent_id/index shape
--                                categories already has.
--   product_attributes        — what facets exist for a type (Cakes -> Flavor, Plants -> Placement),
--                                admin-defined, inherited down the tree in application code (a product's
--                                effective attributes = its own type's + every ancestor's).
--   product_attribute_values  — the actual value(s) a specific product has for its applicable attributes.
--                                One row per selected value (not a delimited string), so multi-select falls
--                                out for free without a second code path.
--
-- Deliberately NOT reusing product_variants for this: variants are purchasable (price/stock impact, create
-- distinct SKUs — Size, Color); attributes here are descriptive/filterable only. Conflating them would force
-- every filterable value to carry a price/stock row it doesn't need.

-- ============================================================================
-- product_types
-- ============================================================================
create table public.product_types (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.product_types(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text,
  icon_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_types_parent_id_idx on public.product_types(parent_id);
create trigger set_product_types_updated_at before update on public.product_types for each row execute function public.set_updated_at();

alter table public.products add column product_type_id uuid references public.product_types(id) on delete set null;
create index products_product_type_id_idx on public.products(product_type_id);

-- ============================================================================
-- product_attributes — admin-defined facets per type
-- ============================================================================
create table public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  product_type_id uuid not null references public.product_types(id) on delete cascade,
  key text not null,
  label text not null,
  input_type text not null default 'select' check (input_type in ('select', 'multi_select')),
  options text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_attributes_key_format check (key ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  -- array_length() of an empty array is NULL, not 0, and a NULL CHECK result is treated as a pass — coalesce first
  -- (same trap hit and fixed in 20261011220000_search_synonyms_and_fuzzy.sql)
  constraint product_attributes_options_present check (coalesce(array_length(options, 1), 0) >= 1),
  unique (product_type_id, key)
);

create index product_attributes_product_type_id_idx on public.product_attributes(product_type_id);
create trigger set_product_attributes_updated_at before update on public.product_attributes for each row execute function public.set_updated_at();

-- ============================================================================
-- product_attribute_values — what a specific product actually has
-- ============================================================================
create table public.product_attribute_values (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  attribute_id uuid not null references public.product_attributes(id) on delete cascade,
  value text not null,
  created_at timestamptz not null default now(),
  unique (product_id, attribute_id, value)
);

create index product_attribute_values_product_id_idx on public.product_attribute_values(product_id);
create index product_attribute_values_attribute_id_idx on public.product_attribute_values(attribute_id);

-- ============================================================================
-- RLS — same shape as categories (public read of active rows, admin-only write) for the two definition
-- tables, and the same owns_product()-based vendor-write pattern product_images/product_variants already
-- use for the per-product values table.
-- ============================================================================
alter table public.product_types enable row level security;
alter table public.product_attributes enable row level security;
alter table public.product_attribute_values enable row level security;

create policy product_types_select_active_or_admin on public.product_types
  for select using (is_active or public.is_admin());

create policy product_types_write_admin_only on public.product_types
  for all using (public.is_admin()) with check (public.is_admin());

create policy product_attributes_select_active_or_admin on public.product_attributes
  for select using (is_active or public.is_admin());

create policy product_attributes_write_admin_only on public.product_attributes
  for all using (public.is_admin()) with check (public.is_admin());

create policy product_attribute_values_select_public_or_own_or_admin on public.product_attribute_values
  for select using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
    or public.owns_product(product_id)
    or public.is_admin()
  );

create policy product_attribute_values_write_own_or_admin on public.product_attribute_values
  for all using (public.owns_product(product_id) or public.is_admin())
  with check (public.owns_product(product_id) or public.is_admin());
