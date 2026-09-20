# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

> **Deployment:** https://giftping-lime.vercel.app (Vercel, auto-deploys from `master`). Webhooks: `/api/webhooks/razorpay`, `/api/webhooks/courier-tracking`. Daily cron: `/api/cron/diary-reminders`.

**Stage 9 — Personal Gifting Diary + daily cron** ✅ built and verified locally. **Stage 10 — email + web push built** (`notifyUser()` = in-app + email + push, preference-gated; real Resend in test mode; real OneSignal wired). **Web push verified for real on the deployed site (Safari, 2026-09-20)**: subscribed via Account → Notification settings, OneSignal showed an enabled SafariPush linked to the user's id, a direct push and the production diary cron's push were both received, and a second cron run sent nothing (exactly-once). Not yet tried in Chrome/Brave (Brave needs "Use Google services for push messaging" turned on). Remaining: Supabase auth SMTP (needs a domain). **Stage 7 (payments) is now fully verified with a real Razorpay test payment**
(real webhooks confirmed the order once, replays were no-ops, stock/cart/notifications correct). Next: **Stage 10 — Notifications (email/push) & Stage 11 — Admin suite**.

## Stage 11 in progress

Slices done: **admin orders + cancel/refund** (real refund verified at Razorpay), **coupons + dashboard**, **user management + DPDP erasure**, **vendor controls + payout ledger** (suspend/reinstate, commission override, vendor settings, settlements with hold period/UTR/CSV), **returns + partial refunds** (customer requests, admin decisions, reserve→gateway→apply refunds, payout clawback as debits) — see `docs/progress/2026-09-20-stage-11-admin-orders.md`. **Homepage banners done** (admin CMS + carousel). **Vendor logo + banner upload done** (with admin take-down). **Bulk CSV product upload done** (preview → all-or-nothing import as hidden drafts). **"Download my data" done.** Remaining: dashboard alert for paid orders stuck with a suspended vendor. **Unverified with the real Razorpay: partial refunds** (see slice 5 in the Stage 11 log for the first real test). 

## Last Session Summary

Full detail: `docs/progress/2026-09-20-stage-9-diary.md`, and the "Real-account verification" sections of the Stage 7/8 logs.

- **Real-account verification**: Razorpay test keys + Shiprocket API user wired and verified against the real APIs; a real test payment completed and was confirmed by real webhooks.
  (Card lesson: the account rejects the US test card `4111…` — use Razorpay's domestic test card/UPI.)
- **Diary**: people, dates, gift log, dashboard (coming up, ideas, gifting score, calendar), person pages; pure tested core; rule-based suggestions.
- **Daily cron** (`vercel.json`, 09:00 IST): timezone-aware, exactly-once diary reminders (in-app + email when Resend is configured), stale unpaid order cancellation, guest cart purge.
- **Notification bell + inbox** and **email preferences** — previously invisible in-app notifications are now visible.
- **Three privacy/integrity fixes** found while building (cross-user contact reference, admin-readable diary reminders via `notifications`, notification tampering).
- 114 unit tests, lint, tsc, build all clean; DB rules and the cron verified with real users and real HTTP.

## Next Up

1. **Developer (unblocks real verification):** add to Vercel and redeploy — `CRON_SECRET` (any long random string; the value in `.env.local` is only for local), `NEXT_PUBLIC_RAZORPAY_KEY_ID`,
   `RAZORPAY_SECRET_KEY`, `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `VENDOR_BANK_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`. Resend key + a verified domain for real reminder emails.
   Shiprocket: recharge wallet (~₹500) + create/verify a pickup address, then tell me its name. Rotate the Shiprocket password and use a separate webhook token.
2. **Stage 10 (remaining)**: ~~OneSignal web push~~ (built; awaiting a real-browser subscribe test on the deployed site) (client SDK, subscription flow, `push` channel in the reminder cron), order/shipment emails via Resend, notification preferences per channel,
   verified-domain email + Supabase auth SMTP through Resend (fixes the auth-email rate limit).
3. **Stage 11 — Admin suite**: dashboard/analytics, vendor mgmt (incl. commission override, support phone capture), product moderation, order oversight + cancellations/refunds/returns, coupons UI,
   homepage banners, user mgmt, DPDP deletion, vendor settlements (data is in `order_item_financials`), vendor logo/banner + CSV upload.
4. Stage 12 visual/motion polish to match `ui-references/`; Stage 13 go-live (prod Supabase project + backups, rotate all pasted secrets, delete test accounts/seed images, legal pages, live Razorpay KYC).

## Open Questions / Blocked On

- Real **email** delivery (Resend key + domain) and real **courier booking** (Shiprocket wallet + pickup address) are the two remaining unverified live paths.
- Razorpay Route (auto vendor split) vs manual settlement — client decision.
- The Shiprocket webhook token equals the account password (advised to change).
- `VENDOR_BANK_ENCRYPTION_KEY` lives only in `.env.local` + must be set in Vercel; losing it makes stored bank details unrecoverable.

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
| Resend | Stage 9/10 | 🟡 API key wired (send-only) and real emails sent in test mode to the owner's address only; **verified domain still needed** to email real users |
| OneSignal (free tier) | Stage 9 | 🔴 not needed yet |
| ~~Remove.bg~~ | — | ❌ cut from scope, cost constraint |
| ~~Railway~~ | — | ❌ cut from scope — Vercel Cron Job instead |
| ~~Cloudinary~~ | — | ❌ cut from scope — Supabase Storage + sharp + next/image instead |
