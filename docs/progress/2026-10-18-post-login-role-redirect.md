# Post-login redirect sent people where they can't go — and the nav bar lied (18 Oct 2026)

Two separate bugs, fixed together because both are "the screen and the URL disagreed".

## Bug 1 — sign in from a page you were kicked off, land on the home page with the wrong URL

**Report:** sign in, and the browser shows the home page while the address bar still reads the page you
were trying to reach (a `/vendor/...` page, as a customer). A hard refresh corrects it.

**The chain, traced through the code:**

1. A signed-out visitor opens `/vendor/dashboard`. `proxy.ts` bounces them to
   `/sign-in?redirectTo=%2Fvendor%2Fdashboard` — correct so far, it just remembers where they wanted to go.
2. They sign in as a **customer**. `signInAction` (`lib/auth/actions.ts:134`) did
   `redirect(safeRedirectPath(formData.get("redirectTo")))`. `safeRedirectPath` only guarantees the target is
   **same-site** — it says nothing about whether *this user* may open it. So it handed the customer
   `/vendor/dashboard`.
3. The browser navigates there, `proxy.ts` sees a signed-in user whose role is `customer` on a vendor route,
   and returns a **307 → `/`** (`proxy.ts:159-161`).
4. That 307 happens on an **RSC fetch during a soft navigation**, so the client router follows it *silently*
   and renders `/` while `window.location` keeps the URL the server redirected *away* from. This is a known
   Next.js case (commented in `node_modules/next/dist/client/components/router-reducer/ppr-navigations.js`,
   issue #95195), not a bug in our middleware.

So the app's own redirect target was the trigger. The fix belongs where the target is chosen, not in the
middleware.

**Fix:** `postLoginPath(value, role, fallback)` in `lib/auth/redirect.ts` — `safeRedirectPath` first (same-site
guarantee, unchanged), then a **role check**: `/admin/*` needs `admin`; the `/vendor/*` *portal* needs
`vendor` or `admin`; anything else is free. If the target is out of reach, it returns the fallback (`/`) so the
browser is only ever sent somewhere the middleware will actually let it land. The role is read **from the
database** after sign-in — never from a client-supplied claim.

`signInAction` now reads `users.role` and resolves through it; `app/auth/callback/route.ts` (OAuth / email
links, where `next` is equally attacker-supplied) does the same, and only pays for the extra read when the
target is actually a portal.

To stop the two from drifting, the route predicates moved out of `proxy.ts` into **`lib/auth/paths.ts`**, now
shared by the middleware and the redirect resolver. That drift is exactly what caused a previous routing bug
(`startsWith("/vendor")` also matching the public `/vendors/*` storefronts — see
`docs/progress/2026-09-18-stage-3-catalog.md`), so the predicates get their own tests now.

**Verified** on a real production build (`next start`) with headless Brave, one sign-in per case (the auth rate
limit is 5/min per IP — a first run tripped it and looked like a failure):

| case | expected | result |
| --- | --- | --- |
| customer bounced off `/vendor/dashboard` | `/` | ✅ URL and page agree |
| customer bounced off `/admin/dashboard` | `/` | ✅ |
| customer heading to `/account/profile` (control) | `/account/profile` | ✅ destination still honoured |
| vendor bounced off `/vendor/dashboard` | `/vendor/dashboard` | ✅ |
| admin bounced off `/admin/dashboard` | `/admin/dashboard` | ✅ |

## Bug 2 — "the bar went in full, but it did not go"

**Report:** the top progress bar fills up, then the page still doesn't change for several seconds.

**Cause:** the bar **plateaued**. `.gp-progress[data-phase="loading"] .gp-progress-bar` was
`transform: scaleX(0.85)` with a `4.2s` transition — so after ~4s it stopped moving and sat at 85%, which
reads as *finished*. A real 5–10s navigation therefore spent half its life looking done. (The arrive effect,
`data-phase="done"`, is a separate thing and only fires when the route actually changes — so the bar was
never *lying about the route*, it was lying about *progress*.)

**Fix:** the bar now runs a `gp-progress-creep` keyframe animation that **deliberately never reaches the
end** while pending — it keeps moving the whole time and tops out at `scaleX(0.9)` only if a navigation has
somehow been pending for 20s (the 12s safety reset in `NavProgress` normally fires first). Under
`prefers-reduced-motion: reduce` the blanket rule collapses animations to nothing, which would have parked it
on the final keyframe (i.e. looking finished again) — so it is explicitly parked at a **stable 0.5** instead.

**Measured** (headless Brave, production build, sampling the computed `scaleX`):

| t | 0.3s | 2s | 4.2s | 10s | 19s | 22s |
| --- | --- | --- | --- | --- | --- | --- |
| before | — | — | **0.85 (flat)** | 0.85 | 0.85 | 0.85 |
| after | 0.12 | 0.32 | **0.53** | 0.71 | 0.90 | 0.90 |

Monotonic, never reads as complete; `data-phase="done"` still snaps to 1; reduced motion holds 0.5.

## Checks

`npx tsc --noEmit` clean, `npx eslint` clean, **580/580** tests (15 new: `lib/auth/redirect.test.ts`,
`lib/auth/paths.test.ts`), `npm run build` clean.
