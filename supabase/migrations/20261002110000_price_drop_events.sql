-- Wishlist price-drop alerts: record every meaningful price drop so a daily job can tell the people who wishlisted it.
--
-- Why a database trigger rather than code in saveProductAction: prices change through more than one door (the vendor form,
-- an admin edit, any future import/API). A trigger sees all of them; app code only sees the one it was written into.
--
-- Why a QUEUE (this table) rather than notifying from the trigger: SQL can't send email/push, and a vendor changing 500
-- prices in one go must not do 500 rounds of notification work inside their save. The trigger only writes a row; the cron
-- (app/api/cron/diary-reminders → lib/wishlist/price-drop-job.ts) does the real work later, in batches.
--
-- The trigger fires while the product is still 'active', i.e. at the instant the vendor saves — but a vendor edit to a live
-- product then sends it back to admin review (sendBackToReviewIfLive), so shoppers can't see or buy the new price until an
-- admin re-approves it. The job therefore leaves an event waiting until the product is live again (and expires it after 14
-- days) instead of announcing a price nobody can get yet.
--
-- "Effective price" = the cheaper of sale_price and base_price (the vendor form requires sale < base, but the database does not
-- enforce that, so the trigger doesn't trust it). "Meaningful" = at least a 5% drop; the job applies the same 5% to the NET
-- change across any events that piled up, so a drop that was later reversed sends nothing. lib/wishlist/price-drops.ts has
-- the same constant — keep them in step.

create table public.price_drop_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  old_price numeric(12, 2) not null,
  new_price numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index price_drop_events_pending_idx on public.price_drop_events (created_at) where processed_at is null;

-- Server-only: RLS on with NO policies, and no table privileges for the client roles at all (the Stage 1 default-privileges
-- migration would otherwise hand them out). Only the service role (the cron) touches it.
alter table public.price_drop_events enable row level security;
revoke all on table public.price_drop_events from anon, authenticated;

-- SECURITY DEFINER because the vendor whose save fires it has no INSERT right on the queue. It never reads current_user /
-- session_user, so the masking pitfall documented in CLAUDE.md (Stage 1, bug 2) doesn't apply. search_path is pinned.
create or replace function public.record_price_drop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_eff numeric := least(coalesce(old.sale_price, old.base_price), old.base_price);
  new_eff numeric := least(coalesce(new.sale_price, new.base_price), new.base_price);
begin
  if new.status = 'active'
     and new_eff < old_eff
     and (old_eff - new_eff) >= old_eff * 0.05 then
    insert into public.price_drop_events (product_id, old_price, new_price) values (new.id, old_eff, new_eff);
  end if;
  return new;
end;
$$;

revoke all on function public.record_price_drop() from public, anon, authenticated;

create trigger products_record_price_drop
  after update of base_price, sale_price on public.products
  for each row
  when (old.base_price is distinct from new.base_price or old.sale_price is distinct from new.sale_price)
  execute function public.record_price_drop();
