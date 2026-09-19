-- Found by hand-testing Stage 4's product insert: `INSERT ... RETURNING` (what supabase-js's
-- .insert().select() sends) must also pass the SELECT policy on the new row. products' SELECT policy
-- used owns_product(id), a function that looks the product up by id in the table, and a function
-- can't see a row inserted by the very statement that's calling it, so a vendor creating their own
-- product got "new row violates row-level security policy" even though the INSERT itself was allowed.
-- Checking the row's own vendor_id column directly needs no lookup, so it works for RETURNING.
-- (vendors' SELECT policy already compared user_id directly, which is why that table never had this.)

drop policy products_select_public_or_own_or_admin on public.products;
create policy products_select_public_or_own_or_admin on public.products
  for select using (
    status = 'active' or public.is_vendor_owner(vendor_id) or public.is_admin()
  );
