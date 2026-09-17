-- ============================================================================
-- Reviews & wishlists
-- ============================================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  images jsonb not null default '[]'::jsonb,
  is_verified_purchase boolean not null default true,
  vendor_response text,
  vendor_response_at timestamptz,
  helpful_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_product_id_idx on public.reviews(product_id);
create index reviews_user_id_idx on public.reviews(user_id);

create trigger set_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index wishlists_user_id_idx on public.wishlists(user_id);

-- ============================================================================
-- Notifications
-- ============================================================================

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null check (category in (
    'order_updates', 'diary_reminders', 'promotions', 'vendor_updates', 'wishlist_alerts'
  )),
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

create index notification_preferences_user_id_idx on public.notification_preferences(user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  link_url text,
  icon text,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index notifications_user_id_read_idx on public.notifications(user_id, is_read);

-- ============================================================================
-- Homepage/content management
-- ============================================================================

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  headline text,
  subheading text,
  cta_text text,
  cta_url text,
  target_audience text not null default 'all' check (target_audience in ('all', 'customer', 'vendor')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Loyalty / rewards ledger — backs the "GP Rewards" mentions in the approved
-- UI references (order confirmation screen: "You saved ₹800 with GP Rewards!").
-- ============================================================================

create table public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  points integer not null,
  balance_after integer not null,
  type text not null check (type in ('earned', 'redeemed', 'expired', 'adjusted')),
  description text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index loyalty_ledger_user_id_idx on public.loyalty_ledger(user_id);

-- ============================================================================
-- Admin audit log
-- ============================================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index audit_logs_actor_id_idx on public.audit_logs(actor_id);
