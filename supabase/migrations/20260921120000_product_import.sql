-- ============================================================================
-- Stage 11 — bulk CSV product upload
--
--  * import_vendor_products(): creates every product (and its variants) from one file in a SINGLE transaction — all or nothing, so a failure halfway never
--    leaves half a catalogue behind. Products arrive as `inactive` DRAFTS (a CSV can't carry photos; the vendor adds them and then sends each for review).
--    service_role only: the TS layer has already validated every row and proved the caller owns an approved boutique.
--  * product_imports: one row per successful import, unique on (vendor, hash of the file). Uploading the SAME file twice — a double-click, a retry after a
--    slow response, a forgotten first attempt — is refused instead of silently duplicating the catalogue.
--  * A ceiling on products per vendor (platform_settings.max_products_per_vendor), so one account can't flood the catalogue.
-- ============================================================================
create table public.product_imports (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  file_hash text not null check (char_length(file_hash) = 64),
  product_count integer not null check (product_count > 0),
  created_at timestamptz not null default now(),
  unique (vendor_id, file_hash)
);
create index product_imports_vendor_idx on public.product_imports (vendor_id, created_at desc);

alter table public.product_imports enable row level security;
create policy product_imports_select_own_or_admin on public.product_imports
  for select using (vendor_id = public.own_vendor_id() or public.is_admin());
revoke insert, update, delete on public.product_imports from anon, authenticated;
revoke all on public.product_imports from anon;

insert into public.platform_settings (key, value, description) values
  ('max_products_per_vendor', '2000'::jsonb, 'Most products one boutique may have (all statuses)')
on conflict (key) do nothing;

create or replace function public.import_vendor_products(p_vendor_id uuid, p_file_hash text, p_products jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e jsonb;
  v jsonb;
  v_id uuid;
  v_count integer;
  v_limit integer;
  v_existing integer;
  v_inserted uuid;
begin
  perform 1 from public.vendors where id = p_vendor_id and status = 'approved' for update;   -- also serialises concurrent imports by the same boutique
  if not found then
    return jsonb_build_object('result', 'vendor_not_approved');
  end if;
  if jsonb_typeof(p_products) <> 'array' or jsonb_array_length(p_products) not between 1 and 200 then
    return jsonb_build_object('result', 'bad_size');
  end if;
  v_count := jsonb_array_length(p_products);

  select coalesce((select (value #>> '{}')::integer from public.platform_settings where key = 'max_products_per_vendor'), 2000) into v_limit;
  select count(*) into v_existing from public.products where vendor_id = p_vendor_id;
  if v_existing + v_count > v_limit then
    return jsonb_build_object('result', 'product_limit', 'limit', v_limit, 'existing', v_existing);
  end if;

  insert into public.product_imports (vendor_id, file_hash, product_count)
  values (p_vendor_id, p_file_hash, v_count)
  on conflict (vendor_id, file_hash) do nothing
  returning id into v_inserted;
  if v_inserted is null then
    return jsonb_build_object('result', 'already_imported');
  end if;

  for e in select * from jsonb_array_elements(p_products) loop
    begin
      insert into public.products (
        vendor_id, category_id, name, slug, short_description, description, base_price, sale_price, sku, stock_quantity, weight_grams,
        gst_rate, hsn_code, tags, occasion_tags, recipient_tags, status, is_in_house
      ) values (
        p_vendor_id, (e->>'category_id')::uuid, e->>'name', e->>'slug', nullif(e->>'short_description', ''), nullif(e->>'description', ''),
        (e->>'base_price')::numeric, (e->>'sale_price')::numeric, nullif(e->>'sku', ''), (e->>'stock_quantity')::integer, (e->>'weight_grams')::integer,
        (e->>'gst_rate')::numeric, nullif(e->>'hsn_code', ''),
        array(select jsonb_array_elements_text(coalesce(e->'tags', '[]'::jsonb))),
        array(select jsonb_array_elements_text(coalesce(e->'occasion_tags', '[]'::jsonb))),
        array(select jsonb_array_elements_text(coalesce(e->'recipient_tags', '[]'::jsonb))),
        'inactive', false
      ) returning id into v_id;
    exception when unique_violation then
      -- rolls back the whole call (every earlier product and the ledger row included); the caller reports which SKU clashed
      raise exception 'SKU_TAKEN:%', coalesce(e->>'sku', e->>'slug');
    end;

    for v in select * from jsonb_array_elements(coalesce(e->'variants', '[]'::jsonb)) loop
      insert into public.product_variants (product_id, name, value, price_adjustment, stock_quantity, is_active)
      values (v_id, v->>'name', v->>'value', coalesce((v->>'price_adjustment')::numeric, 0), coalesce((v->>'stock_quantity')::integer, 0), true);
    end loop;
  end loop;

  return jsonb_build_object('result', 'imported', 'count', v_count);
end;
$$;

revoke all on function public.import_vendor_products(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.import_vendor_products(uuid, text, jsonb) to service_role;
