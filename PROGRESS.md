# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

> **Deployment:** https://giftping-lime.vercel.app (Vercel, auto-deploys from `master`). Webhooks: `/api/webhooks/razorpay`, `/api/webhooks/courier-tracking`. Daily cron: `/api/cron/diary-reminders`.

**Stage 9 — Personal Gifting Diary + daily cron** ✅ built and verified locally. **Stage 10 — email + web push built** (`notifyUser()` = in-app + email + push, preference-gated; real Resend in test mode; real OneSignal wired). **Web push verified for real on the deployed site (Safari, 2026-09-20)**: subscribed via Account → Notification settings, OneSignal showed an enabled SafariPush linked to the user's id, a direct push and the production diary cron's push were both received, and a second cron run sent nothing (exactly-once). Not yet tried in Chrome/Brave (Brave needs "Use Google services for push messaging" turned on). Remaining: Supabase auth SMTP (needs a domain). **Stage 7 (payments) is now fully verified with a real Razorpay test payment**
(real webhooks confirmed the order once, replays were no-ops, stock/cart/notifications correct). Next: **Stage 12 in progress — slice 1 (design foundation + theming) and slice 2 (homepage, `/mall` directory, placeholder art, `npm run images:sync`) done, see `docs/progress/2026-09-21-stage-12-*.md`**; **slice 3 (product page + delivery checker + first real artwork: hero, map, cards) done, see `docs/progress/2026-09-21-stage-12-product-page.md`**; **slice 4 (order tracking, diary desk, About/Contact/Privacy/Terms/Refunds, real robin + logo wired) done, see `docs/progress/2026-09-21-stage-12-tracking-diary-pages.md`**; **slice 5 (cart + checkout polish) done, see `docs/progress/2026-09-21-stage-12-cart-checkout.md`**; **slice 6 (wrap-style choice, My orders, shop by relationship, account hub, 404) done, see `docs/progress/2026-09-21-stage-12-orders-wraps-relationships.md`; ALL Batch 1 artwork delivered and wired**; **slice 7 (theme scheduling + admin preview, `/admin/themes`) done, see `docs/progress/2026-09-22-stage-12-theme-scheduling.md` — no festival theme built yet, waiting on the client to ask**; **slice 8 (performance pass) done, see `docs/progress/2026-09-22-stage-12-performance-pass.md` — memoized `getActiveTheme()`/`getProductBySlug()` (were re-querying up to 8x per homepage request), parallelized several page-level query waterfalls, fixed two real image-preload bugs (Logo, HomeHero/auth panel), removed zod from the product-page bundle, added AVIF**; **slice 9 (robin mascot moments + basket-themed cart) done, see `docs/progress/2026-09-22-stage-12-robin-mascot-moments.md` — custom robin cursor, "add to cart" fly-to-basket animation, payment-confirmed celebration, cart redesigned as a woven basket**; **slice 10 (Batch 2 artwork wired, cursor drift fixed, 57-product demo database + `npm run seed:demo`) done, see `docs/progress/2026-09-23-stage-12-batch2-cursor-demo-data.md`**; next: regenerate world-for-her/for-him (real brand names visible), Batch 3 artwork (`docs/design/asset-prompts.md`); Stage 13 go-live.

## Stage 11 in progress

Slices done: **admin orders + cancel/refund** (real refund verified at Razorpay), **coupons + dashboard**, **user management + DPDP erasure**, **vendor controls + payout ledger** (suspend/reinstate, commission override, vendor settings, settlements with hold period/UTR/CSV), **returns + partial refunds** (customer requests, admin decisions, reserve→gateway→apply refunds, payout clawback as debits) — see `docs/progress/2026-09-20-stage-11-admin-orders.md`. **Homepage banners done** (admin CMS + carousel). **Vendor logo + banner upload done** (with admin take-down). **Bulk CSV product upload done** (preview → all-or-nothing import as hidden drafts). **"Download my data" done. Dashboard alert for paid orders stuck with a suspended vendor done — Stage 11 (admin suite) is COMPLETE.** Next: Stage 12 (visual & motion polish), then Stage 13 (go-live). **Unverified with the real Razorpay: partial refunds** (see slice 5 in the Stage 11 log for the first real test). 

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

Stages 0–11 are complete. Stage 12 (visual & motion polish) is in progress — slices 1–9 done (design
foundation/theming, homepage + mall, product page, order tracking + diary desk + content pages, cart/
checkout, wrap styles + My Orders + shop-by-relationship, theme scheduling, a performance pass, robin mascot moments & a basket-themed cart — see the
dated logs in `/docs/progress/`). Remaining before Stage 13:

1. Whatever artwork the client generates next from Batch 2 of `docs/design/asset-prompts.md` (occasion
   banners, default boutique fronts, diary desk, order-tracking header, mall destinations, auth panel) —
   `npm run images:sync` wires each one automatically, no code change needed.
2. Any festival theme the client asks for (Christmas first) — the scheduling mechanism (`/admin/themes`)
   is built and waiting; adding a theme is the 4-step recipe in `docs/design/DESIGN_DIRECTION.md`.
3. Then **Stage 13 — go-live**: production Supabase project + backups, rotate every pasted secret, delete
   test accounts/seed images, legal review of Privacy/Terms/Refunds (`lib/site.ts` `legalReviewed`), live
   Razorpay KYC, verified email domain + Supabase auth SMTP through Resend.

## Open Questions / Blocked On

- Real **email** delivery (Resend key + domain) and real **courier booking** (Shiprocket wallet + pickup address) are the two remaining unverified live paths.
- Razorpay Route (auto vendor split) vs manual settlement — client decision.
- The Shiprocket webhook token equals the account password (advised to change).
- `VENDOR_BANK_ENCRYPTION_KEY` lives only in `.env.local` + must be set in Vercel; losing it makes stored bank details unrecoverable.
- **Please click through once, signed in as the test admin** (things I can't verify myself — see the
  dated Stage 12 logs for exactly what's unchecked): `/admin/themes` (preview a demo theme, confirm the
  whole site restyles and the floating "Stop" strip works), `/checkout` end to end, and one real order
  placed with a gift-wrap style selected (confirm it shows correctly on the boutique's and admin's order
  screens).
- Support email/phone for the Contact page (`NEXT_PUBLIC_SUPPORT_EMAIL`/`_PHONE`) — currently blank.
- **New this session, worth the client trying live**: the custom robin cursor (desktop only) — easy to
  remove (one line in `app/layout.tsx`) if it's not to taste. The payment-confirmed celebration couldn't be
  triggered by a real payment in this session (only via a temporary local test page, since removed) —
  worth watching once during a real test payment.

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
