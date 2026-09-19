-- ============================================================================
-- Stage 5 — cart hardening + guest-cart merge
--
-- 1. cart_items gets `variant_ids uuid[]`: a product can have several variant groups
--    (e.g. "Wrapping Style" + "Size") and the PDP lets a shopper pick one per group, which a single
--    `variant_id` column can't represent. `variant_id` is kept (FK, back-compat with order_items) and
--    is set to the first selected variant by the trigger below.
-- 2. A BEFORE INSERT/UPDATE trigger makes the DB — not the client — the authority on what a cart line
--    may reference: the product must be active, `vendor_id` is copied from the product (a customer
--    with a raw API key can't attribute a line to another vendor), variants must belong to the product,
--    be active, and be at most one per group. `unit_price_snapshot` stays display-only; checkout
--    (Stage 6) recomputes every price from the catalogue.
-- 3. Size/shape CHECKs so a cart row can't be used as free storage.
-- 4. merge_guest_cart(): atomic guest -> account merge, callable by the service role only.
-- ============================================================================

alter table public.cart_items
  add column variant_ids uuid[] not null default '{}';

alter table public.cart_items
  add constraint cart_items_quantity_max check (quantity <= 99),
  add constraint cart_items_variant_ids_max check (cardinality(variant_ids) <= 5),
  add constraint cart_items_personalization_size check (octet_length(personalization::text) <= 2000);

-- SECURITY INVOKER on purpose (see CLAUDE.md): it only reads catalogue tables the caller can already
-- see through RLS, and it must not mask current_user. A customer therefore can't add an inactive
-- product even by calling the API directly.
create or replace function public.cart_items_enforce_catalog()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_vendor uuid;
  v_invalid integer;
  v_groups integer;
begin
  select p.vendor_id into v_vendor
  from public.products p
  where p.id = new.product_id and p.status = 'active';

  if v_vendor is null then
    raise exception 'This product is not available.' using errcode = 'P0001';
  end if;
  new.vendor_id := v_vendor;

  if cardinality(new.variant_ids) > 0 then
    select count(*) into v_invalid
    from unnest(new.variant_ids) as vid
    where not exists (
      select 1 from public.product_variants pv
      where pv.id = vid and pv.product_id = new.product_id and pv.is_active
    );
    if v_invalid > 0 then
      raise exception 'That option is no longer available.' using errcode = 'P0001';
    end if;

    -- one option per group: selected variants must have distinct names
    select count(distinct pv.name) into v_groups
    from public.product_variants pv
    where pv.id = any (new.variant_ids);
    if v_groups <> cardinality(new.variant_ids) then
      raise exception 'Choose one option per group.' using errcode = 'P0001';
    end if;
  end if;

  new.variant_id := new.variant_ids[1];
  return new;
end;
$$;

-- Not on quantity-only updates: a shopper must still be able to lower the quantity of (or remove) a
-- line whose product has since been delisted.
create trigger cart_items_enforce_catalog
  before insert or update of product_id, variant_ids on public.cart_items
  for each row execute function public.cart_items_enforce_catalog();

-- ---------------------------------------------------------------------------
-- Guest -> account merge. One transaction; locks the guest cart so a double submit (two tabs, retry)
-- can't merge the same lines twice. Identical lines (same product, same variants, same personalisation)
-- add their quantities; others move over as-is. The guest cart is deleted afterwards.
-- ---------------------------------------------------------------------------
create or replace function public.merge_guest_cart(p_guest_token text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest uuid;
  v_user uuid;
  g record;
  v_match uuid;
begin
  select id into v_guest from public.cart where guest_token = p_guest_token for update;
  if v_guest is null then
    return;
  end if;

  insert into public.cart (user_id) values (p_user_id)
  on conflict (user_id) where user_id is not null do nothing;
  select id into v_user from public.cart where user_id = p_user_id for update;

  for g in select * from public.cart_items where cart_id = v_guest order by created_at loop
    v_match := null;
    select id into v_match
    from public.cart_items
    where cart_id = v_user
      and product_id = g.product_id
      and variant_ids = g.variant_ids
      and personalization = g.personalization
    limit 1;

    if v_match is not null then
      update public.cart_items
      set quantity = least(99, quantity + g.quantity), unit_price_snapshot = g.unit_price_snapshot
      where id = v_match;
    else
      update public.cart_items set cart_id = v_user where id = g.id;
    end if;
  end loop;

  delete from public.cart where id = v_guest;
end;
$$;

revoke all on function public.merge_guest_cart(text, uuid) from public, anon, authenticated;
grant execute on function public.merge_guest_cart(text, uuid) to service_role;

-- Abandoned guest carts are purged by the daily Vercel cron added in Stage 9 (guest carts older than
-- 30 days); the index keeps that scan cheap.
create index if not exists cart_guest_updated_idx on public.cart (updated_at) where guest_token is not null;
