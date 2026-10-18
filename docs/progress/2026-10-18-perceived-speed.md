# Perceived speed: skeletons, a top bar and a pending dot (18 Oct 2026)

## The complaint

In production (Vercel, Hobby), clicking a link or button sometimes took 5–10 seconds to move, with **no visible
sign the click had registered** — so people clicked again. Locally it felt fast.

## Why (measured, not guessed)

- **Every route is dynamically rendered.** `npm run build` shows `ƒ` for all ~70 routes — no `○`, no ISR. The root
  layout awaits `getServerUser()` (cookies) **and** `headers()` (the per-request CSP nonce), either of which opts
  the whole app out of static rendering. So there is no CDN cache and no useful prefetch.
- **Every navigation pays ~4 sequential Supabase round-trips before the page's own data**: `proxy.ts`'s
  `auth.getUser()` → the layout's `getServerUser()` (a *second* `auth.getUser()` + a `users` select) → the theme's
  `site_themes` select → the page's own query. `getUser()` validates the JWT over the network, so it is not free.
- **There was almost no `loading.tsx`** (only `/diary`). Without a loading boundary for a route, the App Router
  keeps the OLD page on screen until the new RSC payload is ready — no spinner, no change. That is precisely
  "I clicked and nothing happened."
- **Nothing was cached client-side.** Next 15+ defaults `staleTimes.dynamic` to `0`, so even a back/forward or a
  re-visit re-ran the whole server render.
- Cold starts (Hobby) and, likely, a Vercel function region far from the Supabase region inflate each of those
  round-trips. Sentry also traces 100% of requests in production.

## What was implemented (the perceived-speed layer)

Deliberately the cheap, safe, high-leverage trio — real latency removal comes next (see below).

### 1. Route skeletons — `loading.tsx`

- `app/loading.tsx` (generic), `app/(shop)/loading.tsx` (heading + card grid), `app/(auth)/loading.tsx` (form
  column), `app/admin/loading.tsx` (heading + table). `/diary` keeps its own.
- Each is content-only (the header/footer are the root layout's, so they stay put), built from the existing
  `components/ui/Skeleton.tsx`, and announces itself with an `sr-only` `role="status"` + `aria-busy`.
- This is the single biggest win: the skeleton paints the instant the RSC response begins streaming.

### 2. `NavProgress` — the top bar

`components/motion/NavProgress.tsx`, mounted once in `app/layout.tsx` (inside `<Suspense>` because it reads
`useSearchParams`). The App Router exposes **no** navigation events, so it infers them:

- **start** — a capture-phase `click` on any same-origin `<a>` that leads somewhere other than the current
  URL (skips modified clicks, `target`, `download`, `#`, and same-URL no-ops);
- **finish** — the route actually changing (`pathname` or query string), then snap to 100% and fade;
- a **12s safety timer** guarantees it can never stick if a click is intercepted and prevented after the fact.

Styles: `.gp-progress` / `.gp-progress-bar` in `globals.css` — a 2px gold bar at `top: 0`, `z-index: 45` (above the
header pill's `z-40`, below dialogs' `z-50`), creeping to 85% while loading. `position: fixed` + `pointer-events:
none`, so it never shifts anything. `aria-hidden` (the skeletons carry the accessible state).

### 3. `LinkPending` — the nav dot

`components/motion/LinkPending.tsx` uses Next 15.3+'s `useLinkStatus()` (from `next/link`) and must be rendered
**inside** the `<Link>` — so it rides the six main nav links in `NavLinks.tsx`. It is **absolutely positioned** in
the pill's top-right corner on purpose: the header row is width-guarded and every pixel counts, so a reserved
inline slot was not an option. It waits ~120ms before showing, so a fast hop never flashes it.

### 4. `experimental.staleTimes`

`next.config.ts`: `{ dynamic: 30, static: 180 }`. Re-visits and back/forward now come from the client cache
instantly. Safe because every mutating Server Action/route already calls `revalidatePath` (verified: 40+ call
sites), which evicts the affected cached segment.

## Verified

- `tsc`, `eslint`, **565/565 tests**, `next build` all clean; the build lists `· staleTimes` as an enabled
  experimental feature (no "invalid config" warning).
- **Live, with the DevTools protocol** (Brave headless, 1440px, `Network.emulateNetworkConditions` at 2500ms
  latency to mimic a cold production function), clicking the "Occasions" nav link:
  `t≈600–2200ms` → `phase: loading`, `pendingDot: true`, still on `/mall` (bar + dot give feedback during the
  network wait); `t≈3000ms` → `phase: done`, `aria-busy` skeleton visible, `role=status` "Loading…", path
  `/categories`; then the real page. Screenshots confirm the skeleton (header/footer intact) and the full-width
  gold bar at the very top edge.
- Not verified here: the *feel* of the bar/dot animation (needs a real mouse), and the real production cold-start
  numbers.

## Deliberately NOT done yet (the actual latency — next slice)

These cut real milliseconds and are independent of the above:

1. **Match the Vercel function region to the Supabase region** (`vercel.json` `regions`) — biggest single win.
2. **Stop verifying the session twice** — `getClaims()` (local JWT verification) instead of `getUser()` in
   `proxy.ts`/`session.ts`.
3. **Cache the theme schedule** (`getScheduledThemeId`) with `"use cache"`/`unstable_cache` + a short revalidate.
4. **Sentry `tracesSampleRate` 1.0 → ~0.1** in all three configs.
5. Longer term: **Partial Prerendering** (`cacheComponents`) so a static shell streams from the CDN.

Note: Server Action buttons (sign-in, add-to-cart) do **not** change the URL, so the top bar intentionally does
not fire for them — they are already covered by `useFormStatus` in `components/auth/SubmitButton.tsx`.
