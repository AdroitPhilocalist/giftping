-- ============================================================================
-- Review management — one review per customer per product
--
-- Nothing before this stopped a customer submitting unlimited reviews for the same product, which would
-- also silently skew products.average_rating (recompute_product_rating() counts every row). "Edit your
-- review" is meaningless without this: a customer submitting a review a second time should update their
-- existing one, not create a duplicate. lib/shop/review-actions.ts relies on this constraint to upsert
-- (`on conflict (product_id, user_id)`).
--
-- One pre-existing duplicate pair was found in the dev database's demo data (a seeded shopper reviewed the
-- same product twice) — this would make the ADD CONSTRAINT below fail outright on this environment, and
-- could on any other. Clean up first, keeping only the most recent review of a duplicate pair, so this
-- migration is safe to run wherever a stray duplicate like this exists, not just here.
-- ============================================================================
delete from public.reviews r
where r.id in (
  select id from (
    select id, row_number() over (partition by product_id, user_id order by created_at desc, id desc) as rn
    from public.reviews
  ) ranked
  where ranked.rn > 1
);

alter table public.reviews
  add constraint reviews_product_user_unique unique (product_id, user_id);
