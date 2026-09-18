# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

**Stage 2 — Auth** — email/password fully done and verified; Google OAuth code-complete but untested
(needs credentials); phone OTP deliberately deferred. See Open Questions below before starting Stage 3.

## Last Session Summary

- **Cost constraint introduced mid-session** (client cap: ~₹40–50k/yr APIs, ~₹60–70k/yr incl.
  hosting/domain) — this changed real architecture, not just budgeting. Documented in detail in
  `CLAUDE.md`'s new "Cost constraint" section (read it before adding any new paid integration). Summary:
  Remove.bg cut entirely (vendors upload their own finished photos); Railway cut entirely (Stage 9's diary
  cron will be a Vercel Cron Job instead — confirmed Pro plan supports up to 100 cron jobs/project, 300s
  timeout, comfortably enough); Shiprocket on Lite/PAYG not Basic/Advanced; OneSignal free tier expected
  sufficient (web-only product, no native app, so its new mobile-MAU cap doesn't apply); MSG91 phone OTP
  built as a feature flag (`PHONE_OTP_ENABLED`, default false) so it can be switched off without a code
  change; Resend and Cloudinary flagged as the two real cost-growth risks to watch, Cloudinary especially
  (its next tier is ~₹91,000/yr on its own).
- **Auth built and hand-verified end to end in the browser**, not just code-reviewed:
  - `lib/auth/session.ts` (`getServerUser`/`requireRole`, always reads role from DB, never trusts a
    client claim), `lib/auth/actions.ts` (Server Actions: sign-up, sign-in, sign-out, Google OAuth kickoff,
    password reset request/update), `lib/auth/rate-limit.ts` (Upstash-backed, fails open — no-ops rather
    than blocking — if Upstash isn't configured, which it isn't yet), `lib/validation/auth.schema.ts` (Zod
    v4, shared shape for future client-side reuse).
  - `proxy.ts` (Next 16's `middleware.ts` rename) — optimistic UI-level redirect layer: unauthenticated →
    `/sign-in?redirectTo=...`, wrong role on `/vendor/*`/`/admin/*` → redirect home, already-authenticated
    hitting `/sign-in`/`/sign-up` → redirect home.
  - Pages: `/sign-up`, `/sign-in`, `/reset-password`, `/update-password`, `/auth/callback` (route handler
    for both OAuth and email-confirmation code exchange), plus minimal protected stubs (`/account`,
    `/diary`, `/vendor/dashboard`, `/vendor/register` (public), `/admin/dashboard`) that exist specifically
    to prove the auth/role plumbing end-to-end — full UI for these comes in later stages.
  - `Navbar` now reads real session state (`getServerUser()`) and shows a role-aware account dropdown
    (`AccountMenu`) instead of a static "Sign In" button.
- **Created 3 confirmed test accounts directly via the admin API** (bypassing Supabase's email
  confirmation requirement, since testing sign-up→confirm→sign-in through real email isn't practical in
  this environment): `test-customer@giftping.test`, `test-vendor@giftping.test`,
  `test-admin@giftping.test`, all password `TestPass123!`. **Left in the database intentionally** — useful
  for continued manual testing in later stages (cart, wishlist, vendor portal, admin panel all need a role
  to test against). Not real user data, safe to keep in a dev project; delete before go-live.
- **Two real bugs found and fixed while hand-testing in the browser** (not caught by `npm run build` —
  only showed up when actually clicking through):
  1. Sign-out silently did nothing — a `<button type="submit">` inside a Radix `DropdownMenu.Item`
     never reached the wrapping `<form>`'s native submit (Radix intercepts the click for its own
     selection/close handling first). Fixed by calling the `signOutAction()` server action directly from
     the item's `onSelect` instead of wrapping it in a form.
  2. First sign-up attempt failed with a generic error; temporarily added debug logging (removed after)
     to find the real cause: Supabase's own default/shared SMTP has a strict built-in email-send rate
     limit, and repeated test sign-ups during this session's verification hit it (`429
     over_email_send_rate_limit`). Not a bug in this project's code — flagged as a real production
     consideration: **the client will need custom SMTP configured in Supabase Auth settings before
     go-live** (Resend, already planned for Stage 9, is a natural fit — could even be wired in earlier
     than Stage 9 specifically to raise this limit if it becomes a dev annoyance).
  3. Also specifically verified `requireRole()` is real server-side enforcement, not just decoration
     around the proxy redirect: temporarily disabled proxy's admin-path check, confirmed a customer
     session hitting `/admin/dashboard` still got hard-blocked by `requireRole()` throwing `AuthError`
     (visible as a Next.js error, not a silently-rendered page) — then restored the proxy check. Added
     `app/error.tsx` as a branded fallback for this class of error (production already hides raw error
     detail by default; this just makes it look intentional rather than broken).
- Full matrix verified in-browser: customer blocked from `/admin/dashboard` and `/vendor/dashboard`;
  vendor reaches `/vendor/dashboard`, blocked from `/admin/dashboard`; admin reaches both; unauthenticated
  hitting `/account` redirects to `/sign-in?redirectTo=/account` and lands back on `/account` after
  signing in; already-authenticated user hitting `/sign-up` bounces to `/`.
- **Not yet done**: Google OAuth is fully code-complete (`signInWithGoogleAction`, `/auth/callback`) but
  genuinely untested — needs a Google Cloud OAuth client configured and registered as a provider in
  Supabase Auth settings. MSG91 phone OTP has no implementation at all yet (deliberately — see cost
  constraint above; build it only if/when the client actually wants it enabled).

## Next Up

1. **Get Google OAuth working**: developer needs to create a Google Cloud OAuth 2.0 Client ID (Web
   application type), add `https://qrcienpokiaplhtubtho.supabase.co/auth/v1/callback` as an authorized
   redirect URI, then provide the Client ID + Secret so they can be added to Supabase Auth's Google
   provider settings (dashboard → Authentication → Providers → Google) and to `.env.local`. Once done,
   verify the full OAuth round-trip in-browser the same way email/password was verified this session.
2. Move on to **Stage 3 — Catalog (read-only)**: functional homepage, category/occasion pages with
   filters, vendor storefront pages, PDP, Postgres full-text search (already schema-ready —
   `search_products()` RPC exists from Stage 1), reviews (read), wishlists. Needs a Cloudinary account
   (free tier — see the cost constraint in CLAUDE.md before ever upgrading it).

## Open Questions / Blocked On

- Google OAuth credentials (see Next Up #1) — not blocking Stage 3, since Stage 3 doesn't touch auth.
- Whether to wire Resend into Supabase's SMTP settings now (to fix the email rate-limit annoyance hit
  this session) or wait until Stage 9 as originally planned — developer's call, not urgent either way
  since the admin-created test accounts sidestep the issue for now.

## Credentials Status

| Integration | Needed at | Status |
|---|---|---|
| GitHub | Stage 0 | ✅ done — repo at https://github.com/AdroitPhilocalist/giftping |
| Supabase (URL/anon/service-role) | Stage 0 | ✅ done — connectivity verified, full schema live |
| Supabase Personal Access Token | Stage 1 | ✅ used for CLI link/push, not stored anywhere in-repo |
| Supabase DB password | Stage 1 | ✅ used for migrations, not stored anywhere in-repo |
| Sentry DSN | Stage 0 | 🟡 wired, not yet verified against live dashboard |
| Google OAuth | Stage 2 | 🟡 code-complete, credentials not yet provided |
| MSG91 (phone OTP) | Stage 2 | ⚪ deliberately deferred — feature-flagged off, cost constraint |
| Upstash Redis | Stage 2 (reused later) | 🟡 code-complete with graceful no-op fallback; not yet provisioned |
| Cloudinary | Stage 3 | 🔴 not needed yet — free tier only, see cost constraint |
| Razorpay (test) | Stage 7 | 🔴 not needed yet |
| Shiprocket (sandbox, Lite/PAYG plan) | Stage 8 | 🔴 not needed yet |
| Resend | Stage 9 (or earlier, see Open Questions) | 🔴 not needed yet |
| OneSignal (free tier) | Stage 9 | 🔴 not needed yet |
| ~~Remove.bg~~ | — | ❌ cut from scope, cost constraint |
| ~~Railway~~ | — | ❌ cut from scope — Vercel Cron Job instead |
