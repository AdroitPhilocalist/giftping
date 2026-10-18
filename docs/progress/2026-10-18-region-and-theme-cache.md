# Production latency, items 1, 3 and 4: the Tokyo region, a cached theme schedule, and Sentry trace sampling (18 Oct 2026)

Three of the five solutions listed in `docs/progress/2026-10-18-perceived-speed.md`: **1** (region
alignment), **3** (cache the theme schedule) and **4** (lower Sentry's trace sampling). 1 and 3 were chosen
because they cut *every* request rather than one screen; 4 was done for the same reason — it removes work
from every request instead of adding a feature. Item **2** (`getClaims()` instead of the doubled
`getUser()`) was explained to the developer and deliberately **not** applied — see the note at the end.

## What was actually slow

Every route in this app is `ƒ` (dynamic): the root layout awaits `cookies()` and a per-request CSP nonce, so
there is no static/ISR/CDN cache anywhere and a navigation costs a full server render. That render makes
**~4 sequential Supabase round trips** before the page's own data:

1. `proxy.ts` — `auth.getUser()` (a network call to the Auth server).
2. The root layout's `getServerUser()` — a **second** `auth.getUser()` plus a `users` select.
3. `getActiveTheme()` → `getScheduledThemeId()` — a `site_themes` select, on **every** render and every
   prefetch.
4. Then the page's own query.

Each of those was also crossing the Pacific twice, which is where item 1 came in.

## Item 1 — pin the functions to the Supabase region

Vercel defaults every function to **`iad1` (Washington, D.C.)**. The Supabase project is in
**`ap-northeast-1` (Tokyo)**. So each of the ~4 round trips per render was going
function → Washington → Tokyo → Washington → function, and they are sequential, so the legs add up rather
than overlap.

`vercel.json` now carries:

```json
"regions": ["hnd1"]
```

`hnd1` is Vercel's Tokyo region — physically the same city as the Supabase project, so those round trips
stop crossing the ocean. Notes that matter for later:

- **Hobby allows exactly one region** (Pro raises the limit to 5), and deploying with more than the plan
  allows fails before the build runs. One entry is the correct shape for the current plan.
- The crons in the same file now also run in Tokyo. They are batch jobs talking to the same database, so
  that is an improvement too.
- **Routing Middleware is deployed to all regions regardless of this setting** (fewer on Hobby). So this
  does *not* cover `proxy.ts`'s own `auth.getUser()` — that is one more reason item 2 is worth doing
  (local JWT verification, no network at all, from wherever the middleware happens to run).

## Item 3 — cache the theme schedule across requests

`getActiveTheme()` runs from the **root layout**, so `getScheduledThemeId()`'s `site_themes` select was paid
on every request *and* on every prefetch. The chosen theme changes at most a few times a year, so this was
the clearest "pay for it once" query in the codebase.

**The constraint that shaped the fix:** Next cannot read cookie-based data inside a cache scope
("Accessing uncached data sources such as `headers` or `cookies` inside a cache scope is not supported"), and
the existing read used the visitor's session-scoped client. So the cached read uses the **service-role
client** (`lib/db/admin.ts`), which is a real privilege change and therefore had to be justified rather than
assumed. It is safe here, and only here, for three reasons:

1. The theme schedule is **global** — there is no row one visitor is entitled to see and another is not.
2. The RLS predicate for a non-admin is exactly `is_active AND now within [starts_at, ends_at]`, and
   `resolveScheduledThemeId()` **re-applies that same predicate**. The extra rows the service role can see
   (scheduled / paused / expired) are filtered back out before anything is returned, so the value produced
   is always **one a public reader could already have received**. Only the resolved *id* leaves the function.
3. Theme ids are not secret — every schedulable id already ships in the client bundle
   (`app/themes/<id>.css`, `lib/theme/themes.ts`), as the `site_themes` migration itself notes.

Implementation: `unstable_cache` with tag `SITE_THEMES_TAG` (`"site-themes"`) and `revalidate: 60`. The
per-request React `cache()` on `getActiveTheme()` stays as well — the two layers answer different questions
(once per request vs. once per minute).

**Read-your-own-writes:** all three writers (`saveThemeScheduleAction`, the active toggle, delete) funnel
through one `refresh()` in `lib/admin/theme-actions.ts`, which now calls **`updateTag(SITE_THEMES_TAG)`**.
`updateTag` (not `revalidateTag`) is the right primitive: it is Server-Action-only and **expires the entry
immediately** rather than marking it stale for background refresh — and in Next 16 `revalidateTag` also
requires a cache-life profile, which is a deprecation we don't want. Both live in the same tag namespace
(verified in `next/dist/server/web/spec-extension/revalidate.js`), so it invalidates an `unstable_cache`
entry exactly as `revalidateTag` would.

**Fail-soft preserved:** the whole body is wrapped, so an error resolves to `null` (= the native theme) and
never breaks a page. The one behaviour change worth knowing: a transient database blip now caches that
`null` for up to a minute instead of a single request.

`unstable_cache` is the pre-Cache-Components API and Next 16 lists it as replaced — when the deferred PPR
item (`cacheComponents`) lands, this becomes `"use cache"` + `cacheTag(SITE_THEMES_TAG)`.

## Verified

Checks: `tsc --noEmit`, `eslint`, **580/580 tests**, `npm run build` — clean; all 92 app routes still `ƒ`.

The cache was verified end to end against a production build (`npm run build && npm run start`), with headless
Brave as the admin and a plain `fetch` as the public reader, driving the **real** `/admin/themes` dialog:

| # | Step | Result |
|---|------|--------|
| 1 | No schedule rows; cache warm | page theme `native` ✅ |
| 2 | A `diwali` row inserted directly into the database (bypassing the app) | still `native` — the value really is cached, not re-queried per request ✅ |
| 3 | 60s window lapses (stale is served, refresh runs behind) | still `native` ✅ |
| 4 | Next request | `diwali` — the refresh landed, proving the service-role read path works ✅ |
| 5 | Admin schedules `diwali` in the real dialog, then one **full page load** of `/` (no waiting) | `diwali` ✅ — `updateTag` dropped the cache immediately |

Rows created during the test were deleted afterwards; the table is empty again.

Step 2/3 are worth keeping in mind as *intended* behaviour rather than staleness bugs: `unstable_cache` is
stale-while-revalidate, so a change made outside the app can take up to the TTL **plus one request** to show.
The admin UI never hits that path because it invalidates by tag.

## Not verified

- **The region change** — it is a deploy-time setting; nothing about it can be observed until the next
  production deploy, and the actual latency win needs measuring against the live site.
- The Japanese-adjacent claim that Tokyo helps *Indian* visitors: it is a large improvement over
  Washington D.C. for the database legs that dominate, but the function itself is now further from an
  Indian-based visitor than a Singapore/Mumbai region would be. Worth re-measuring after the deploy.
- Real `hnd1` acceptance by the Vercel plan (Hobby permits a single region; more than the plan allows fails
  the deploy — this is exactly one).

## Item 2 — `getClaims()` instead of the doubled `getUser()`: explained, not applied

`getUser()` always asks the Auth server. `getClaims()` verifies the JWT **locally** against the project's
public keys (cached JWKS) — but only if the project uses an **asymmetric** signing key (ECC/RSA). With the
legacy symmetric secret, or without WebCrypto, it silently falls back to `getUser()`, so the change is never
a regression, just sometimes no gain. It replaces *two* `getUser()` calls per request (middleware +
`getServerUser`).

**On the security worry:** it is a real trade-off, not a formality, and the honest summary is that it does
not create an auth *bypass* but it does widen a *revocation* window.

- It still cryptographically verifies the signature and rejects expired tokens, so a forged or tampered
  token is still refused.
- What it stops learning is what only the server knows *right now*: a session revoked server-side, or a user
  deleted in the auth schema. Those become visible at the next token refresh rather than immediately.
- That matters to **this** app specifically, because a password reset deliberately revokes every other
  session (`signOut({ scope: "others" })`, `lib/auth/actions.ts:216`). Local verification would soften that
  from "immediate" to "within the access-token lifetime".
- The risk is bounded here because the app never trusts a role from the token: `requireRole()` /
  `getServerUser()` re-read `users.role`, `is_active` and `deleted_at` **from the database** on every
  request, so role changes and suspensions/erasure still take effect immediately. The residual gap is
  narrower than it first looks — it is specifically session revocation.
- If it is done later, the safe shape is: `getClaims()` on the hot render path, keep the server-verified
  check (or the DB check, which already exists) on anything sensitive, and consider shortening the access
  token lifetime in Supabase.

## Item 4 — Sentry `tracesSampleRate` lowered from 1.0 to 0.1 ✅

`tracesSampleRate` is the **fraction of requests that get a performance trace**. `1.0` means *every single
request* opens a trace, with spans, and ships it to Sentry; `0.1` means one in ten. Three configs set it —
`sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts` — so at `1.0` tracing was
running at full volume on the server, at the edge (i.e. on every middleware invocation), and in every
visitor's browser.

Two costs, and neither was a bug:

- **Quota.** Sentry's performance quota is a separate pool from error quota. At 100% a busy day can exhaust
  the month's trace allowance, after which traces stop — usually right when they are wanted.
- **Work per request.** Building and flushing a trace adds overhead to the request path, and in the browser
  config it is CPU and bytes on the visitor's device — on a site whose whole problem is that every
  navigation is a fresh server render.

**Error capture is unaffected either way** — `tracesSampleRate` only governs performance traces, and errors
are not sampled by it. That is the fact that makes this change cheap: we cut ~90% of trace volume while
keeping every error report and still getting statistically meaningful p50/p95.

The number now lives in **one** place, `lib/observability/sentry.ts` (`TRACES_SAMPLE_RATE = 0.1`), because
the three configs must agree — a browser tracing every request while the server traces one in ten is a very
hard thing to notice. Raising it temporarily while investigating one specific slow path is a one-line change.

**Verified:** `tsc`, `eslint` and `npm run build` clean, and the compiled output was inspected rather than
trusted — `tracesSampleRate:.1` appears in the browser chunk, in the edge-runtime chunk and in the Node
server chunk, with no `1.0` left anywhere. Verified by grepping the build output, so this is a real check
that the alias resolves in all three entrypoints (including the root-level `instrumentation-client.ts`), not
just that the source text was edited.

## Item 5 (context, still deferred)

Partial Prerendering / `cacheComponents`. This is what would eventually make routes static instead of `ƒ`
and remove the per-navigation render entirely — a large, structural change, and it is also the prerequisite
for migrating the theme cache above from `unstable_cache` to `"use cache"`.
