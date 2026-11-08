# Crawler traffic and Vercel usage incident — P0 crawl control

_2026-10-24 · Status: P0 code implemented locally, runtime-validated and verified; not committed, pushed or deployed._

## Why this exists

Production (`www.giftping.in`) hit Vercel's usage limit and started returning
`402 Payment required` / `DEPLOYMENT_DISABLED`. This was not a code loop or a classic DDoS. The
catalogue's filter UI is made of links, and crawlers followed those links into a combinatorial set of
zero-result URLs.

Evidence from the 23-minute production log export
(`giftping-log-export-2026-10-23T10-33-18.csv`) and the Vercel Firewall view:

- 4,257 function invocations in 23m03s → **184.7/min → ~266k/day**.
- 4,212 of 4,257 requests had a **unique path + query string**; every function response was dynamic
  `MISS` / `200`.
- **GPTBot: 2,341 requests (55%)**, all on
  `/shop/fashion-apparel/socks-innerwear`, with **2,341 unique query strings**.
- A browser-like fleet made **1,849 requests (43%)** across eight Chrome/Edge UAs, 212–255 requests
  each and 46–57 paths each, active for the full sample.
- The socks page had **0 products**, but still rendered **68 filter links** (4 attributes with
  18/16/8/4 options). Attribute-only combinations alone are roughly **773 billion**.
- The ~24h firewall view showed ~233.1k requests/day; GPTBot ~154.8k/day; the socks path
  ~160.8k/day; one IP (`74.7.242.48`, Microsoft ASN) ~154.7k/day. Over ~4.7 days that matches the
  ~1.1M invocation limit.
- Other heavily requested types included loungewear, personalized apparel, matching outfits and
  home-living; the socks page was the confirmed zero-product trap.

The sitemap already excluded empty types. Crawlers found the trap through `/shop`, taxonomy chips,
sibling links and filter links — not the sitemap.

## What P0 changed

### 1. Any query-string catalogue URL is now noindex, nofollow

**Files:** `app/(shop)/shop/[...path]/page.tsx`, `app/(shop)/categories/[slug]/page.tsx`

The old check only recognised a short list of filter names, so `page`, `nxtPpath`, `nxtPslug`,
`_rsc`, UTM parameters and unknown parameters could still look indexable. Now:

```ts
const sp = normalizeSearchParams(await searchParams);
const hasQuery = Object.keys(sp).length > 0;
// ...
...(hasQuery ? { robots: { index: false, follow: false } } : {})
```

The canonical URL remains the query-free page. Base type and category pages stay indexable.

### 2. `X-Robots-Tag` covers HTML and RSC responses

**Files:** `proxy.ts`, `lib/seo/crawl.ts`

Page metadata does not cover every `.rsc` / internal-router response. The proxy now sets:

```http
X-Robots-Tag: noindex, nofollow
```

for any non-empty query string on `/shop`, `/shop/...`, `/categories` or `/categories/...`.

The rule is deliberately narrow. It does **not** touch `/_next/image?url=...`, product pages, the
homepage or other query URLs.

### 3. Zero-result pages keep the filters, but not the crawlable filter graph

**Files:** `app/(shop)/shop/[...path]/page.tsx`, `app/(shop)/categories/[slug]/page.tsx`,
`components/shop/ShopFilters.tsx`, `components/shop/ShopToolbar.tsx`

Zero-result pages now render the normal `ShopFilters` panel and `ShopToolbar` again. A shopper can
remove one filter and see results immediately, instead of clearing everything and starting over.
The desktop grid keeps the filter column, and the phone drawer still works.

The crawler protection comes from the controls themselves: filter, sort, applied-filter and
“Clear all” actions are rendered as buttons that update the URL client-side, not as `<a href>`
links. An empty page therefore no longer hands crawlers 60+ new query-string URLs, while a shopper
still gets the Amazon/Flipkart-style “change one filter in place” behaviour.

Trade-off: filter actions now need JavaScript. The URLs remain shareable and the base taxonomy
pages remain ordinary indexable links.

### 4. Prefetch only when the shopper shows intent

**Files:** `components/shop/ShopNavigation.tsx`, `components/shop/Pagination.tsx`

Automatic background prefetching of filter/sort actions is off, so opening a page with dozens of
filters does not silently request dozens of routes. Instead, the single action the shopper hovers,
keyboard-focuses or touches calls `router.prefetch()`. The first filter click stays fast without
turning the whole filter panel into a crawler/prefetch fan-out.

Pagination keeps real links (they are bounded page numbers, not combinatorial filters) but uses the
same intent-only prefetch. Taxonomy chips and breadcrumbs remain normal followable links.

### 5. Targeted `robots.txt` rules, never a global query block

**Files:** `lib/seo/crawl.ts`, `lib/seo/robots.ts`

Added:

```txt
Disallow: /shop*?*
Disallow: /categories*?*
Disallow: /*?_rsc=*
Disallow: /*.rsc$
```

A global `Disallow: /*?` was deliberately **not** used: it would also block
`/_next/image?url=...` and damage image delivery/SEO.

### 6. URL parameter validation and a `PGRST103` safety net

**Files:** `lib/shop/filters.ts`, `app/(shop)/shop/[...path]/page.tsx`,
`app/(shop)/categories/[slug]/page.tsx`, `lib/db/products.ts`

- `page` is clamped to a finite integer between 1 and 1,000.
- `minPrice` / `maxPrice` accept only finite, non-negative numbers; a reversed range is put back in
  order; blanks and junk are dropped.
- `sort` only survives if it is one of the five known values; invalid values fall back to
  `popularity`.
- Attribute values are kept only if the current attribute actually offers them, and are capped at
  50 values per attribute.
- `inStock` only survives as `true`.
- Repeated query keys (e.g. `?minPrice=1&minPrice=2`) keep only the first value, so the helpers always
  receive a string rather than an array.
- `listProducts()` clamps the page again at the DB boundary and treats PostgREST `PGRST103`
  (range starts past the last row) as an empty result instead of a 500. This fixes
  `?page=2` on an empty type and `?page=999999` style requests.

### 7. Tests and local verification

**Files:** `lib/shop/filters.test.ts`, `lib/seo/seo.test.ts`

Added coverage for page clamping, price parsing/reversal, sort validation, targeted robots rules and
the shop/category-only `X-Robots-Tag` predicate.

Verified locally:

```bash
npx vitest run lib/shop/filters.test.ts lib/seo/seo.test.ts   # 38 tests
npm test                                                       # 612 tests, 73 files
npx tsc --noEmit                                               # clean
npm run lint                                                   # clean
npm run build                                                  # clean
```

Local runtime checks against `npm start -p 3100`:

- `/shop/fashion-apparel/socks-innerwear?vendor=x` → `x-robots-tag: noindex, nofollow`
  and `<meta name="robots" content="noindex, nofollow">`.
- `/shop/fashion-apparel/socks-innerwear` → 200, no `x-robots-tag`, no noindex meta.
- `/categories/birthday` → filter panel and sort links still render; `/categories/birthday?sort=newest`
  → `x-robots-tag: noindex, nofollow`.
- Zero-result socks page → filter panel and sort toolbar still render, but filter/sort controls are
  buttons, not crawlable `<a href>` links.
- `?page=2` and `?page=999999` on the empty socks type → 200, not 500.
- `/robots.txt` contains the four targeted query rules.
- `/_next/image?url=...` still returns 200.

## What is still manual — do these in order

### A. Restore the Vercel account (required before deployment)

Production is currently `402 DEPLOYMENT_DISABLED`; this is an account usage/plan block, not a build
failure. The P0 code cannot be promoted while the deployment is disabled.

- [ ] Do **not** open a new Vercel account and do **not** change the public URL. Keep
  `www.giftping.in`; a new account would repeat the same crawler problem and force SEO, auth, domain
  and webhook migration.
- [ ] Contact Vercel Support from the existing account. Include: project name, team, the 402 /
  `DEPLOYMENT_DISABLED` message, the dates, the crawler evidence above, and the P0 fixes already
  prepared. Ask for reactivation or a one-time usage reset.

  Short message you can adapt:

  > Our project `giftping` (team: …) is returning `402 Payment required` /
  > `DEPLOYMENT_DISABLED`. The usage was driven by crawler traffic on combinatorial shop filter
  > URLs, not by a code loop or attack. We have prepared and locally verified fixes: noindex/nofollow
  > on every query variant, `X-Robots-Tag` for HTML/RSC, removal of filter links on zero-result
  > pages, targeted robots rules, and page/parameter validation. Could you please reactivate the
  > deployment or grant a one-time usage reset so we can ship the fix? We are also reviewing the
  > correct plan for a commercial store.
- [ ] Choose one recovery path:
  - **Recommended:** upgrade the existing account to **Pro** (`$20/seat/month` plus usage credit).
    GiftPing is a commercial store; Hobby is non-commercial. Upgrade **only when the P0 build can be
    deployed immediately afterwards**, so the old crawlable build is not left running.
  - **If downtime is acceptable:** wait for the Hobby cycle (usually up to 30 days), then deploy P0
    on the first day service returns.
  - **If support grants a courtesy reset:** deploy P0 the same day, then decide Pro vs. Hobby.
- [ ] Do not upgrade and then leave the current build live for days. The account change restores
  access; the P0 build is what prevents the next spike.

### B. Add a temporary Vercel Firewall rule before/at re-enable

Use the Vercel project → **Firewall** → **Add Rule**. Keep this rule for at least 24–48 hours after
the P0 deployment, then remove it once traffic is stable.

- [ ] Rule name: `crawl-gptbot-socks`
  - Condition: **User Agent** contains `GPTBot`
  - Condition: **Path** equals `/shop/fashion-apparel/socks-innerwear`
  - Action: **Block** (or **Challenge** if you want a softer first step)
- [ ] If GPTBot moves to another empty type, update the path to that type or to `/shop` while the
  rule is temporary. Do not block GPTBot on the whole site permanently unless you have decided you
  do not want AI-crawler discovery at all.
- [ ] The browser-like fleet: first confirm whether it was your own QA/load test. If it was, stop
  the test. If it was not, add a temporary **Challenge** rule for the socks path — do **not** block
  all Chrome/Edge traffic, all Microsoft/Azure IPs, or Google. A broad UA/IP block will hurt real
  shoppers and legitimate search crawlers.
- [ ] Do not add a global query-string firewall rule that would catch `/_next/image?url=...`.

### C. Deploy P0 to a protected preview, then production

- [ ] Stage/commit only the P0 files (the working tree also contains unrelated wishlist/navbar work;
  keep those separate). Do not commit until explicitly approved.
- [ ] Create a preview deployment.
- [ ] Validate on the preview:
  - [ ] `curl -sI 'https://<preview>/shop/fashion-apparel/socks-innerwear?vendor=x'` includes
    `x-robots-tag: noindex, nofollow`.
  - [ ] The same response’s HTML includes `<meta name="robots" content="noindex, nofollow">`.
  - [ ] Zero-result page HTML does **not** contain `aria-label="Filters"`, `gf-sort`, or the
    pagination nav; taxonomy chips may remain.
  - [ ] `?page=999` and `?page=2` on an empty type return 200, not 500.
  - [ ] Base `/shop/fashion-apparel/socks-innerwear` has no `X-Robots-Tag` and no noindex meta.
  - [ ] `/_next/image?url=...` still returns an image (the robots rule did not catch it).
  - [ ] Preview `robots.txt` intentionally disallows everything; do not use preview robots content
    to test the production rules. Test the targeted rules on a local production build or after
    promotion.
- [ ] Promote to `www.giftping.in` only after the account is restored and the preview checks pass.
- [ ] Keep the temporary firewall rule active during the first 24–48 hours.

### D. Verify the real production behaviour

- [ ] Confirm `https://www.giftping.in/robots.txt` contains `/shop*?*`, `/categories*?*`,
  `/*?_rsc=*` and `/*.rsc$`, and does **not** contain a global `/*?` rule.
- [ ] Confirm a query URL returns `X-Robots-Tag` and a base URL does not.
- [ ] Confirm a known empty type keeps its filter panel usable, and that its filter/sort controls
  are buttons rather than query-string `<a href>` links.
- [ ] Confirm a type/category with products still filters, sorts and paginates in a browser.
- [ ] Confirm add-to-cart, wishlist and checkout still work (the P0 changes are catalogue/SEO only).
- [ ] Check the Vercel function logs: no `PGRST103` 500s, no new 5xx.

### E. Monitor for 48–72 hours, then 7 days

Watch Vercel → Observability/Firewall and the usage page, specifically:

- [ ] GPTBot requests to the socks path: target near zero within 24 hours.
- [ ] Total function invocations: expect a sharp drop from ~266k/day. Do not expect zero; normal
  shoppers and legitimate crawlers remain.
- [ ] Top paths and query strings: `/shop/*?*` and `/categories/*?*` should no longer dominate.
- [ ] Top user agents and IPs: confirm the browser-like fleet is gone or identified.
- [ ] Fast Origin Transfer and Fast Data Transfer: should fall with the request volume.
- [ ] 5xx / `PGRST103`: should be absent.
- [ ] Search Console: an increase in “Excluded by noindex” / “Crawled – currently not indexed” for
  filter URLs is expected. Base type/category pages should stay indexed.
- [ ] Sales/conversion and filter clicks: confirm shoppers can still narrow results.

If GPTBot is still hitting the socks path after 24 hours, check in this order: firewall rule
deployment, robots.txt freshness, whether the path moved, and whether the requests are coming
through a different host (preview/alias).

## Backlog after P0

### P1 — reduce cost further without changing the shopper experience

- Cache `getActiveProductTypes()` / `getActiveProductAttributes()` (per-request `cache()` only
  deduplicates within one request today).
- Optimise `getVendorsForProductTypes()` / `getVendorsForCategory()`: they currently fetch product
  rows and dedupe in JS.
- Make `/sitemap.xml` cacheable instead of `force-dynamic` with full catalog queries.
- Redirect an out-of-range page to the canonical page or page 1 instead of rendering the generic
  empty state. The `PGRST103` catch is a safety net, not the ideal UX.
- Consider `noindex` on empty **base** type pages (not just query pages) if crawlers keep discovering
  them. They are only ~273 URLs, so this is lower priority than the query explosion.
- Add an edge rate limit for `/shop*?*` and `/categories*?*` if the browser-like fleet returns.

### P2 — full-page caching (not done in P0)

Full-page CDN caching is still blocked by the per-request CSP nonce and the personalised layout
(cookies/headers make the root layout dynamic). Keeping filter controls out of the crawlable link
graph and noindexing query URLs fixes the crawl explosion; it does not make unique filter URLs
cheap. A future architecture would need to:

- serve a cacheable catalogue shell without the nonce/personalisation, or
- move personalisation to a client island and cache the catalogue HTML, or
- accept per-request rendering for filtered pages but keep them out of crawler circulation.

Do not treat P2 as a quick config change; `staleTimes` is client-router caching, not CDN caching.

## What not to do

- Do not add `Disallow: /*?` — it blocks `/_next/image?url=...`.
- Do not block all Chrome/Edge, all Microsoft/Azure IPs, or Googlebot.
- Do not remove filters from catalogue pages; shoppers need them even when a filter combination is empty.
- Do not noindex the query-free base type/category pages that have products.
- Do not open a new Vercel account or change the domain to escape the limit.
- Do not upgrade and leave the old crawlable build live; deploy P0 immediately after restore.

## Files touched by P0

- `app/(shop)/shop/[...path]/page.tsx`
- `app/(shop)/categories/[slug]/page.tsx`
- `components/shop/ShopFilters.tsx`
- `components/shop/ShopToolbar.tsx`
- `components/shop/ShopNavigation.tsx` (new)
- `components/shop/Pagination.tsx`
- `lib/shop/filters.ts`
- `lib/shop/filters.test.ts`
- `lib/seo/crawl.ts` (new)
- `lib/seo/robots.ts`
- `lib/seo/seo.test.ts`
- `lib/db/products.ts`
- `proxy.ts`
- `docs/progress/2026-10-24-crawl-control-p0.md` (this file)

## Acceptance criteria

P0 is complete when all of these are true in production:

1. A query-string shop/category URL returns `X-Robots-Tag: noindex, nofollow` and a noindex meta.
2. A zero-result type/category page keeps the filter panel and sort toolbar usable, but its
   filter/sort actions are buttons rather than crawlable query-string links.
3. Base type/category pages still render, remain indexable and keep their canonical URL.
4. `robots.txt` blocks only targeted query paths, not `/_next/image`.
5. `?page=999` and `?page=2` on an empty type do not 500.
6. Shoppers can still filter, sort, paginate and buy.
7. GPTBot traffic to the socks trap is near zero within 24 hours of the firewall rule + deploy.
