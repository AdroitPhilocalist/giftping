# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

**Stage 7 — Payments (Razorpay)** ✅ built, ⚠️ **verified against a local mock gateway only** — needs the developer's Razorpay TEST keys for a real
end-to-end run (steps in `docs/progress/2026-09-19-stage-7-payments.md` → "First real test"). Stage 8 (Delivery) can start in parallel.

## Last Session Summary

Full detail: `docs/progress/2026-09-19-stage-7-payments.md`.

- **Pay Now** on the order page; server creates the Razorpay order for the DB-stored total. **Signed, idempotent webhook**
  (`/api/webhooks/razorpay`) is the source of truth; the browser callback is a verified fast path (re-fetches the payment from Razorpay). Both call
  one atomic SQL step, `confirm_order_payment()`: amount check → stock decrement (all-or-nothing) → order `confirmed` → cart lines removed.
- **Auto-refund** if a captured payment can't be fulfilled (sold out / wrong amount / cancelled draft / duplicate); refund failures retry via the webhook.
- **Vendors now see only paid orders** (fixed a leak of buyers' addresses on unpaid drafts). Abandoned `payment_initiated` orders are superseded like drafts.
- Tested with signed requests to the real route: replay, duplicate, 8 concurrent deliveries, wrong amount, oversold multi-item rollback, late payment on
  a cancelled order, refund-failure retry, authorized→capture, forged/mismatched callbacks, ACLs. `lint`, `tsc`, 57 tests, build clean.
- **Not built**: Razorpay Route split settlement (needs a Route-enabled account + vendor KYC — decide with the client; the payout data is already stored
  per line in `order_item_financials` for manual settlement), customer/admin refunds (Stage 11), emails (Stage 10).

## Next Up

1. **Developer**: add Razorpay TEST keys + set up the webhook (see the Stage 7 log), then run the "First real test" and report any payload differences.
2. **Stage 8 — Delivery (Shiprocket, Lite/PAYG plan)**: needs a Shiprocket account (ask the developer). JWT token caching, real pincode
   serviceability at checkout (replace the flat ₹79 placeholder), vendor "confirm / dispatch" on `/vendor/orders` creating one Shiprocket shipment per
   vendor per order (`shipments` rows; the `recompute_order_status` trigger already rolls up `orders.status`), a tracking webhook, per-shipment
   tracking on `/orders/[id]`. "Done when": a two-vendor order produces two independent shipments/AWBs and the webhook updates status.
3. Then Stage 9 Diary + Vercel Cron (also the stale-draft cancel job), Stage 10 notifications/emails, Stage 11 admin suite, Stage 12 polish, Stage 13 go-live.

## Open Questions / Blocked On

- **Razorpay test keys + webhook setup** (developer) — blocks real payment verification, not Stage 8 coding.
- Razorpay Route: pursue (needs account enablement + vendor KYC, slow even in sandbox) or settle vendors manually at first? Client decision.
- Stale unpaid orders hold coupon uses until the Stage 9 cron exists.
- Whether to wire Resend as Supabase's SMTP now (Stage 2 auth-email rate limit) or at Stage 9 — still open.
- `VENDOR_BANK_ENCRYPTION_KEY` lives in gitignored `.env.local` — a second laptop needs the same key; also set in Vercel for production.
- Not built yet (deliberate): bulk CSV upload, vendor logo/banner upload, admin notification emails (Stage 10), vendor-level rating rollup, coupon admin UI
  (Stage 11), order history list, guest checkout.

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
| Razorpay (test) | Stage 7 | 🔴 keys + webhook secret still needed — code is built and mock-verified |
| Shiprocket (sandbox, Lite/PAYG plan) | Stage 8 | 🔴 not needed yet |
| Resend | Stage 9 (or earlier, see Open Questions) | 🔴 not needed yet |
| OneSignal (free tier) | Stage 9 | 🔴 not needed yet |
| ~~Remove.bg~~ | — | ❌ cut from scope, cost constraint |
| ~~Railway~~ | — | ❌ cut from scope — Vercel Cron Job instead |
| ~~Cloudinary~~ | — | ❌ cut from scope — Supabase Storage + sharp + next/image instead |
