-- products.personalization_options (jsonb, default '[]') has existed since the first migration but nothing used it. It now holds a product's "live engraving"
-- setup (lib/personalization/engraving.ts): where on the photo the shopper's text appears, its style, label and length limit.
--
-- It is vendor-editable and rendered on the public product page, so its SHAPE is bounded in the database (not just in the form): it must be a JSON array, with
-- at most five entries, and small. The app also parses it defensively on every read (clamps numbers, ignores unknown shapes), so this is the backstop for
-- a direct API write — the same "constrain it where it's stored" rule used for the other vendor-supplied columns that end up on a public page.
-- Every existing row is '[]', so adding the constraint cannot fail.

alter table public.products
  add constraint products_personalization_options_shape
  check (
    jsonb_typeof(personalization_options) = 'array'
    and jsonb_array_length(personalization_options) <= 5
    and octet_length(personalization_options::text) <= 2000
  );
