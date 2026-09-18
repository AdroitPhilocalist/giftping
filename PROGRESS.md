# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

**Stage 3 — Catalog (read-only)** ✅ complete. Next session should start Stage 4 (Vendor Portal).

## Last Session Summary

- **Homepage moved into the `(shop)` route group** (`app/page.tsx` → `app/(shop)/page.tsx`) for
  consistency with `CLAUDE.md`'s documented structure, and rewritten functionally: live categories,
  trending products, featured vendors, a working search bar.
- **Query helper layer built**: `lib/db/{categories,vendors,products,reviews,wishlists}.ts` — all
  server-only, all respect RLS (no service-role bypass for anything customer-facing). `lib/db/products.ts`
  has the main `listProducts()` filter/sort/paginate function and `getProductBySlug()` with
  vendor/category/images/variants joined. `lib/db/vendors.ts` has `getVendorsForCategory()` so a category
  page's vendor filter only ever shows vendors that actually have products there.
- **Full-text search wired**: `lib/search/index.ts` wraps the Stage 1 `search_products()` RPC, re-joining
  ranked results against the same product-card shape everything else uses (the RPC itself returns raw
  unjoined rows) and restoring rank order after the join (`.in()` doesn't preserve it).
- **Wishlist fully functional**, not just displayed: `lib/shop/wishlist-actions.ts`
  (`toggleWishlistAction`, a Server Action) + `components/shop/WishlistButton.tsx` (optimistic UI,
  redirects to sign-in if logged out) + `/wishlist` page. Verified end-to-end in-browser: toggle on PDP,
  nav badge count updates, persists across pages, shows correctly on `/wishlist`.
- **Pages built**: `/` (rewritten), `/categories`, `/categories/[slug]` (filters: vendor/occasion/
  recipient/in-stock/sort, pagination), `/vendors`, `/vendors/[slug]` (storefront), `/products/[slug]`
  (gallery, variant selector with live price adjustment, personalization form, reviews, related products),
  `/search`, `/wishlist`. Cart/checkout don't exist yet (Stage 5), so "Add to Cart"/"Buy Now" show a
  stub toast rather than pretending to work.
- **Reused the client's own approved reference imagery as real seed product photography** instead of
  gray placeholder boxes: cropped a clean hamper photo out of `ui-references/7b1ef5fb-...png` (the
  original "Luxe Memory Hamper" PDP mockup) with `sharp`, saved to `public/seed-images/hamper.webp`, used
  for 2 of 6 seed products. The other 4 deliberately have no photo — `components/shop/ProductImage.tsx`
  renders a clean branded gradient+icon placeholder instead of a fake stock photo, which is the honest
  state until Stage 4 lets vendors upload real ones. (Tried cropping 3 more products out of a lower-res
  mobile screenshot; the source resolution was too low to upscale cleanly, so left those as placeholders
  rather than ship blurry fake product photos.)
- **Seed script expanded**: `scripts/seed.ts` now seeds a second vendor (Aurelia Gifts, partner/10%
  commission, vs. GiftPing Originals in-house/0%) with its own products — needed to actually exercise
  vendor attribution and the vendor filter, which a single-vendor catalog can't test. Also seeds product
  variants (wrapping styles with a price adjustment on one), and 2 reviews (linked to the Stage 2
  `test-customer` account, skipped gracefully if that account doesn't exist). Re-verified idempotent.
- **Two real schema gaps found and fixed while building this** (both via new migrations, both
  re-verified after, both documented in full in `CLAUDE.md` — don't re-derive here):
  1. `products.average_rating`/`review_count` were denormalized columns from Stage 1 with nothing
     keeping them in sync — added `recompute_product_rating()`, a trigger on `reviews` insert/update/
     delete, correctly `SECURITY DEFINER` this time (unlike the four Stage 2 triggers) since it doesn't
     inspect `current_user` — it just needs the elevated write access an ordinary reviewing customer
     doesn't have on `products`.
  2. Reviews had no way to show a reviewer name — joining to `public.users` for it would be blocked by
     that table's own RLS for anyone browsing who isn't the reviewer or an admin. Added
     `reviews.reviewer_display_name` (privacy-safe "First L." format), set by a `BEFORE INSERT` trigger
     (not `SECURITY DEFINER` — the inserting user always has read access to their own `users` row
     already), plus a one-time backfill for the 2 existing seed reviews.
- **One real routing bug found and fixed while hand-testing in the browser** (not caught by build/lint):
  `proxy.ts`'s vendor-portal check used `pathname.startsWith("/vendor")`, which also matches
  `/vendors/aurelia-gifts` (the public shop storefront route) — a signed-in customer got silently bounced
  from a vendor storefront page back to `/`, because proxy thought they were trying to reach the
  vendor-portal-only `/vendor/*`. Fixed to `pathname === "/vendor" || pathname.startsWith("/vendor/")`.
  Re-verified all three cases after the fix: `/vendor/dashboard` still correctly blocked for a customer,
  `/vendor/register` still correctly public, `/vendors/aurelia-gifts` now correctly reachable.
- `sharp` installed as a real (not dev) dependency — it'll run in production for the Stage 4+ image
  resize pipeline, not just this session's one-off seed-image cropping.
- `npm run build` and `npm run lint` both clean (fixed 2 real lint errors — raw `<a>` tags instead of
  `next/link` on the category/vendor breadcrumbs — and 2 unused-variable warnings along the way).

## Next Up

Start **Stage 4 — Vendor Portal (core)**: vendor sign-up/onboarding (business info, bank details —
encrypted via pgcrypto per the Stage 1 schema comment), an admin-approval gate (a bare route is enough for
now, full UI is Stage 11), product CRUD + variants (reuse the `product_variants` patterns already proven
in Stage 3's seed/display code), and the image upload pipeline: Supabase Storage bucket + `sharp`-resized
fixed sizes (this is where `lib/storage/{upload,resize}.ts` actually gets built — Stage 3 only consumed
`thumbnail_url`/`product_images` values, it never needed to write them). No Remove.bg, per the cost
constraint. "Done when": a vendor can sign up, get admin-approved, add a product with a photo, and see it
appear correctly attributed in Stage 3's catalog pages (which are already fully built and will just work
once real vendor-submitted rows exist with `status = 'active'`).

## Open Questions / Blocked On

- Nothing currently blocking. Stage 4 needs a Supabase Storage bucket created (no new third-party
  account — same Supabase project) and no other new credentials.
- Whether to wire Resend into Supabase's SMTP settings now (to fix the Stage 2 email rate-limit
  annoyance) or wait until Stage 9 as planned — still open, still not urgent.

## Credentials Status

| Integration | Needed at | Status |
|---|---|---|
| GitHub | Stage 0 | ✅ done — repo at https://github.com/AdroitPhilocalist/giftping |
| Supabase (URL/anon/service-role) | Stage 0 | ✅ done — connectivity verified, full schema live |
| Supabase Personal Access Token | Stage 1 | ✅ used for CLI link/push, not stored anywhere in-repo |
| Supabase DB password | Stage 1 | ✅ used for migrations, not stored anywhere in-repo |
| Sentry DSN | Stage 0 | 🟡 wired, not yet verified against live dashboard |
| Google OAuth | Stage 2 | ✅ done — configured on Supabase, reaches real Google consent screen |
| MSG91 (phone OTP) | Stage 2 | ⚪ deliberately deferred — feature-flagged off, cost constraint |
| Upstash Redis | Stage 2 (reused later) | 🟡 code-complete with graceful no-op fallback; not yet provisioned |
| Supabase Storage bucket | Stage 4 | 🔴 not created yet — same project, no new account needed |
| Razorpay (test) | Stage 7 | 🔴 not needed yet |
| Shiprocket (sandbox, Lite/PAYG plan) | Stage 8 | 🔴 not needed yet |
| Resend | Stage 9 (or earlier, see Open Questions) | 🔴 not needed yet |
| OneSignal (free tier) | Stage 9 | 🔴 not needed yet |
| ~~Remove.bg~~ | — | ❌ cut from scope, cost constraint |
| ~~Railway~~ | — | ❌ cut from scope — Vercel Cron Job instead |
| ~~Cloudinary~~ | — | ❌ cut from scope — Supabase Storage + sharp + next/image instead |
