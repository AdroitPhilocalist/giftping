# Stage 1 — Database Schema & RLS

**Completed:** 2026-09-18

## What was built

- 27 tables across 5 migrations (extensions/helpers, core, commerce, diary, support), plus a dedicated
  search-indexing migration and a row-level-security migration, plus 4 small bug-fix migrations added
  during hand-verification (see below). Full list and reasoning for anything beyond the SRS's baseline is
  in `CLAUDE.md`'s "Database schema" section — not repeated here.
- Every table has RLS enabled, with policies for customer/vendor/admin/anon as appropriate, plus a small
  number of ownership-enforcement triggers for the handful of things RLS alone can't express (a permitted
  UPDATE can still touch any column, so restricting *which* columns a vendor may change on their own row
  needs a trigger, not just a policy).
- `lib/db/types.ts` generated from the live schema; `lib/db/{client,server,admin}.ts` all typed against it.
- `scripts/seed.ts`, idempotent, seeding categories + the in-house vendor + sample products.

## Key decisions and why

- **`public.users.id` references `auth.users(id)` directly**, populated by an `AFTER INSERT` trigger on
  `auth.users` (`handle_new_auth_user`), rather than a separately-generated uuid. This is the standard,
  idiomatic pattern for using Supabase Auth directly (our Stage 0 decision) — it keeps `auth.uid()` usable
  as the join key everywhere instead of introducing a second identity concept that has to be kept in sync.
- **`products.vendor_id` is `NOT NULL`.** In-house products get a real seeded vendor row
  ("GiftPing Originals", `is_in_house = true`, 0% commission) instead of a nullable vendor_id. Every query
  and join can assume vendor attribution always exists — no special-casing a null vendor anywhere in the
  app layer.
- **`cart_items` has no uniqueness constraint on (cart_id, product_id, variant_id).** Two line items for
  the same product/variant can legitimately differ by personalization (different recipient name/message
  for the same gift), so "merge into an existing line vs. add a new one" has to be an application-layer
  decision (Stage 5's `lib/commerce/cart.ts`), not something the schema can determine unilaterally.
- **Coupons are not directly SELECT-able by customers.** A customer can only learn whether a code is valid
  through `validate_coupon()`, a `SECURITY DEFINER` RPC that checks expiry/vendor-scope/minimum
  order/usage limits/per-user limits and returns a pass/fail plus discount details — never the raw table.
  Direct SELECT is reserved for the coupon's owning vendor and admin. This avoids letting anyone enumerate
  every active discount code on the platform.
- **The Personal Gifting Diary tables have no admin RLS bypass, on purpose.** Every other table in this
  schema follows an `owner OR is_admin()` pattern; `diary_contacts`/`diary_events`/`gift_history` are
  strictly `owner` only. This is a direct implementation of a specific promise in the SRS ("admin sees
  diary entries as an aggregate count only, never private content") — worth calling out explicitly since
  it's the one deliberate exception to an otherwise-consistent pattern, and a future session adding a
  seemingly-reasonable `is_admin()` clause here would be quietly breaking a stated privacy commitment.
- **`orders.status` is a computed rollup, never set directly**, via a trigger
  (`recompute_order_status()`) that reacts to `shipments.status` changes and derives one of
  `processing`/`partially_shipped`/`shipped`/`partially_delivered`/`delivered` (plus the
  payment-stage/terminal statuses set elsewhere) from the *set* of that order's non-return shipment
  statuses. Necessary because a multi-vendor order ships independently per vendor — a single flat status
  field genuinely cannot represent "vendor A shipped, vendor B hasn't" without being derived from
  something more granular.

## Two real bugs found — and how they were found

Both are documented in detail in `CLAUDE.md` so they're visible to future sessions without re-reading this
file, but the process matters as much as the fixes:

1. **Generated column immutability.** `to_tsvector('english', ...)` is immutable, but folding
   `tags`/`occasion_tags`/`recipient_tags` (all `text[]`) into the same expression via `array_to_string()`
   is not — Postgres rejected the `GENERATED ALWAYS AS (...) STORED` column outright with "generation
   expression is not immutable". Diagnosed by querying `pg_proc.provolatile` directly for the functions
   involved via `psql`, rather than guessing. Fixed by moving the same expression into a
   `BEFORE INSERT OR UPDATE` trigger, which has no immutability requirement.

2. **`SECURITY DEFINER` silently defeated the vendor self-approval guard.** This one did not show up from
   reading the SQL — it only appeared when actually simulating a vendor's authenticated session via
   `psql` (`set local role authenticated; set local request.jwt.claims = '...'`) and attempting the exact
   action the trigger was supposed to block. The first fix attempt (switching an `is_service_role()`
   helper from checking `current_user` to `session_user`) was based on an incomplete diagnosis and did
   not actually fix it — confirmed by testing again, which is what led to isolating the real cause with a
   temporary `RAISE NOTICE` inside the trigger. That showed `current_user = 'postgres'` even inside an
   `authenticated`-role session, which is standard Postgres `SECURITY DEFINER` behavior (the function
   executes with the *owner's* identity for its entire body, including nested calls) — but it means any
   trigger that itself needs to know the *real* caller's role must not be `SECURITY DEFINER`, even if it
   calls other functions that legitimately are. This is generalized as a standing rule in `CLAUDE.md` for
   future stages that add more triggers.

Neither bug was visible from a code review of the SQL alone — both needed an actual simulated request
against the live database to surface, which is why "hand-verify RLS per role in the SQL editor/via psql"
is treated as a mandatory Stage 1 step in the plan, not an optional nice-to-have.

## How to verify this stage

- `supabase migration list` (or check `supabase/migrations/`) shows 11 migrations, all applied.
- Connect via `psql` (see CLAUDE.md for the connection string pattern and PATH setup) and run
  `\dt public.*` — should show 27 tables. `select relname, relrowsecurity from pg_class where
  relnamespace='public'::regnamespace and relkind='r';` — every row should show `t`.
- Re-run the hand-verification queries described in this session's summary (simulate customer A, customer
  B, a vendor, admin, and anon inside rolled-back transactions) if there's ever doubt the policies still
  hold after a future migration — this is exactly how the two bugs above were actually caught, a policy
  read-through would not have found either one.
- `npm run seed` twice in a row — should succeed both times with identical row counts (6 categories, 1
  vendor, 4 products), confirming idempotency.
- `npm run build` — zero TypeScript errors, including `scripts/seed.ts` (it's type-checked as part of the
  project, not excluded).

## Deviations from the plan doc

None beyond what's already itemized in `CLAUDE.md`'s "Database schema" section (the richer table set,
`orders.status` as a rollup, no diary admin-bypass, etc.) — all were anticipated there as intentional
expansions, not accidental drift.
