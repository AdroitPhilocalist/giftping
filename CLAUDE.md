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
  of email/password, not a standalone login method (Supabase's native phone auth doesn't speak MSG91).
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
  (service-role, RLS-bypassing, `server-only`-guarded — server-trusted code paths only).
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
/components/layout → Navbar, Footer
/components/{shop,diary,vendor,admin} → feature components, created as each stage needs them
/lib/db         → Supabase clients + generated types + per-table query helpers
/lib/auth       → session.ts (getServerUser/requireRole), rate-limit.ts
/lib/commerce   → cart.ts, checkout.ts, commission.ts, coupons.ts
/lib/integrations → razorpay.ts, shiprocket.ts, cloudinary.ts, removebg.ts, msg91.ts, onesignal.ts, resend.ts
/lib/search     → index.ts (searchProducts — swappable Postgres FTS → Algolia)
/lib/diary      → gifting-score.ts, suggestion-matcher.ts, recurrence.ts
/lib/validation → Zod schemas, one file per domain, shared by client forms and API routes
/lib/content    → imagery.ts — central image-asset map (see "Image handoff" below)
/lib/utils      → cn.ts (clsx + tailwind-merge) and other generic helpers
/emails         → React Email templates
/jobs           → diary-reminders.ts, the Railway cron worker entrypoint
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

Confirmed gaps already identified against the SRS's baseline (see the plan doc for full detail): a
`cart`/`cart_items` pair (missing entirely from the SRS), several missing indexes, tighter RLS on
`vendor_settlements`/`payments`/`addresses`/`cart`, `orders.status` as a computed rollup over per-vendor
`shipments.status` rather than one flat field, explicit diary-cron timezone handling via a `users.timezone`
column (default `Asia/Kolkata`), and a documented DPDP anonymization policy for account deletion.

## Image handoff workflow

The client generates new reference/hero images via ChatGPT over time and hands them to the developer.
`lib/content/imagery.ts` (created in the visual-polish stage) is the single place components reference
image assets from, so swapping in a new image never requires touching component code — just update the
map and drop the file in `public/images/` (or Cloudinary).

## Progress tracking convention

- `PROGRESS.md` (repo root) — overwritten every session, not appended. Read this first, always.
- `/docs/progress/YYYY-MM-DD-stage-N-<slug>.md` — one entry per completed stage or major milestone,
  append-only, holds the "why" behind decisions.
- This file (`CLAUDE.md`) — static reference, update only when a structural/stack decision actually
  changes, not for day-to-day status.
