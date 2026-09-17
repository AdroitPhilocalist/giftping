-- ============================================================================
-- Personal Gifting Diary — the platform's signature differentiator.
-- ============================================================================

create table public.diary_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  relationship text,
  photo_url text,
  notes text,
  gift_preferences text,
  -- Free-form interest tags (e.g. 'coffee', 'books', 'travel') matched against
  -- products.tags/occasion_tags/recipient_tags by the suggestion engine (lib/diary).
  interests text[] not null default '{}',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diary_contacts_user_id_idx on public.diary_contacts(user_id);

create trigger set_diary_contacts_updated_at
  before update on public.diary_contacts
  for each row execute function public.set_updated_at();

create table public.diary_events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.diary_contacts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  event_type text not null,
  event_date date not null,
  is_recurring boolean not null default true,
  reminder_days_before integer not null default 7 check (reminder_days_before > 0),
  last_reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diary_events_contact_id_idx on public.diary_events(contact_id);
create index diary_events_user_id_idx on public.diary_events(user_id);
create index diary_events_event_date_idx on public.diary_events(event_date);

create trigger set_diary_events_updated_at
  before update on public.diary_events
  for each row execute function public.set_updated_at();

create table public.gift_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  contact_id uuid references public.diary_contacts(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  event_type text,
  notes text,
  gifted_at timestamptz not null default now()
);

create index gift_history_user_id_idx on public.gift_history(user_id);
create index gift_history_contact_id_idx on public.gift_history(contact_id);
