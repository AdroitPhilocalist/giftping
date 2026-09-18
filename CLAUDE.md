# GiftPing — Project Reference

Static conventions for this repo. This file changes rarely — for *current* build status, open-questions,
and next steps, read [`PROGRESS.md`](./PROGRESS.md) instead (and read it first, every session).

The full staged build plan this project follows lives at the developer's
`~/.claude/plans/okay-so-i-have-immutable-river.md` (not part of this repo). `/docs/progress/*.md` holds
a dated log entry per completed stage/milestone with the reasoning behind decisions made along the way.

## What this is

GiftPing is a multi-vendor gifting marketplace for India, modeled on a physical mall: the platform sells
its own "GiftPing Originals" products directly, and partner vendors also list products on commission
(default 10%, configurable per vendor/category). The signature feature is the **Personal Gifting Diary** —
a private planner logging loved ones and important dates, with automated 7-day/3-day reminder emails and
push notifications enriched with curated gift suggestions.

Source documents (kept in the repo root for reference, not code): `GIFTPING_SRS_Development_Bible.docx`,
`Feature_Specification_Gifting_Platform.docx`, and the approved visual references in `ui-references/`.

## Cost constraint — hard budget ceiling, drives real architecture choices

The client has capped ongoing third-party costs at **~₹40,000–50,000/year for APIs, ~₹60,000–70,000/year
including Vercel hosting + domain**. This isn't a soft guideline — it eliminated services from the
original plan entirely and constrains which tier of everything else is acceptable:

- **Remove.bg is cut entirely.** No automated background-removal/replacement pipeline. Vendors upload
  their own finished product photos as-is; the image pipeline (Supabase Storage + `sharp` + `next/image`,
  see below) handles optimization/delivery only, not AI editing. (Client can be offered background removal
  as a paid add-on later, e.g. a self-hosted free library or a per-image API — but it is not in scope now.)
- **Railway is cut entirely.** The Stage 9 diary-reminder cron runs as a **Vercel Cron Job** instead
  (confirmed: Pro plan supports up to 100 cron jobs/project, configurable timeout up to 300s — comfortably
  enough for a daily batch reminder job at any realistic near-term scale). This is a free-tier-of-something-
  already-being-paid-for substitution, not a corner cut — functionally equivalent for this use case.
- **Shiprocket**: use the **Lite/pay-as-you-go plan** (no fixed monthly fee), not Basic/Advanced, unless/
  until shipment volume genuinely justifies the jump (Basic ≈ ₹1,000/mo, meant for 60–100 shipments/mo).
- **OneSignal**: free tier is expected to be sufficient **specifically because this is a web-only product
  with no native mobile app** (per the SRS's own "no mobile app" scope) — OneSignal's newer 1,000-MAU cap
  applies to mobile push, not the web push this project actually uses (free web push: 10k subscribers,
  unlimited sends). If a native app is ever added later, revisit this.
- **Cloudinary is cut entirely — replaced by Supabase Storage + `sharp` + `next/image`.** This was the
  single biggest budget risk (Cloudinary's free tier is small, and its next tier alone — ~₹91,000/yr — is
  more than the *entire* API budget). The replacement uses only infrastructure already being paid for:
  raw files go to **Supabase Storage** (Pro plan includes 100GB, no extra cost), a couple of fixed sizes
  are generated server-side at upload time with **`sharp`** (free, open-source — needed for React Email
  templates, which can't use `next/image`), and on-page display optimization (WebP/AVIF, resizing) comes
  from **`next/image`** via Vercel's own image pipeline (already covered by the Vercel Pro plan). No
  Cloudinary account, no `NEXT_PUBLIC_CLOUDINARY_*` env vars, ever. `lib/integrations/cloudinary.ts` does
  not exist — see `lib/storage/` instead (built in Stage 3/4 when image upload is actually implemented).
- **Resend stays as planned** (client's explicit choice over the cheaper Brevo alternative — 3,000
  emails/month free tier, ~₹20,600/yr for the next tier if the user base grows past that; this remains
  the one real cost-growth risk left to watch, budgeted for).
- **MSG91 phone OTP is built as a feature flag**, not a hard dependency — see Stage 2 notes below. It's
  already a secondary verification step (not the primary login method), so it can be switched off without
  a code change if SMS costs run ahead of budget. If it's ever turned on, use MSG91, not Twilio via
  Supabase's built-in phone auth — Twilio's India SMS rates (~$0.0075/SMS ≈ ₹0.65) are actually *more*
  expensive than MSG91's (~₹0.15–0.20/SMS) once converted to the same currency, despite how it looks at a
  glance; Twilio prices India routes at international-carrier rates, not local ones.
- Razorpay's ~2.4% transaction fee and Shiprocket's per-shipment courier cost are **not** part of this
  budget — they scale with GMV/order volume rather than being a fixed subscription, and the courier cost
  is normally recovered from the customer via the delivery charge.
- **Net effect of the above**: realistic year-one API costs land closer to ~₹10,000–20,000/yr, well under
  the ₹40,000–50,000 ceiling — comfortable headroom, not a tight squeeze.

## Design tokens

Defined in `app/globals.css` via Tailwind v4's CSS-first `@theme`:

- `brand-primary` `#1A4731` (deep forest green), `brand-primary-dark` `#123322`
- `brand-secondary` `#C9A84C` (warm gold), `brand-secondary-dark` `#AB8B34`
- `brand-accent` `#F5ECD7` (cream)
- `brand-dark` `#1A1A1A`, `brand-light` `#FAFAF8` (page background)
- Headings: Playfair Display → Tailwind class `font-heading`. Body: Inter → `font-sans` (default).
- No automatic dark-mode variant — the brand is a fixed warm/light palette, not adaptive.
- Mascot: a robin bird (nav tagline strip, empty states, "Ask GiftPing AI" prompt, decorative cards).

## Stack decisions (deviations from the SRS, made deliberately — see plan doc for full reasoning)

- **Next.js**: latest stable (currently 16.x), App Router, TypeScript strict, no `any`. Next 16 renamed
  `middleware.ts` → `proxy.ts` ("Proxy") — use `proxy.ts` for route protection, not `middleware.ts`.
- **Tailwind v4**: CSS-first config via `@theme` in `app/globals.css`, not a `tailwind.config.ts` color
  extension (the SRS's example predates v4). No `tailwindcss-animate` plugin installed — don't use
  `animate-in`/`fade-in` utility classes until/unless it's added.
- **Auth**: Supabase Auth directly (no NextAuth.js layer). MSG91 phone OTP is a verification step on top
  of email/password, not a standalone login method (Supabase's native phone auth doesn't speak MSG91) —
  and per the cost constraint above, gated behind a feature flag (`PHONE_OTP_ENABLED` env var) so it can
  be switched off without a code change if SMS costs run ahead of budget.
- **No visual UI library** (no shadcn/MUI/Chakra) — everything in `components/ui/` is bespoke Tailwind.
  Headless/unstyled behavior primitives are fine and already wired: Radix UI (dialog, dropdown-menu, tabs,
  tooltip, slot), Sonner (toasts). Not yet installed, add when the relevant stage needs them: React Hook
  Form + Zod resolvers (forms), Embla Carousel (PDP gallery / homepage rows), react-day-picker (diary
  calendar), Upstash Redis + `@upstash/ratelimit` (rate limiting).
- **"Ask GiftPing AI" chat**: static UI routed to the rule-based diary suggestion engine — not a live LLM
  integration (deliberate scope decision, revisit later if desired).
- **Supabase API keys**: using the newer publishable/secret key format (`sb_publishable_...` /
  `sb_secret_...`) rather than the legacy anon/service_role JWTs — Supabase's own drop-in replacement,
  same env var names (`NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`) still used for
  continuity with the SRS's naming. `lib/db/client.ts` (browser), `lib/db/server.ts` (Server
  Components/Actions/Route Handlers, via `@supabase/ssr` + `next/headers` cookies), `lib/db/admin.ts`
  (service-role, RLS-bypassing, `server-only`-guarded — server-trusted code paths only). All three are
  generic over `lib/db/types.ts` (generated — regenerate with `npm run db:types` after any schema change,
  never hand-edit it).
- **Supabase CLI + Postgres client**: the CLI (`supabase`, via `brew install supabase/tap/supabase`) is
  linked to the remote project (`supabase link`) using a personal access token (`supabase login --token`)
  — the DB password alone isn't enough for `link`/`gen types`, only for `db push --password`. A `psql`
  client was also installed (`brew install libpq`, then `export PATH="/opt/homebrew/opt/libpq/bin:$PATH"`
  — it's keg-only, not symlinked by default) for hand-verifying RLS policies directly, which is
  significantly more reliable than reasoning about policy SQL from reading it: simulate a specific
  user/role with `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}';` inside
  a transaction, run the query, then `rollback;` — never `commit` a manual verification session. Both
  credentials (Supabase PAT, DB password) were provided once for initial setup and are not stored
  anywhere in this repo; a future session needing to run migrations again will need to ask the developer
  for them afresh (or use whatever the developer has cached locally, e.g. `supabase login` state).
- **Sentry**: wired via the modern `instrumentation.ts` + `instrumentation-client.ts` convention (not the
  older `sentry.client.config.ts` + `_app.tsx` pattern) — see those files plus `sentry.server.config.ts` /
  `sentry.edge.config.ts` / `app/global-error.tsx`. Only enabled when `NODE_ENV === "production"`, so
  nothing reports from local dev. `next.config.ts` wraps the config with `withSentryConfig` from
  `@sentry/nextjs/config` (not the deprecated `@sentry/nextjs` root export); source-map upload to Sentry
  is skipped until a `SENTRY_AUTH_TOKEN` is set at go-live — error capture works fine without it.
- **Mall experience**: illustrated + Framer Motion (`motion` package, not yet installed) animated pages
  using AI-generated imagery from `ui-references/` and future client-supplied images — not a real 3D/WebGL
  scene.

## Folder structure

```
/app            → routes: (shop) customer routes, (auth), /vendor, /admin, /api, /kitchen-sink (dev only)
/components/ui  → bespoke Tailwind primitives: Button, Card, Input/Textarea/Label, Select, Badge, Modal,
                  Dropdown, Tabs, Tooltip, Toast, Skeleton, Spinner
/components/layout → Navbar, Footer, AccountMenu (role-aware, reads session server-side)
/components/auth → GoogleButton, SubmitButton (useFormStatus-based pending state)
/components/{shop,diary,vendor,admin} → feature components, created as each stage needs them
/lib/db         → Supabase clients + generated types + per-table query helpers
/lib/auth       → session.ts (getServerUser/requireRole — always re-reads role from the DB), actions.ts
                  (Server Actions: sign-up/in/out, Google OAuth, password reset), rate-limit.ts
                  (Upstash — fails open/no-ops if not configured, never blocks on a missing dev credential)
/lib/commerce   → cart.ts, checkout.ts, commission.ts, coupons.ts
/lib/integrations → razorpay.ts, shiprocket.ts, msg91.ts, onesignal.ts, resend.ts (no cloudinary.ts or
                  removebg.ts — both cut per the cost constraint above)
/lib/storage    → upload.ts (Supabase Storage), resize.ts (sharp — fixed sizes for email templates,
                  which can't use next/image). Display-time optimization is next/image, not a lib file.
/lib/search     → index.ts (searchProducts — swappable Postgres FTS → Algolia)
/lib/diary      → gifting-score.ts, suggestion-matcher.ts, recurrence.ts
/lib/validation → Zod schemas, one file per domain, shared by client forms and API routes
/lib/content    → imagery.ts — central image-asset map (see "Image handoff" below)
/lib/utils      → cn.ts (clsx + tailwind-merge) and other generic helpers
/emails         → React Email templates
/app/api/cron   → diary-reminders/route.ts, invoked by Vercel's Cron scheduler (vercel.json) — not a
                  separate /jobs directory or a Railway worker, per the cost constraint above
/scripts        → seed.ts and one-off scripts
/supabase/migrations → schema migrations, applied in order
/public/images
/docs/progress  → dated per-stage log entries
```

`/vendor` and `/admin` are real route segments (not `(group)`s) since they need their own persistent
sidebar layout. `(shop)` and `(auth)` are route groups purely for organization.

## Database schema

The SRS's table list is a **floor, not a ceiling** — the developer explicitly wants richer data capture
(more tables/fields) wherever it improves the customer experience or gives the admin better analytics, not
a minimal schema. Add tables/fields freely as real needs surface; don't force new data into `jsonb` blobs
just to avoid a migration. The non-negotiable constraint is RLS on every table and no unnecessary PII
exposure — richness of data and tightness of access control both apply fully, always.

**Implemented in Stage 1** (27 tables, all RLS-enabled — see `supabase/migrations/` for the authoritative
definitions, and `docs/progress/2026-09-18-stage-1-database-schema-rls.md` for full reasoning): the SRS's
full table list, plus `cart`/`cart_items` (missing from the SRS entirely), `product_images` /
`product_variants` / `product_qna` as dedicated tables instead of a jsonb blob, `coupon_redemptions` (for
enforceable per-user coupon limits), `loyalty_ledger` ("GP Rewards", referenced in the UI), `audit_logs`,
`notification_preferences`. `products.vendor_id` is `NOT NULL` — in-house products belong to a real seeded
"GiftPing Originals" vendor row (`is_in_house = true`, 0% commission) rather than allowing a null vendor.
`orders.status` is a coarse rollup automatically recomputed from per-vendor `shipments.status` by a
trigger (`recompute_order_status()`) — never set directly. `public.users.id` references `auth.users(id)`
directly (Supabase Auth is the identity source of truth) via an auto-provisioning trigger
(`handle_new_auth_user()`) — there's no separate signup-time insert to write. Coupon validity is checked
exclusively through a `validate_coupon()` RPC, not raw table SELECT, so codes can't be enumerated by
customers. **The Personal Gifting Diary tables (`diary_contacts`/`diary_events`/`gift_history`)
deliberately have NO admin RLS bypass** — this is the one place `is_admin()` is intentionally absent,
matching the SRS's explicit privacy promise that admins see only an aggregate count, never diary content.
Full-text search (`products.search_vector`) is trigger-maintained, not a generated column — see the "Two
real Postgres bugs" note below for why. `users.timezone` (default `Asia/Kolkata`) is in place for the
Stage 9 diary cron. DPDP-style deletion uses `users.deleted_at`/`anonymized_at` rather than a hard delete.

### Two real Postgres bugs hit and fixed while building this (worth knowing before writing more RLS/triggers)

1. **A `GENERATED ... STORED` column must be strictly IMMUTABLE.** `array_to_string()` (used to fold
   `tags`/`occasion_tags`/`recipient_tags` into the search vector) is only `STABLE`, so
   `search_vector` couldn't be a generated column — it's a plain column kept in sync by a
   `BEFORE INSERT OR UPDATE` trigger (`products_set_search_vector()`) instead, which has no such
   restriction and behaves identically from the caller's side.
2. **`SECURITY DEFINER` masks `current_user` for the function's entire body, including nested calls.**
   The four ownership-enforcement triggers (`prevent_role_self_escalation`,
   `prevent_vendor_admin_field_tampering`, `enforce_product_status_transitions`,
   `enforce_review_update_scope`) were originally declared `SECURITY DEFINER`, which made
   `current_user` read as the function's *owner* (`postgres`) for every caller — silently letting a
   vendor's own authenticated session self-approve their own product or escalate their own role, since
   the "is this a trusted service-role context?" check (`is_service_role()`, which reads `current_user`)
   was always true from inside them. Fixed by making those four functions `SECURITY INVOKER` (they don't
   need elevated rights themselves — they only inspect `NEW`/`OLD` and delegate to already-privileged
   helpers like `is_admin()`), leaving `current_user` correctly reflecting the real caller
   (`authenticated`/`anon`/`service_role`). **Rule of thumb going forward: a trigger function that reads
   `current_user`/`session_user` to distinguish "trusted server" from "ordinary client" must never itself
   be `SECURITY DEFINER`,** or that distinction silently stops working — verified by hand-testing as a
   simulated vendor session (`SET LOCAL ROLE authenticated` + `request.jwt.claims`), not by reasoning
   about the SQL alone.

Also: a bare `CREATE TABLE` in this schema is **not** independently queryable by `anon`/`authenticated`
merely because an RLS policy allows it — Postgres denies access at the GRANT level first, before RLS
policies are even consulted. `supabase/migrations/20260917181523_grant_table_privileges.sql` grants the
baseline `SELECT/INSERT/UPDATE/DELETE` table privileges (Supabase's Studio does this automatically for
tables created through its UI; a raw SQL migration via the CLI does not) that every RLS policy in this
project depends on to have any effect at all.

## Auth

`lib/auth/session.ts` (`getServerUser`/`requireRole`) and `proxy.ts` are two independent layers —
`proxy.ts` is an *optimistic* UI-level redirect (fast, better UX, matches Next's own docs on this
pattern), `requireRole()` is the actual enforcement, re-reading role from the DB every time. This was
deliberately verified as two independent layers in Stage 2 (temporarily disabled `proxy.ts`'s admin check
and confirmed `requireRole()` alone still blocked a customer session) — don't assume one makes the other
redundant when adding new protected routes; every protected Server Component/Server Action/Route Handler
still needs its own `requireRole()` call.

Two things worth knowing before touching auth UI again:
- **A `<button type="submit">` inside a Radix `DropdownMenu.Item` does not reliably submit its wrapping
  `<form>`** — Radix intercepts the click for its own selection/close handling first. Confirmed by
  hand-testing (`AccountMenu`'s sign-out silently did nothing until fixed). Use `onSelect` on the
  `DropdownMenu.Item` to call a Server Action directly instead (Server Actions are plain async functions —
  calling them directly from a client event handler works exactly like a form action does).
- **Supabase's default/shared SMTP has a strict built-in rate limit on auth emails** (confirmed by
  hitting `429 over_email_send_rate_limit` during ordinary manual testing in Stage 2). This is expected to
  bite again anywhere real signups/password-resets get tested repeatedly, and **must be fixed with custom
  SMTP before go-live** or real users will hit it too — Resend (already planned for Stage 9) is the
  natural fit. For local testing without waiting on real email, create confirmed accounts directly via
  the Supabase admin client (`auth.admin.createUser({ email_confirm: true, ... })`) rather than going
  through the UI signup flow.

Test accounts exist in the dev database for exactly this reason — `test-customer@giftping.test`,
`test-vendor@giftping.test`, `test-admin@giftping.test`, all password `TestPass123!`. Not real user data;
reuse them for manual testing in later stages rather than creating new ones each time, and delete them
before go-live.

## Image handoff workflow

The client generates new reference/hero images via ChatGPT over time and hands them to the developer.
`lib/content/imagery.ts` (created in the visual-polish stage) is the single place components reference
image assets from, so swapping in a new image never requires touching component code — just update the
map and drop the file in `public/images/` (static site imagery — logo, hero art, illustrations) or upload
it to Supabase Storage (user/vendor-generated content — product photos, avatars). See the "Cost
constraint" section above and `/lib/storage` for the image pipeline itself.

## Progress tracking convention

- `PROGRESS.md` (repo root) — overwritten every session, not appended. Read this first, always.
- `/docs/progress/YYYY-MM-DD-stage-N-<slug>.md` — one entry per completed stage or major milestone,
  append-only, holds the "why" behind decisions.
- This file (`CLAUDE.md`) — static reference, update only when a structural/stack decision actually
  changes, not for day-to-day status.
