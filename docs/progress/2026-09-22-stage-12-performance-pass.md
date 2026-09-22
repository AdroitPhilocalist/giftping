# Stage 12 (slice 8) — performance pass

No visual changes. Everything here is either a fewer-queries fix or a fewer-bytes fix, verified not to
change behaviour (same data, same rendered output — checked in the browser on the homepage, a product
page, a category page and a vendor storefront, and against the full test suite).

## The one that mattered most: `getActiveTheme()` wasn't memoized

Every page calls it at least once, directly, on top of the root layout calling it again — and the
homepage calls it a *third* and *fourth* time from `HomeHero`, `DiscoverCards` and `RelationshipCards`,
**plus once per featured `VendorCard`** (each is its own async Server Component). None of those calls
depended on each other's result, so none of them were deduplicated: a single homepage request could fire
off 8+ identical `site_themes` queries for data that's the same for the whole request. Wrapped
`getActiveTheme()` in React's `cache()` — the exact pattern `getServerUser()` already used — so a request
now runs that query at most once, however many components ask for the theme. `getProductBySlug()` had the
same problem for a different reason: `generateMetadata()` and the page component both call it, and Next
doesn't share data between them unless the function is `cache()`-wrapped; same fix, same file this time
wrapping the function itself.

## Query waterfalls that should have been parallel

Found by grepping every `page.tsx` for pages with several top-level `await`s and checking which ones
actually depended on the one before it. In `vendors/[slug]`, `categories/[slug]`, `orders/[id]`,
`products/[slug]`, `diary` and `diary/people/[id]`: the page-gating fetch (vendor/category/order/product)
was correctly first, but `getServerUser()`, `getActiveTheme()`, `getReturnWindowDays()` and
`loadCandidatePool()` were awaited one-after-another afterwards even though none of them need the gating
fetch's result. Moved each into the same `Promise.all` as the things it doesn't depend on — same data,
same order guarantees where they matter (`notFound()` still runs before anything renders), fewer
sequential round trips per page.

## Two real "preloading the wrong/invisible picture" bugs

- **`Logo`** hardcoded `priority` on its image. `Logo` renders three times per page (Navbar, Footer,
  MobileMenu) — meaning the Footer's logo, which is below the fold on every single page, was being
  preloaded at high fetch priority, competing with the page's real LCP image (the hero) for the one
  preload slot that actually matters. Made `priority` a prop, default `false`; only `Navbar`'s instance
  (genuinely above the fold) passes it now.
- **`HomeHero`**'s desktop hero `<Image priority>` sits inside a hand-authored `<picture>` with a
  `<source media="(max-width: 1023px)">` pointing at a *different* file (`hero-atrium-mobile`). Next's
  `priority` preload only knows about the `<Image>`'s own `sizes` prop, not the sibling `<source>` — so on
  a phone, the browser preloaded a scaled copy of the *desktop* picture (irrelevant, since the browser's
  own `<picture>` resolution renders the mobile file instead) on top of actually fetching the real mobile
  image. Same issue, latent, in the auth sign-in/up panel (`hidden lg:block` — invisible on phones, but
  still unconditionally `priority`, so it would have eagerly fetched at high priority on every phone
  visit to `/sign-in` the moment the client's `auth-welcome` artwork arrives). Fixed both by giving the
  branch that never actually renders on narrow screens a near-zero `sizes` value, so if the browser does
  preload it anyway, it's a tiny wasted fetch instead of a full-width one.

## Bundle: a validation library on the product page for no reason

`components/shop/ProductBuyBox.tsx` (rendered on every product page) imported
`PERSONALIZATION_OCCASIONS` — a plain four-item constant array — from `lib/validation/cart.schema.ts`,
a file whose only other exports are `zod` schemas. Moved the constant to its own zod-free module
(`lib/commerce/personalization.ts`); `cart.schema.ts` re-exports it for the server-side callers that still
need it from that name. `components/shop/AddressForm.tsx` also imports a `*.schema.ts` module client-side,
but that one genuinely uses `zodResolver` for real inline form validation (the React Hook Form + Zod
pattern CLAUDE.md already calls out as deliberate) — left alone on purpose.

## `next.config.ts`: AVIF before WebP

`images.formats` now tries `image/avif` first, falling back to `image/webp` for browsers that don't
support it (Next negotiates by the request's `Accept` header, so nobody gets a broken image). Already
covered by the Vercel Pro image-optimization allowance already budgeted in `CLAUDE.md`.

## Considered and deliberately left alone

- **`HeroBanners`** mounts every slide (up to 6) at once so the cross-fade is instant, rather than lazily
  mounting only the active + next slide. That would save bandwidth once the admin actually schedules 2+
  banners (today: zero active banners, so zero real-world cost either way) — but it risks a visible blank
  flash the first time autoplay reaches a not-yet-loaded slide, which matters more for a site whose whole
  brief is "the best-looking, most premium-feeling gifting site" than a currently-theoretical bandwidth
  saving. Worth revisiting once banners are actually in use and it's real traffic being measured, not
  guessed at.
- Cross-request caching (`unstable_cache`) for `platform_settings`/categories/theme data beyond the
  per-request `cache()` already in place: skipped. Some of that data feeds pricing/commission
  calculations, and introducing staleness there without carefully wiring revalidation on every admin write
  is a correctness risk, not a performance win worth taking casually.

## Verified

tsc, eslint, vitest (254, unchanged — this pass touched no logic that has tests, only fetch ordering and
image hints), `next build`. Browser: homepage (confirmed via
`document.querySelectorAll('link[rel=preload][as=image]')` that exactly two preloads now fire — the header
logo and the hero — down from three before the `Logo` fix), a product page, a category page and a vendor
storefront, all with zero console errors on a fresh tab.
