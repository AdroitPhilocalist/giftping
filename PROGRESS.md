# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

**Stage 1 — Database Schema & RLS** ✅ complete. Next session should start Stage 2 (Auth).

## Last Session Summary

- Installed the Supabase CLI (`brew install supabase/tap/supabase`) and `psql` (`brew install libpq`,
  keg-only — see CLAUDE.md for the PATH export needed to use it).
- Wrote the full Stage 1 schema as 9 migrations under `supabase/migrations/` (27 tables total): extensions
  & helpers, core tables (users/addresses/vendors/categories/products/product_images/product_variants/
  product_qna), commerce tables (cart/cart_items/coupons/orders/order_items/payments/shipments/
  coupon_redemptions/vendor_settlements), diary tables, support tables (reviews/wishlists/notifications/
  notification_preferences/banners/loyalty_ledger/audit_logs), search indexing, row-level security, plus
  4 small follow-up migrations fixing real bugs found while hand-testing (see below and CLAUDE.md's
  "Two real Postgres bugs" section — worth reading before writing more triggers/RLS).
- Linked to the remote Supabase project (`supabase link` needed a personal access token from the
  developer, distinct from the project API keys — `supabase login --token`) and pushed all 11 migrations
  via `supabase db push --password <db password>` (also developer-provided, distinct again from both the
  PAT and the API keys — three different credentials for three different things this session).
- **Hand-verified RLS end to end** by connecting directly via `psql` and simulating specific
  users/roles inside rolled-back transactions (`set local role authenticated; set local
  request.jwt.claims = '{"sub":"<uuid>"}'; ...; rollback;`) — this is what actually caught the two real
  bugs below; reasoning about the policy SQL alone would not have. Confirmed: customer A sees only their
  own address/cart/diary and cannot insert on B's behalf; customer B (as a vendor) sees their own pending
  product but not other vendors'; a vendor cannot self-approve a product or edit their own commission
  rate; a vendor can only add `vendor_response` to a review, not edit its rating/body; admin sees
  everything **except** diary content (deliberately — matches the SRS's privacy promise); anon sees active
  categories/products but no addresses/carts/diary; `validate_coupon()` correctly handles expiry,
  vendor-scoping, minimum order amount, and per-user redemption limits; the `orders.status` rollup trigger
  correctly reacts to shipment status changes (processing → shipped → delivered).
- **Two real bugs found and fixed while hand-testing** (full detail in CLAUDE.md, don't re-derive here):
  (1) a `GENERATED STORED` search-vector column isn't possible because `array_to_string()` isn't
  `IMMUTABLE` — switched to a trigger-maintained column instead; (2) the four ownership-enforcement
  triggers were `SECURITY DEFINER`, which silently made `current_user` always read as the function owner
  (`postgres`) instead of the real caller — this let a vendor's own session self-approve their own
  product and would have let them escalate their own role, until fixed by making those four triggers
  `SECURITY INVOKER` instead. Also fixed along the way: missing baseline table GRANTs (RLS policies alone
  don't grant table access — Postgres checks GRANTs first), and an ambiguous column reference in
  `validate_coupon()`.
- Generated `lib/db/types.ts` (`npm run db:types` — added as a script) and wired all three Supabase clients
  (`lib/db/{client,server,admin}.ts`) to be generic over `Database` for full type safety.
- Wrote `scripts/seed.ts` (`npm run seed`) — idempotent (all upserts keyed on slug), seeds 6 categories, the
  in-house "GiftPing Originals" vendor (0% commission, `is_in_house = true`), and 4 sample products.
  Verified idempotency by running it twice and confirming row counts didn't change.
- All test data created during RLS verification was deleted afterward — confirmed the database is clean
  except for the seed data.
- `npm run build` passes clean throughout (one real TS bug caught by the build itself: a `readonly` tuple
  from `as const` isn't assignable to supabase-js's mutable upsert array type — fixed with a spread).
- Noted (not acted on, just flagged to the developer): the `dotenv` package prints a rotating "tip" line
  on every load, one variant of which advertised an unrelated third-party site — harmless console noise,
  not something either of us asked for, worth knowing about if it's ever seen again.

## Next Up

Start **Stage 2 — Auth**: email/password + Google OAuth + MSG91 phone OTP (as a *verification step* on
top of email/password, not a standalone login method — Supabase's native phone auth doesn't speak MSG91
directly, this needs custom glue, see the plan doc), `proxy.ts` (Next 16's renamed `middleware.ts`) for
route protection, a `getServerUser()`/`requireRole()` helper in `lib/auth/session.ts`, rate limiting on
auth routes (Upstash Redis + `@upstash/ratelimit` — not yet installed). The `handle_new_auth_user()`
trigger from Stage 1 already auto-creates the `public.users` row on signup, so Stage 2 doesn't need to
write that insert itself — just build the sign-up/sign-in UI and session plumbing on top of it. "Done
when": all three sign-in paths work, and a customer JWT is server-rejected (403) from `/vendor/*` and
`/admin/*` routes, not just UI-redirected.

## Open Questions / Blocked On

- Nothing currently blocking. Stage 2 needs Google OAuth credentials and an MSG91 account — ask the
  developer for these when actually starting the sign-up/OTP UI, not before.

## Credentials Status

| Integration | Needed at | Status |
|---|---|---|
| GitHub | Stage 0 | ✅ done — repo at https://github.com/AdroitPhilocalist/giftping |
| Supabase (URL/anon/service-role) | Stage 0 | ✅ done — connectivity verified, full schema live |
| Supabase Personal Access Token | Stage 1 | ✅ used for CLI link/push, not stored anywhere in-repo |
| Supabase DB password | Stage 1 | ✅ used for migrations, not stored anywhere in-repo |
| Sentry DSN | Stage 0 | 🟡 wired, not yet verified against live dashboard |
| Google OAuth | Stage 2 | 🔴 not needed yet |
| MSG91 | Stage 2 | 🔴 not needed yet |
| Upstash Redis | Stage 2 (reused later) | 🔴 not needed yet |
| Cloudinary | Stage 3 | 🔴 not needed yet |
| Remove.bg | Stage 4 | 🔴 not needed yet |
| Razorpay (test) | Stage 7 | 🔴 not needed yet |
| Shiprocket (sandbox) | Stage 8 | 🔴 not needed yet |
| Resend | Stage 9 | 🔴 not needed yet |
| OneSignal | Stage 9 | 🔴 not needed yet |
| Railway | Stage 9 | 🔴 not needed yet |
