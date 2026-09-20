# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

> **Deployment:** https://giftping-lime.vercel.app (Vercel, auto-deploys from `master`). Webhooks: `/api/webhooks/razorpay`, `/api/webhooks/courier-tracking`.
> **2026-09-20:** Razorpay test keys + Shiprocket API user wired locally and verified against the real APIs — see the "Real-account verification" sections in the Stage 7 and 8 logs.

**Stage 8 — Delivery (Shiprocket)** ✅ built, ⚠️ **verified against a local mock only** (like Stage 7's payments). Two "First real test" runs are now
pending on the developer's accounts: Razorpay (Stage 7 log) and Shiprocket (Stage 8 log). Next code stage: **Stage 9 — Personal Gifting Diary + Vercel Cron**.

## Last Session Summary

Full detail: `docs/progress/2026-09-19-stage-8-delivery.md`.

- **Checkout serviceability**: per-vendor pincode check + ETA (cached, fail-open), blocks a definite "no courier" both in the UI and server-side. The delivery
  *charge* stays flat-per-vendor with a free threshold (Shiprocket gates/ETAs only — a deliberate choice, see the log).
- **Vendor `/vendor/orders`**: paid orders only → Accept → Book courier (resumable Shiprocket saga: pickup location, order, AWB, pickup request) → tracking link.
- **Tracking webhook** `/api/webhooks/courier-tracking` → `apply_shipment_update()` (idempotent + monotonic + terminal states), timeline in `shipment_events`,
  customer notifications, and customer tracking on `/orders/[id]`.
- **Fixed** the multi-vendor order-status rollup (it read "shipped" when only one vendor had), and made Shiprocket login single-flight after the mock showed
  parallel lookups each logging in.
- Verified via real UI + signed/tokened requests against a mock Shiprocket: happy path, failure/resume, unserviceable pincode (server-enforced), out-of-order/duplicate/
  concurrent webhooks, RLS. `lint`, `tsc`, 69 tests, build clean.
- **Not built**: live courier rates, COD, returns/reverse pickup, NDR, label PDFs, vendor shipment cancel (Stage 11), vendor settlement job (Stage 11).

## Next Up

1. **Developer (parallel, no code blocked):** Razorpay test keys + webhook, Shiprocket API user + webhook token → run both "First real test" checklists and report any
   payload/response differences (fix `RazorpayWebhookEvent`, `parseTrackingPayload`, `shiprocket-status.ts`, `shiprocket.ts` field names as needed).
2. **Stage 9 — Personal Gifting Diary (signature feature)**: contacts + events CRUD, gift history, dashboard (upcoming moments, mini calendar, people list, gifting-score
   as a documented pure function, rule-based smart suggestions from the catalogue), and the **Vercel Cron** reminder job (`/api/cron/diary-reminders`, `vercel.json`,
   `CRON_SECRET`) with explicit timezone handling (`users.timezone`, Asia/Kolkata default), Feb-29 recurrence as its own tested unit, and a 20-hour idempotency
   guard. Diary tables deliberately have NO admin RLS bypass (privacy promise). Also add to the same cron: cancel stale unpaid `created`/`payment_initiated` orders
   (release coupon uses) and purge guest carts older than 30 days. Needs Resend + OneSignal keys only for actually *sending* — build with a mock/log sender first.
3. Then Stage 10 notifications/emails, Stage 11 admin suite, Stage 12 visual polish, Stage 13 go-live.

## Open Questions / Blocked On

- **Razorpay + Shiprocket real-account verification** (developer) — does not block Stage 9.
- Razorpay Route (auto-split settlement): pursue or settle vendors manually at first? Client decision (see Stage 7 log).
- Vendor registration should capture a support phone (needed for the courier pickup location) — small fix, folds into Stage 11 vendor settings.
- Stale unpaid orders hold coupon uses / stale guest carts pile up until the Stage 9 cron exists.
- Whether to wire Resend as Supabase's SMTP now (Stage 2 auth-email rate limit) or at Stage 9/10 — still open.
- `VENDOR_BANK_ENCRYPTION_KEY` lives in gitignored `.env.local` — a second laptop needs the same key; also set in Vercel for production.
- Not built yet (deliberate): bulk CSV upload, vendor logo/banner upload, admin notification emails (Stage 10), vendor-level rating rollup, coupon admin UI (Stage 11),
  order history list, guest checkout.

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
| Razorpay (test) | Stage 7 | 🟡 keys wired locally + verified against the real API; webhook secret set on Vercel. **Add `NEXT_PUBLIC_RAZORPAY_KEY_ID` + `RAZORPAY_SECRET_KEY` to Vercel and redeploy**; one human test payment still to observe |
| Shiprocket (API user + webhook token; Lite/PAYG plan) | Stage 8 | 🟡 login + serviceability verified against the real API; webhook token set on Vercel. Account has 0 pickup locations and ₹0 wallet; add `SHIPROCKET_EMAIL`/`PASSWORD` to Vercel; use a separate webhook token |
| Resend | Stage 9 (or earlier, see Open Questions) | 🔴 not needed yet |
| OneSignal (free tier) | Stage 9 | 🔴 not needed yet |
| ~~Remove.bg~~ | — | ❌ cut from scope, cost constraint |
| ~~Railway~~ | — | ❌ cut from scope — Vercel Cron Job instead |
| ~~Cloudinary~~ | — | ❌ cut from scope — Supabase Storage + sharp + next/image instead |
