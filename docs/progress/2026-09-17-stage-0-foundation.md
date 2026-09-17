# Stage 0 — Repo, Tooling & Design System Foundation

**Completed:** 2026-09-17

## What was built

- Next.js scaffold (16.3.5, App Router, TypeScript strict, Tailwind v4) merged into the existing project
  root alongside the pre-existing source documents and `ui-references/`.
- Brand design tokens in `app/globals.css` via Tailwind v4's CSS-first `@theme` (colors, Playfair Display
  + Inter fonts).
- Bespoke component library in `components/ui/`: Button, Card, Input/Textarea/Label, Select, Badge,
  Modal, Dropdown, Tabs, Tooltip, Toast, Skeleton, Spinner — built on headless Radix UI primitives and
  Sonner, with zero visual UI library dependency, per the client's "bespoke, non-generic" brief.
- `components/layout/Navbar.tsx` / `Footer.tsx` shells and a wired `app/layout.tsx`.
- `app/kitchen-sink/page.tsx` as a living, dev-only reference for every primitive.
- Supabase wired three ways (`lib/db/client.ts` browser, `lib/db/server.ts` server, `lib/db/admin.ts`
  service-role) and Sentry wired via the current `instrumentation.ts`/`instrumentation-client.ts`
  convention.
- `PROGRESS.md`, `CLAUDE.md`, `.env.example`, and a GitHub repo, all as the cross-laptop handoff
  mechanism described in the build plan.

## Key decisions and why

- **Tailwind v4 over v3**: `create-next-app@latest` now defaults to v4, which uses CSS-first `@theme`
  config instead of `tailwind.config.ts`. The SRS's config example predates v4. Went with what's current
  rather than fighting the scaffold tool's default, since the plan already called for "latest stable"
  across the stack.
- **Next.js 16's `proxy.ts` instead of `middleware.ts`**: Next 16 renamed the convention (same
  functionality, per Next's own docs bundled in `node_modules/next/dist/docs/`). Route protection in
  Stage 2 will use `proxy.ts`.
- **Supabase's new publishable/secret API keys** instead of legacy anon/service_role JWTs: Supabase's own
  documented drop-in replacement, and the legacy format is being phased out. Kept the SRS's original env
  var names (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) so the rest of the SRS's
  references to those names still line up.
- **GitHub auth via Personal Access Token instead of the device-flow web login**: the device flow failed
  three times in a row with an identical low-level network timeout polling GitHub's token endpoint on
  this connection. Rather than keep retrying the same broken path, switched to `gh auth login --with-token`,
  which only needs one request. Worth remembering if `gh auth login --web` is attempted again on this same
  network.
- **Sentry only enabled in production** (`enabled: process.env.NODE_ENV === "production"` in all three
  init calls): avoids noisy/irrelevant error reports from local development while still having the wiring
  fully in place for when it matters.

## How to verify this stage

- `npm run dev`, visit `/` and `/kitchen-sink` — both should render the forest-green/gold/cream brand
  theme with Playfair Display headings, and every primitive on the kitchen-sink page should be
  interactive (Modal opens/closes, Dropdown opens, Toast fires, Tabs switch).
- `npm run build` should complete with zero TypeScript errors.
- `git log` should show the repo pushed to `https://github.com/AdroitPhilocalist/giftping`.
- Supabase connectivity was verified this session via a temporary `/api/health-check` route (since
  deleted) calling `auth.admin.listUsers()` with the service-role client — returned
  `{"ok":true,"userCount":0}`. Re-verify similarly (or just proceed into Stage 1, which will exercise it
  for real via actual schema/queries) if there's ever doubt the keys still work.
- Sentry's wiring has **not** been verified against the live dashboard yet (it's inactive outside
  production by design) — worth a one-time manual check at Stage 13 (go-live) or sooner if desired, by
  temporarily flipping `enabled: true` and forcing a test error.

## Deviations from the plan doc

None beyond what's already itemized in `CLAUDE.md`'s "Stack decisions" section (Tailwind v4, Next 16's
`proxy.ts`, Supabase's new key format) — all anticipated there, none discovered fresh this session.
