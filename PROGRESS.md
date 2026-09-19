# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

**Stage 4 — Vendor Portal (core)** ✅ complete. Next session should start Stage 5 (Cart).

## Last Session Summary

Full detail + reasoning: `docs/progress/2026-09-19-stage-4-vendor-portal.md`.

- **Security hardening first**: probing showed anon could read vendor PAN/GSTIN/bank/commission and any customer
  could self-insert an approved featured vendor / active product with fake ratings. Fixed via a `vendor_private`
  table, pending-only INSERT policies and widened guard triggers (4 new migrations, hand-verified with psql).
- **Vendor onboarding + admin approval gate**: `/vendor/register`, `/admin/vendors`, `/admin/products`
  (approve/reject with reason → audit log + notification; approving a vendor promotes their role).
- **Vendor portal** (`app/vendor/(portal)/`): dashboard, product CRUD + variants, image manager, status
  badges/reviewer notes, Hide/Resubmit, orders stub. Editing a live product sends it back to review.
- **Image pipeline**: upload route handler → sharp validation/re-encode → WebP 3 sizes → Supabase Storage bucket
  `product-images` (no client write policies) → `next/image`.
- **Commission resolution** (tested pure function) and **AES-256-GCM bank-detail encryption** (tested).
- Verified end-to-end in a real browser: apply → approve → create product → upload → reject → resubmit →
  approve → visible on PDP/vendor page/category/search. `lint`, `tsc`, 13 unit tests clean (`npm test`).

## Next Up

**Stage 5 — Cart**: persistent multi-vendor cart grouped by vendor (`cart`/`cart_items` tables already exist from
Stage 1), guest cart via cookie merged into the account cart on login without duplicating/losing items, wire the
PDP "Add to Cart" stub (`components/shop/ProductBuyBox.tsx`) and a `/cart` page. Server never trusts
`unit_price_snapshot`. Then Stage 6 Checkout, 7 Razorpay, 8 Shiprocket, 9 Diary + Vercel Cron.

## Open Questions / Blocked On

- Nothing blocking. `VENDOR_BANK_ENCRYPTION_KEY` lives in gitignored `.env.local` — a second laptop must be given
  the same key (or use a fresh dev DB); it must also be set in Vercel for production.
- Whether to wire Resend as Supabase's SMTP now (Stage 2 auth-email rate limit) or at Stage 9 — still open.
- Not built in Stage 4 (deliberate): bulk CSV upload, vendor logo/banner upload, real vendor order management,
  admin notification emails, vendor-level rating rollup, Razorpay linked-account creation.

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
