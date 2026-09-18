# Stage 3 — Catalog (Read-Only)

**Completed:** 2026-09-18

## What was built

- Homepage relocated into the `(shop)` route group and rewritten functionally (live categories,
  trending products, featured vendors, working search bar) — was a static Stage 0 placeholder before.
- Query helper layer: `lib/db/{categories,vendors,products,reviews,wishlists}.ts`, all RLS-respecting
  (no admin/service-role client used anywhere in this stage — everything here is genuinely public or
  owner-scoped data, so there was never a reason to bypass RLS).
- Full-text search wired end-to-end: `lib/search/index.ts` calls the Stage 1 `search_products()` RPC,
  then re-fetches the matched ids with the full vendor/category join every product card needs (the RPC
  returns bare rows) and restores the RPC's rank order afterward.
- Wishlist is fully functional, not a display stub: `lib/shop/wishlist-actions.ts` (a Server Action) +
  `WishlistButton` (optimistic, redirects to sign-in when logged out) + a real `/wishlist` page + a live
  count badge in the nav.
- 8 new pages: `/`, `/categories`, `/categories/[slug]`, `/vendors`, `/vendors/[slug]`, `/products/[slug]`,
  `/search`, `/wishlist`. The PDP has a working variant selector (price updates live with the selected
  variant's adjustment), a personalization form (recipient name/message/occasion — display only, nothing
  to submit to yet), and reviews. "Add to Cart"/"Buy Now" intentionally show a stub toast rather than
  faking functionality — cart doesn't exist until Stage 5.
- Seed data expanded from 1 vendor/4 products to 2 vendors/6 products, with variants, images, and
  reviews — needed to actually exercise vendor filtering/attribution, which a single-vendor catalog
  can't test at all.

## The imagery decision

Rather than ship every seed product with an obviously-fake placeholder, two products
(`luxe-memory-hamper`, `premium-gift-hamper`) use a real photo cropped with `sharp` out of the client's
own approved reference mockup (`ui-references/7b1ef5fb-...png` — the original "Luxe Memory Hamper" PDP
design). This is legitimate reuse: it's the client's own already-approved imagery, not stock photography
passed off as real. The other four products deliberately show `ProductImage`'s branded placeholder
(gradient + gift icon) instead — tried to crop three more from a mobile homepage screenshot, but the
source card images were only ~130×108px and the 6-7x upscale needed produced visibly blurry results not
worth shipping even as placeholders, so those stayed honest placeholders instead. `sharp` is now a real
(non-dev) dependency, since it'll run in production for the Stage 4+ vendor-photo resize pipeline too —
this session's crops were just its first use, not its only one.

## Three real bugs found by hand-testing in the browser (none caught by build/lint/types)

1. **A denormalized rollup column from Stage 1 had no trigger keeping it in sync.**
   `products.average_rating`/`review_count` existed but nothing recomputed them on a new review. Only
   surfaced because the seed script inserted 2 reviews and the PDP showed `0` / no stars until this was
   noticed and fixed with a proper rollup trigger (`recompute_product_rating()`, correctly
   `SECURITY DEFINER` since — unlike the four Stage 2 triggers — it never inspects `current_user`, so
   there's no masking risk, and it genuinely needs the elevated write access an ordinary reviewing
   customer doesn't have on `products`).
2. **RLS correctly blocked a legitimate display need**: showing "reviewed by Priya S." needs
   `reviews` → `users`, and `users_select_own_or_admin` correctly refuses that for a stranger browsing
   products. Fixed by denormalizing a privacy-safe `reviewer_display_name` onto `reviews` at insert time,
   not by loosening the users table's RLS (which would have been a real privacy regression to fix a
   display bug). This trigger is correctly `SECURITY INVOKER` — no elevated privilege needed, since the
   inserting user already has read access to their own row.
3. **A `proxy.ts` prefix-match routing bug**: `isVendorPath()` used
   `pathname.startsWith("/vendor")`, which also matches `/vendors/aurelia-gifts` — Stage 3's own new
   public storefront route. A signed-in customer clicking into a vendor's boutique page got silently
   redirected back to `/`, because proxy mistook the public storefront URL for the protected
   `/vendor/*` portal. Caught only by actually clicking into a vendor page as the test-customer account —
   build, lint, and type-check all passed with this bug present. Fixed to require an exact `/vendor`
   match or a `/vendor/` prefix (not a bare substring match), and re-verified all three affected routes
   (`/vendor/dashboard` still blocked, `/vendor/register` still public, `/vendors/aurelia-gifts` now
   reachable) after the fix.

## How to verify this stage

- `npm run build` and `npm run lint` — both clean.
- Browse `/`, click through to a category, apply a vendor/occasion filter, open a product, switch its
  variant (price should update live), toggle its wishlist heart (redirects to sign-in if logged out;
  persists and shows a nav badge count if logged in), search for "hamper" and confirm only the two hamper
  products come back, visit `/wishlist` and confirm the saved item is there.
- Sign in as `test-vendor@giftping.test` or `test-admin@giftping.test` and confirm `/vendors/aurelia-gifts`
  is still reachable (this is exactly the routing bug above — worth re-checking after any future change
  to `proxy.ts`'s path matchers).
- `npm run seed` twice in a row — still idempotent (now seeds 2 vendors, 6 products, 4 variants, 2 product
  images, 2 reviews; re-running should never change these counts).

## Deviations from the plan doc

None beyond what's already itemized in `CLAUDE.md` (the image pipeline decision made last session, now
actually exercised for the first time in this one). The homepage's relocation into `(shop)` was a minor
cleanup, not a deviation — the plan's own folder structure always documented it belonging there.
