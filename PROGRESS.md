# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

**Stage 0 — Repo, Tooling & Design System Foundation** (in progress)

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
  `app/page.tsx`.
- Added `app/kitchen-sink/page.tsx` — a dev-only route exercising every primitive, used to verify the
  design system renders correctly.
- `npm run build` passes clean (zero TS errors).
- Installed foundational deps: Radix primitives, Sonner, clsx/tailwind-merge, lucide-react,
  `@supabase/supabase-js` + `@supabase/ssr` (not yet wired to a real project — see blockers).
- Installed the GitHub CLI (`gh`, via Homebrew) and started the device-code web login flow.
- Wrote `CLAUDE.md` (static reference — read it for the stack deviations from the SRS: Supabase Auth
  direct, Tailwind v4, Next 16's `proxy.ts` instead of `middleware.ts`, no visual UI library, etc.).
- Wrote `.env.example` listing every credential this whole build will need, each tagged with the stage
  it's first needed at — nothing is requested before it's actually required.
- Updated `.gitignore` (`.claude/settings.local.json` excluded, `.env.example` explicitly un-ignored).

## Next Up

1. **Finish `gh auth login`** (waiting on the developer — see Open Questions/Blocked On) — then
   `gh repo create giftping --private --source=. --remote=origin` and push the initial commit.
2. Git `init` + first commit of everything currently in the working tree (scaffold + design system +
   `PROGRESS.md`/`CLAUDE.md`/`.env.example` + the pre-existing `ui-references/`/`.docx` source docs).
3. Once a Supabase project + Sentry DSN are provided: fill real values into `.env.local` (copied from
   `.env.example`, gitignored), wire the Supabase client (`lib/db/client.ts`) and Sentry SDK, confirm the
   Stage 0 "done when" — `/kitchen-sink` at 375px + desktop, `npm run build` clean, repo pushed.
4. Move on to **Stage 1 — Database Schema & RLS**: write the Supabase migrations (SRS's tables + the
   confirmed additions — `cart`/`cart_items`, missing indexes, tighter RLS, `orders.status` rollup,
   `users.timezone`, DPDP anonymization fields), generate TS types, write and manually verify RLS per
   role, write the seed script.

## Open Questions / Blocked On

- **GitHub auth**: `gh auth login --web` is running; the developer needs to open
  `https://github.com/login/device` and enter the one-time code shown in that terminal session to finish
  it (the code is single-use and time-limited, so if this is read later, just re-run
  `gh auth login --hostname github.com --git-protocol https --web` and use the new code).
- **Repo visibility/name**: assuming a private repo named `giftping` — confirm with the developer before
  `gh repo create`, or adjust if they'd rather name/scope it differently.

## Credentials Status

| Integration | Needed at | Status |
|---|---|---|
| GitHub | Stage 0 | 🟡 CLI installed, auth in progress |
| Supabase (URL/anon/service-role) | Stage 0 | 🔴 not yet provided |
| Sentry DSN | Stage 0 | 🔴 not yet provided |
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
