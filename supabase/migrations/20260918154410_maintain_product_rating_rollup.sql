-- Gap found while building Stage 3: products.average_rating/review_count are denormalized
-- columns (for cheap reads on catalog/PDP pages) but nothing kept them in sync with the
-- reviews table — every review insert/update/delete needs to recompute them, the same rollup
-- pattern already used for orders.status via shipments.
--
-- SECURITY DEFINER here is correct and intentional (unlike the four Stage 2 triggers that had
-- to be switched to INVOKER): this function doesn't inspect current_user/session_user to make
-- a trust decision, so there's no masking bug risk. It genuinely needs the owner's elevated
-- privilege, because an ordinary customer leaving a review has no UPDATE grant on products
-- under products_update_own_or_admin (only the product's own vendor or admin does) — without
-- SECURITY DEFINER this trigger would fail with a permission error on every customer review.

create or replace function public.recompute_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid := coalesce(new.product_id, old.product_id);
  v_avg numeric(3, 2);
  v_count integer;
begin
  select coalesce(round(avg(rating), 2), 0), count(*)
  into v_avg, v_count
  from public.reviews
  where product_id = v_product_id;

  update public.products
  set average_rating = v_avg, review_count = v_count
  where id = v_product_id;

  return coalesce(new, old);
end;
$$;

create trigger reviews_recompute_product_rating
  after insert or update of rating or delete on public.reviews
  for each row execute function public.recompute_product_rating();
