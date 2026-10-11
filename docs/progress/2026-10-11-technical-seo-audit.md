# Technical SEO audit — 11 Oct

A full pass against the real, live production site (`https://www.giftping.in`), not assumptions from reading
code — crawlability, indexability, structured data, and a sample crawl for broken links. Lighthouse/PageSpeed
Insights couldn't be run (no local Chrome in this environment, and the web version of PageSpeed Insights got
stuck mid-analysis) — that's the one gap, flagged honestly rather than guessed at. Core Web Vitals should be
checked directly at pagespeed.web.dev by a human once, as a follow-up.

## Clean — verified, no action needed
- **Crawlability**: `robots.txt` correctly allows everything except genuinely private areas; `sitemap.xml` lists
  93 real URLs, a random sample of 13 (products, boutiques, occasions, static pages) all returned `200`, none
  broken.
- **Indexability**: a filtered category URL (`?sort=...`) correctly carries `noindex, follow` plus a canonical
  back to the clean URL; the plain category page correctly has neither (default-indexable); money/account pages
  aren't in the sitemap at all.
- **404 handling**: a nonsense URL returns a real HTTP `404`, not a soft-404 (`200` with "not found" text) —
  Google explicitly penalizes soft-404s.
- **Mobile**: viewport meta tag present and correct.
- **Headings**: exactly one `<h1>` on the homepage (not zero, not several).
- **Images**: spot-checked a product page — every `<img>` has an `alt` attribute; empty `alt=""` only on
  genuinely decorative images (correct a11y practice, not a bug).
- **HTTPS/security headers**: already covered by the 28 Sept CSP work and yesterday's favicon/domain fixes —
  confirmed still intact.
- **Structured data — Product pages**: tested for real against Google's own Rich Results Test tool (not a local
  guess): **4 valid items** — Product snippet, Merchant listing, Breadcrumbs, Review snippet, all green.

## Two real issues found and fixed

1. **Every product page was shipping a bare, brandless `<title>`.** `app/(shop)/products/[slug]/page.tsx` fell
   back to the plain product name with no `— GiftPing` suffix when a vendor hadn't set a custom meta title (the
   common case — most vendors never fill this in) — every *other* page type (categories, boutiques, the fixed
   pages) already appends the brand name, this was the one template that silently didn't. Since products are the
   highest-volume page type on the whole site (57+ today, growing), this was the single biggest on-page SEO gap
   found. Fixed: `` `${product.name} — GiftPing` `` to match the convention used everywhere else.

2. **Google's own Rich Results Test flagged two "non-critical" missing fields** on the Merchant listing schema:
   `hasMerchantReturnPolicy` and `shippingDetails`. Both are real, available facts the product page already
   states in plain text (the flat delivery charge/free-delivery threshold, the return window) — added them to
   `productJsonLd()` using that exact same data (`lib/commerce/settings.ts`, `lib/commerce/returns.ts`), not
   invented numbers.
   - **Deliberately left out `deliveryTime`**: real transit time varies per courier/pincode (the whole point of
     the Standard/Express delivery-speed work from 10 Oct) — nothing on the product page makes one fixed
     day-range claim, so the schema doesn't either.
   - **Deliberately left out `returnFees`**: the refund policy page never actually states who pays return
     shipping. Claiming `FreeReturn` would have been a fabricated fact — exactly the kind of unverifiable claim
     this file's own long-standing rule (structured data only describes what the page already shows) exists to
     prevent. Omitted rather than guessed.

## Verified

Re-ran Google's Rich Results Test against the live site for the homepage (Organization/WebSite schema doesn't
produce a "rich result" card by design — "no items detected" there is expected, not a bug) and confirmed the
product-page fix locally (title now correct, `shippingDetails`/`hasMerchantReturnPolicy` render with real data,
correctly show `0.00` shipping when the product is above the free-delivery threshold). 529/529 tests (6 new),
tsc/eslint/build clean.

## Honest gaps (not fixed here — flagged for a decision or a follow-up)

- **Core Web Vitals / Lighthouse performance score**: couldn't be measured in this environment (no local Chrome;
  the hosted PageSpeed Insights tool hung mid-analysis rather than returning a result). Worth a human running
  pagespeed.web.dev against `https://www.giftping.in` once — the architecture (Next.js Image, WebP/AVIF, the
  Stage 12 performance pass) is solid in principle, but "solid in principle" isn't the same as a measured score.
- **`/cart` and similar account/money pages rely on `robots.txt` Disallow alone**, not an explicit `noindex` meta
  tag. In practice this is extremely low-risk (no external site links to a user's cart), and it's how most of
  these pages already work by convention — flagging only because `robots.txt` technically prevents *crawling*,
  not *indexing*, if a URL were ever discovered another way. Not worth a code change on its own.
- **No content/blog infrastructure exists at all** — the real, large remaining SEO opportunity, discussed
  separately: ranking for anything beyond the brand name realistically requires long-tail content (gifting
  guides, occasion articles) that doesn't exist yet. Technical SEO is in good shape; there's simply no content
  built to rank with.
