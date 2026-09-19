# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

**Stage 5 — Cart** ✅ complete. Next session should start Stage 6 (Checkout, pre-payment).

## Last Session Summary

Full detail + reasoning: `docs/progress/2026-09-19-stage-5-cart.md` (Stage 4 is in `2026-09-19-stage-4-vendor-portal.md`).

- **Cart** at `/cart` grouped by vendor: stepper, remove, per-vendor subtotals, personalisation per line, live
  price/stock re-evaluation with unavailable / out-of-stock / limited states. Navbar badge shows unit count.
- **Guest carts** (httpOnly `gp_cart` cookie, service-role path) and an atomic **guest → account merge**
  (`merge_guest_cart()` SQL fn) on sign-in / sign-up / OAuth callback, with a client safety net on the cart page.
- **PDP Add to Cart / Buy Now are real** (Buy Now → `/cart` until checkout exists); personalisation inputs now work.
- **DB hardening**: `cart_items_enforce_catalog` trigger (active product only, vendor_id from product, variant rules),
  size CHECKs, `variant_ids uuid[]` for multi-group variants. Verified as a real customer via RLS + role tests.
- `lib/commerce/pricing.ts` (tested) is the single pricing/stock rule set — checkout must reuse it.
- **Fixed an open redirect** in sign-in / OAuth callback (`//evil.com` passed `startsWith("/")`) → `safeRedirectPath()`.
- `lint`, `tsc`, 26 unit tests, `npm run build` all clean.

## Next Up

**Stage 6 — Checkout (pre-payment)**: address book (`addresses` table exists; CRUD + default address), a `/checkout` page
(already auth-gated by `proxy.ts`; the cart's "Checkout" button is disabled until it exists — enable it), order-draft creation
with **server-side recomputation of every price/total from the DB** (reuse `lib/commerce/pricing.ts`, never
`unit_price_snapshot`), per-vendor split into `order_items` (needs a `variant_ids uuid[]` column like the cart — see the
Stage 5 log), commission snapshot per line via `resolveCommissionRate`, coupon validation through the `validate_coupon()`
RPC, delivery-charge placeholder (real pincode serviceability is Stage 8). "Done when": tampering with a client-side price in
devtools has no effect on the server-created order total. Then Stage 7 Razorpay, 8 Shiprocket, 9 Diary + Vercel Cron.

## Open Questions / Blocked On

- Nothing blocking. Stage 6 needs no new credentials (Razorpay test keys are needed at Stage 7).
- Decide at Stage 6: GST handling on the order total (products carry `gst_rate`/`hsn_code`; are listed prices GST-inclusive?).
- `VENDOR_BANK_ENCRYPTION_KEY` lives in gitignored `.env.local` — a second laptop needs the same key (or a fresh dev DB);
  must also be set in Vercel for production.
- Not built yet (deliberate, see the Stage 4 log): bulk CSV upload, vendor logo/banner upload, real vendor order
  management (Stage 8), admin notification emails (Stage 10), vendor-level rating rollup, Razorpay linked accounts (Stage 7).
- Stale guest carts (>30 days) should be purged by the Stage 9 Vercel Cron.

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
| Supabase Storage bucket (`product-images`) | Stage 4 | ✅ created via migration, verified |
| Vendor bank encryption key | Stage 4 | ✅ in `.env.local`; 🔴 must be set in Vercel before go-live |
| Razorpay (test) | Stage 7 | 🔴 not needed yet |
| Shiprocket (sandbox, Lite/PAYG plan) | Stage 8 | 🔴 not needed yet |
| Resend | Stage 9 (or earlier, see Open Questions) | 🔴 not needed yet |
| OneSignal (free tier) | Stage 9 | 🔴 not needed yet |
| ~~Remove.bg~~ | — | ❌ cut from scope, cost constraint |
| ~~Railway~~ | — | ❌ cut from scope — Vercel Cron Job instead |
| ~~Cloudinary~~ | — | ❌ cut from scope — Supabase Storage + sharp + next/image instead |
