# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

> **Deployment:** https://giftping-lime.vercel.app (Vercel, auto-deploys from `master`). Webhooks: `/api/webhooks/razorpay`, `/api/webhooks/courier-tracking`. Daily cron: `/api/cron/diary-reminders`.

**Stage 9 — Personal Gifting Diary + daily cron** ✅ built and verified locally. **Stage 10 — email + web push built** (`notifyUser()` = in-app + email + push, preference-gated; real Resend in test mode; real OneSignal wired). **Web push verified for real on the deployed site (Safari, 2026-09-20)**: subscribed via Account → Notification settings, OneSignal showed an enabled SafariPush linked to the user's id, a direct push and the production diary cron's push were both received, and a second cron run sent nothing (exactly-once). Not yet tried in Chrome/Brave (Brave needs "Use Google services for push messaging" turned on). Remaining: Supabase auth SMTP (needs a domain). **Stage 7 (payments) is now fully verified with a real Razorpay test payment**
(real webhooks confirmed the order once, replays were no-ops, stock/cart/notifications correct). Next: **Stage 12 in progress — slice 1 (design foundation + theming) and slice 2 (homepage, `/mall` directory, placeholder art, `npm run images:sync`) done, see `docs/progress/2026-09-21-stage-12-*.md`**; **slice 3 (product page + delivery checker + first real artwork: hero, map, cards) done, see `docs/progress/2026-09-21-stage-12-product-page.md`**; **slice 4 (order tracking, diary desk, About/Contact/Privacy/Terms/Refunds, real robin + logo wired) done, see `docs/progress/2026-09-21-stage-12-tracking-diary-pages.md`**; **slice 5 (cart + checkout polish) done, see `docs/progress/2026-09-21-stage-12-cart-checkout.md`**; **slice 6 (wrap-style choice, My orders, shop by relationship, account hub, 404) done, see `docs/progress/2026-09-21-stage-12-orders-wraps-relationships.md`; ALL Batch 1 artwork delivered and wired**; **slice 7 (theme scheduling + admin preview, `/admin/themes`) done, see `docs/progress/2026-09-22-stage-12-theme-scheduling.md` — no festival theme built yet, waiting on the client to ask**; **slice 8 (performance pass) done, see `docs/progress/2026-09-22-stage-12-performance-pass.md` — memoized `getActiveTheme()`/`getProductBySlug()` (were re-querying up to 8x per homepage request), parallelized several page-level query waterfalls, fixed two real image-preload bugs (Logo, HomeHero/auth panel), removed zod from the product-page bundle, added AVIF**; **slice 9 (robin mascot moments + basket-themed cart) done, see `docs/progress/2026-09-22-stage-12-robin-mascot-moments.md` — custom robin cursor, "add to cart" fly-to-basket animation, payment-confirmed celebration, cart redesigned as a woven basket**; **slice 10 (Batch 2 artwork wired, cursor drift fixed, 57-product demo database + `npm run seed:demo`) done, see `docs/progress/2026-09-23-stage-12-batch2-cursor-demo-data.md`**; **slice 11 (the Personal Gifting Diary redesigned — a book on a desk: front page, person pages with a gift plan, year at a glance, gifting-year review, paper dialogs, private photos, new reminder email, bell dropdown) done, see `docs/progress/2026-09-25-stage-12-diary-redesign.md`**; **slice 12 (quick fixes: robin cursor / condensing header / diary fits the window; page pass 1: gift-tag cards, occasion worlds, Boutique Avenue, live gift-card preview) done, see `docs/progress/2026-09-26-stage-12-quick-fixes-and-page-pass-1.md` — pass continues with cart/checkout/orders/account/home**; **slice 13 (the diary is now a real book you flip through — 7 spreads that grow with your people, a hinged-leaf page turn, section tabs, contents page, keyboard/swipe, `?p=` bookmarks, no vertical scroll on a big screen) done, see `docs/progress/2026-09-27-stage-12-diary-flip-book.md` — the person/year/review pages still use the older two-page book;** **slice 14 (the front spread is back to everything-in-small with a "see more" on each piece, no contents page; the pager under the book is gone — "Turn the page →" and a curling paper corner are written on the pages themselves; FitPage scales any page to the window) done, see `docs/progress/2026-09-27-stage-12-diary-front-spread-and-page-corners.md`;** **slice 15 (diary was silently blocking all page scroll near it — a leftover `overscroll-behavior` from the old two-page book; local sign-in was redirecting to the production deployment because `getAppUrl()` trusted `NEXT_PUBLIC_APP_URL` over the request's own origin) done, see `docs/progress/2026-09-27-stage-12-diary-scroll-and-local-auth-redirect.md`;** **slice 16 (navbar redesigned, then corrected same-day to match the client's own approved reference — a flush full-width dark-green bar at rest, condensing to a floating pill on scroll; real hover mega-menus for Occasions/Boutiques; a rebuilt account-menu dropdown; every header icon/link restyled; My Diary is now a quiet outlined pill) done, see `docs/progress/2026-09-28-stage-12-navbar-redesign.md`;** **slice 17 (homepage hero photo now runs the full page width with the headline overlaid on it, per the client's actual mockup; the announcement strip and header now share one exact colour at their seam instead of two independently-tuned bars) done, see `docs/progress/2026-09-28-stage-12-full-bleed-hero.md` — not re-verified visually, local preview access got stuck on a permission gate;** **slice 18 (the announcement ribbon removed entirely — a real theme-system field, not just a component; the white gap between header and hero photo fixed — a real height bug; hero text now stays legible regardless of what's behind it; the header's green given real depth) done, see `docs/progress/2026-09-28-stage-12-announcement-removed-hero-fixes.md` — verified visually this time;** **an overnight full-site QA + security pass done, see `docs/progress/2026-09-28-overnight-qa-and-security-pass.md`** — all three roles (customer/vendor/admin) clicked through end to end with real data, including the full vendor-onboarding→category-approval→storefront pipeline and the `/admin/themes` preview mechanism, both previously unconfirmed; a real header-height regression restored (a same-day revert had silently dropped it); a 16-check RLS audit against the real dev DB (customer/vendor/admin/anon isolation, cross-user FK guard, diary no-admin-bypass) all passed with no regressions; baseline security response headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) added to `next.config.ts` — a real gap, Vercel doesn't set these itself. No destructive/load/DDoS testing was attempted, by design. **A real Content-Security-Policy done and live-tested, see `docs/progress/2026-09-28-csp.md`** — a per-request nonce + `'strict-dynamic'` in `proxy.ts` (Next's own current recommendation over a host allowlist), verified against a real Razorpay checkout session (including a second script it dynamically loads that nobody would have thought to hand-allowlist), a real Supabase Storage image request, and the real OneSignal SDK script — all clean, zero violations; full regression (tsc/291 tests/eslint/build) clean. OneSignal's and Sentry's `connect-src` couldn't be live-exercised from localhost (both gate themselves off outside their configured production origin/env) — correct by configuration, not yet by an observed network call; needs one real check after the next deploy. Next: regenerate world-for-her/for-him (real brand names visible), Batch 3 artwork (`docs/design/asset-prompts.md`); Stage 13 go-live.

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
- **Resolved this session** (all previously-open click-through items): `/admin/themes` preview confirmed working (whole-site restyle + "Stop" strip), the full diary (`/diary`, person pages, plan strip, date dialogs, bell dropdown) confirmed working with a real signed-in session, and a real order was placed through checkout with a gift-wrap style, reaching a live Razorpay test-mode session. Two things still genuinely untestable in this environment (tooling limits, not app defects): a native file picker (diary/product photo upload) and completing a payment inside Razorpay's own cross-origin iframe — both need a human at a real browser once. See `docs/progress/2026-09-28-overnight-qa-and-security-pass.md` for exactly what was and wasn't exercised.
- Support email/phone for the Contact page (`NEXT_PUBLIC_SUPPORT_EMAIL`/`_PHONE`) — currently blank.
- **The CSP is written and live-tested** (see `docs/progress/2026-09-28-csp.md`) but two entries still need one real check after the next production deploy: subscribe to web push for real (OneSignal's SDK refuses to fully initialize anywhere but the configured production origin, so its `connect-src`/websocket behavior never ran locally) and trigger one real Sentry-reported error (Sentry is `enabled: false` outside `NODE_ENV === "production"`, so it never makes a network call in dev). Both entries are correct by configuration, just not yet by an observed request.
- The custom robin cursor (desktop only) and payment-confirmed celebration — worth the client watching once during a real completed payment (couldn't be triggered end-to-end by any automated session, including this one).

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
