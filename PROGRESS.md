# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

**Stage 6 — Checkout (pre-payment)** ✅ complete. Next session should start Stage 7 (Payments — Razorpay).

## Last Session Summary

Full detail + reasoning: `docs/progress/2026-09-19-stage-6-checkout.md` (Stages 4–5 have their own entries alongside).

- **`/checkout`** (address book → gift options → review → coupon → summary) creating an order in `created` status, and **`/orders/[id]`**
  showing it as "Awaiting payment". Address book also at `/account/addresses`.
- **Server-authoritative totals**: every price/GST/commission/coupon/delivery figure is rebuilt from the DB (`lib/commerce/checkout.ts` +
  pure `totals.ts`); orders are created only by the atomic `place_order()` SQL function, which refuses inconsistent totals. Verified by
  tampering with the cart's stored prices via the API — the order total was unaffected.
- **Money rules decided**: GST-inclusive prices, coupon allocation (vendor- vs platform-funded), delivery ₹79 per vendor shipment (free ≥ ₹999),
  gift wrap ₹49 — all in `platform_settings`.
- **Security fixes**: platform commission/payout moved off customer-readable `order_items` into `order_item_financials`; new functions
  revoked from anon/authenticated (they are executable by default).
- `lint`, `tsc`, 50 unit tests, `npm run build` clean; DB rules verified as real users.

## Next Up

**Stage 7 — Payments (Razorpay)**: needs **Razorpay TEST keys + webhook secret** (ask the developer). Create a Razorpay order from the
*server-stored* `orders.total_amount` (×100 paise; never a client amount), Razorpay Checkout on the order page (replace the "payment opens in
the next release" notice; add a "Pay now" button and `paymentRateLimit`), HMAC signature verification, and — the source of truth — an
**idempotent webhook** (`/api/webhooks/razorpay`, raw-body signature check) that fulfils the order: `created → payment_verified/confirmed`,
**decrement stock atomically (fail safely if it sold out → auto-refund)**, clear the cart, write `payments` rows, `vendor_settlements`
bookkeeping. Encrypted vendor bank details already exist (Stage 4) for Razorpay Route linked accounts (create contact/fund account on
approval; fall back to manual settlement tracking if KYC stalls). "Done when": a test payment completes, the webhook alone (client callback
blocked) advances the order, a replayed event doesn't double-process, a bad signature is rejected. Run the `security-review` skill after.

## Open Questions / Blocked On

- **Blocked for Stage 7 on Razorpay test keys.** Nothing else blocking.
- Stale unpaid `created` orders (shopper never returns) hold a coupon use — needs a cancel job (Stage 9 cron); noted in the Stage 6 log.
- Whether to wire Resend as Supabase's SMTP now (Stage 2 auth-email rate limit) or at Stage 9 — still open.
- `VENDOR_BANK_ENCRYPTION_KEY` lives in gitignored `.env.local` — a second laptop needs the same key; also set it in Vercel for production.
- Not built yet (deliberate): bulk CSV upload, vendor logo/banner upload, real vendor order management (Stage 8), admin notification emails
  (Stage 10), vendor-level rating rollup, coupon admin UI (Stage 11), order history list, guest checkout.

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
