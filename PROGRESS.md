# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

**Stage 0 — Repo, Tooling & Design System Foundation** ✅ complete. Next session should start Stage 1.

## Last Session Summary

- Read all three source documents in full (SRS, feature spec, `ui-references/`) and produced the complete
  staged build plan (14 stages, expandable) — approved by the developer.
- Scaffolded the Next.js app (latest stable = 16.3.5, App Router, TypeScript strict, Tailwind v4) into the
  existing project root, alongside the pre-existing `ui-references/` and the two `.docx` source documents.
- Design tokens wired in `app/globals.css` via Tailwind v4's `@theme` (brand colors, Playfair Display +
  Inter fonts via `next/font/google`).
- Built the full Stage 0 component library in `components/ui/`: Button (incl. `asChild` via Radix Slot),
  Card, Input/Textarea/Label, Select, Badge, Modal (Radix Dialog), Dropdown (Radix DropdownMenu), Tabs
  (Radix Tabs), Tooltip (Radix Tooltip), Toast (Sonner), Skeleton, Spinner.
- Built `components/layout/Navbar.tsx` and `Footer.tsx` shells (nav items link to routes that don't exist
  yet — expected until Stage 3+).
- Wired `app/layout.tsx` (fonts, Navbar/Footer/Toaster/TooltipProvider) and a placeholder branded
  `app/page.tsx`. Verified in-browser at both 375px and desktop; fixed one bug found while checking
  (Button text wrapping at narrow widths — switched fixed height to min-height + padding).
- Added `app/kitchen-sink/page.tsx` — a dev-only route exercising every primitive; manually verified
  Modal open/close, Dropdown, Tabs, and Toast all work correctly in-browser.
- `npm run build` passes clean (zero TS errors) throughout.
- **GitHub**: repo created and pushed — **https://github.com/AdroitPhilocalist/giftping** (private).
  `gh auth login --web` hit a repeated network-level failure on this connection (`read tcp ...: operation
  timed out` polling GitHub's device-flow endpoint, 3 attempts) — worked around with
  `gh auth login --with-token` using a developer-supplied PAT (scopes `repo` + `read:org`). If device-flow
  web login is needed again on this network, expect it may need the same `--with-token` fallback.
  **The developer was advised to revoke/regenerate that PAT** once initial setup settled, since it was
  shared in a chat transcript rather than entered directly into a prompt.
- **Supabase**: project connected — `https://qrcienpokiaplhtubtho.supabase.co`. Using Supabase's newer
  `sb_publishable_...` / `sb_secret_...` key format (drop-in replacement for the legacy anon/service_role
  JWTs, which Supabase is deprecating) stored under the SRS's original env var names for continuity.
  Wired `lib/db/client.ts` (browser), `lib/db/server.ts` (server, `@supabase/ssr` + `next/headers`,
  `server-only`-guarded), `lib/db/admin.ts` (service-role, RLS-bypassing, `server-only`-guarded).
  Verified connectivity end-to-end with a temporary `/api/health-check` route calling
  `auth.admin.listUsers()` with the admin client — got `{"ok":true,"userCount":0}` — then deleted the
  route (Stage 1 will add real tables/queries to verify against instead).
- **Sentry**: wired via the current `instrumentation.ts` + `instrumentation-client.ts` convention (not the
  older `sentry.client.config.ts` pattern) — `sentry.server.config.ts`, `sentry.edge.config.ts`,
  `app/global-error.tsx` all added; `next.config.ts` wrapped with `withSentryConfig` from
  `@sentry/nextjs/config`. Only active when `NODE_ENV === "production"` (silent in local dev by design).
  Source-map upload to Sentry needs a `SENTRY_AUTH_TOKEN` — deferred to Stage 13 (go-live), error capture
  works without it. Not yet verified against the live Sentry dashboard (would need a production deploy or
  a forced error while temporarily flipping `enabled: true` — not done this session).
- Wrote `CLAUDE.md` (static reference) and `.env.example` (every credential, tagged by the stage it's
  first needed at) and `.gitignore` updates (`.claude/settings.local.json` excluded, `.env.example`
  explicitly un-ignored). `.env.local` holds the real Supabase/Sentry values now — confirmed gitignored,
  never committed.
- Created `.claude/launch.json` so `npm run dev` can be previewed via the browser tool going forward.

## Next Up

Start **Stage 1 — Database Schema & RLS**: write the Supabase migrations under `supabase/migrations/`
(SRS's full table list + the confirmed additions — `cart`/`cart_items`, missing indexes, tighter RLS on
`vendor_settlements`/`payments`/`addresses`/`cart`, `orders.status` as a computed rollup over
`shipments.status`, `users.timezone` for the diary cron, DPDP anonymization fields — see `CLAUDE.md`'s
"Database schema" section, remembering it's a floor not a ceiling), generate TS types via
`supabase gen types typescript`, write and manually verify RLS per role (customer/vendor/admin) in the
Supabase SQL editor, write an idempotent `scripts/seed.ts`. The Supabase CLI isn't installed yet — install
it first to manage migrations properly rather than pasting SQL by hand into the dashboard every time.

## Open Questions / Blocked On

- Nothing currently blocking. Stage 1 needs no new credentials (Supabase project already connected).

## Credentials Status

| Integration | Needed at | Status |
|---|---|---|
| GitHub | Stage 0 | ✅ done — repo at https://github.com/AdroitPhilocalist/giftping |
| Supabase (URL/anon/service-role) | Stage 0 | ✅ done — connectivity verified |
| Sentry DSN | Stage 0 | 🟡 wired, not yet verified against live dashboard |
| Google OAuth | Stage 2 | 🔴 not needed yet |
| MSG91 | Stage 2 | 🔴 not needed yet |
| Cloudinary | Stage 3 | 🔴 not needed yet |
| Remove.bg | Stage 4 | 🔴 not needed yet |
| Upstash Redis | Stage 2 (reused later) | 🔴 not needed yet |
| Razorpay (test) | Stage 7 | 🔴 not needed yet |
| Shiprocket (sandbox) | Stage 8 | 🔴 not needed yet |
| Resend | Stage 9 | 🔴 not needed yet |
| OneSignal | Stage 9 | 🔴 not needed yet |
| Railway | Stage 9 | 🔴 not needed yet |
