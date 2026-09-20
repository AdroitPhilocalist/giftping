-- ============================================================================
-- Stage 9 — Personal Gifting Diary: reminders, integrity, limits; plus the cron's cleanup functions.
--
--  1. Richer diary columns (custom event title, notes, several reminder lead times, pause switch; manual gifts on gift_history)
--  2. INTEGRITY: an event/gift may only reference a contact (and order) that belongs to the SAME user.
--     The original policies only checked `user_id = auth.uid()`, so a user could attach their event to someone else's contact_id
--     — the cron would then put that stranger's contact name in the attacker's reminder email. The trigger below closes it.
--  3. Abuse limits (contacts per user, events per contact, interests, reminder lead times)
--  4. diary_reminder_log — the exactly-once ledger for reminders (one row per event + occurrence + lead time + channel)
--  5. cancel_stale_unpaid_orders() and purge_stale_guest_carts() — housekeeping the daily Vercel cron runs
--
-- Diary tables still have NO admin bypass (privacy promise): is_admin() appears in none of these policies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. columns
-- ---------------------------------------------------------------------------
alter table public.diary_events
  add column title text,
  add column notes text,
  add column reminder_days integer[] not null default '{7,3}',
  add column is_active boolean not null default true,
  add constraint diary_events_title_length check (title is null or char_length(title) <= 80),
  add constraint diary_events_notes_length check (notes is null or char_length(notes) <= 500),
  add constraint diary_events_type_length check (char_length(event_type) between 1 and 40),
  add constraint diary_events_reminder_days_count check (cardinality(reminder_days) between 0 and 4);

alter table public.diary_contacts
  add column budget_max numeric(10, 2),
  add constraint diary_contacts_name_length check (char_length(name) between 1 and 100),
  add constraint diary_contacts_interests_count check (cardinality(interests) <= 15),
  add constraint diary_contacts_notes_length check (notes is null or char_length(notes) <= 1000),
  add constraint diary_contacts_prefs_length check (gift_preferences is null or char_length(gift_preferences) <= 500),
  add constraint diary_contacts_budget_range check (budget_max is null or (budget_max > 0 and budget_max <= 10000000));

-- gifts bought elsewhere can be logged too; product_id lets suggestions avoid repeating a gift
alter table public.gift_history
  add column gift_name text,
  add column product_id uuid references public.products(id) on delete set null,
  add column amount numeric(10, 2),
  add constraint gift_history_name_length check (gift_name is null or char_length(gift_name) <= 120);

-- ---------------------------------------------------------------------------
-- 2 + 3. integrity and limits. SECURITY INVOKER on purpose: the lookups below run under the caller's own RLS, so a contact
-- or order that isn't theirs is simply invisible to them — which is exactly the failure we want.
-- ---------------------------------------------------------------------------
create or replace function public.diary_contacts_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and (select count(*) from public.diary_contacts where user_id = new.user_id) >= 200 then
    raise exception 'You can keep up to 200 people in your diary.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger diary_contacts_guard before insert on public.diary_contacts
  for each row execute function public.diary_contacts_guard();

create or replace function public.diary_events_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  d integer;
begin
  if not exists (select 1 from public.diary_contacts c where c.id = new.contact_id and c.user_id = new.user_id) then
    raise exception 'That person isn''t in your diary.' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.diary_events where contact_id = new.contact_id) >= 20 then
    raise exception 'That person already has 20 saved dates.' using errcode = 'P0001';
  end if;
  foreach d in array new.reminder_days loop
    if d < 1 or d > 60 then
      raise exception 'Reminders can be 1 to 60 days before.' using errcode = 'P0001';
    end if;
  end loop;
  return new;
end;
$$;
create trigger diary_events_guard before insert or update on public.diary_events
  for each row execute function public.diary_events_guard();

create or replace function public.gift_history_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.contact_id is not null and not exists (
    select 1 from public.diary_contacts c where c.id = new.contact_id and c.user_id = new.user_id
  ) then
    raise exception 'That person isn''t in your diary.' using errcode = 'P0001';
  end if;
  if new.order_id is not null and not exists (
    select 1 from public.orders o where o.id = new.order_id and o.customer_id = new.user_id
  ) then
    raise exception 'That order isn''t yours.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger gift_history_guard before insert or update on public.gift_history
  for each row execute function public.gift_history_guard();

-- ---------------------------------------------------------------------------
-- 4. the exactly-once reminder ledger. A reminder for (event, this occurrence, N days before, channel) can exist once.
--    The cron CLAIMS a row before sending, so two overlapping runs (or a manual re-run) can never double-send.
-- ---------------------------------------------------------------------------
create table public.diary_reminder_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.diary_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  occurrence_date date not null,
  days_before integer not null,
  channel text not null check (channel in ('in_app', 'email', 'push')),
  sent_at timestamptz not null default now(),
  unique (event_id, occurrence_date, days_before, channel)
);
create index diary_reminder_log_user_idx on public.diary_reminder_log (user_id, sent_at desc);

alter table public.diary_reminder_log enable row level security;
-- owner may read their own history; nobody but the service role writes. No admin bypass.
create policy diary_reminder_log_select_own on public.diary_reminder_log
  for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. housekeeping for the daily cron (service_role only)
-- ---------------------------------------------------------------------------
-- An unpaid order nobody came back to holds a coupon use forever. Cancel it and release the coupon. A payment that lands on it
-- later is refunded automatically by confirm_order_payment (order is 'cancelled'), so this is safe even if a shopper pays late.
create or replace function public.cancel_stale_unpaid_orders(p_hours integer default 48)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  n integer := 0;
begin
  for o in
    select id from public.orders
    where status in ('created', 'payment_initiated')
      and created_at < now() - make_interval(hours => p_hours)
      and not exists (select 1 from public.payments p where p.order_id = orders.id and p.status in ('captured', 'processing'))
    for update skip locked
  loop
    perform public.release_order_coupon(o.id);
    update public.payments set status = 'failed', failure_reason = 'Order expired unpaid'
      where order_id = o.id and status = 'pending';
    update public.orders set status = 'cancelled' where id = o.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.cancel_stale_unpaid_orders(integer) from public, anon, authenticated;
grant execute on function public.cancel_stale_unpaid_orders(integer) to service_role;

create or replace function public.purge_stale_guest_carts(p_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.cart where guest_token is not null and updated_at < now() - make_interval(days => p_days);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.purge_stale_guest_carts(integer) from public, anon, authenticated;
grant execute on function public.purge_stale_guest_carts(integer) to service_role;
