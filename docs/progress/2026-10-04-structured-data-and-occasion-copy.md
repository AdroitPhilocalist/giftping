# 4 Oct 2026 — Product rich results (E12) and the six missing occasion descriptions

## E12 — structured data for Google
`lib/seo/structured-data.ts` (pure, tested, 9 tests): builds `schema.org/Product` and `schema.org/BreadcrumbList` JSON-LD for every product page.

- **Product**: name, up to 8 absolute photo URLs, brand (the boutique's name, or "GiftPing Originals" for in-house products), the price actually shown on the page (`computeUnitPrice` — the same sale-price rule `ProductCard`/`ProductBuyBox` use, so the markup can never disagree with the page), `priceCurrency: "INR"`, availability from `stock_quantity`, `sku` when the boutique set one. **No `aggregateRating` is ever emitted for a product with zero reviews** — inventing a rating nobody could check against the page would violate Google's own policy, not just be sloppy.
- **BreadcrumbList**: the same Home → Category → Product trail the page already renders as a visible nav.
- `jsonLdScript()` additionally escapes `<` to `<` before the JSON goes into `dangerouslySetInnerHTML` — a product name containing a literal `</script>` (a vendor could type anything) would otherwise close the tag early and let the rest of the string execute as HTML. Tested with exactly that payload.
- Wired into `app/(shop)/products/[slug]/page.tsx` only (E12 is specifically product rich results); category/vendor pages weren't in scope.

**Verified live**: real JSON-LD from a real in-house product (with a review) and a real vendor product (with a `sku`, zero reviews, correct boutique brand) both pasted into Google's own Rich Results Test (`search.google.com/test/rich-results`, Code tab, since it can't reach localhost) — **"6 valid items detected,"** no errors or warnings, for all three (two Products + one BreadcrumbList).

**Not verified**: how Google actually renders this once the real site is crawled — rich results are "eligible," never guaranteed, and can take weeks to appear after a real deploy.

## The six occasion pages with no description
Birthday, Anniversary, Wedding, Corporate Gifting, For Her and For Him had `description = null` — flagged in `PROGRESS.md` since the SEO work. Written and saved through the real admin UI (`/admin/categories`, not a direct SQL edit), one short, honest sentence each, in the same voice as the four that already existed ("For a new home and the people filling it.", "Small gestures that say a lot."):

- Birthday — "Cakes, confetti and gifts that make the day unmistakably theirs."
- Anniversary — "For the years you've built together, and the ones still to come."
- Wedding — "For two families becoming one, and the gifts that mark it."
- Corporate Gifting — "Gifts that say thank you well, from one business to another."
- For Her — "Gifts picked with the same care she puts into everyone else's."
- For Him — "Gifts he'll actually use, not just open and set aside."

One field does double duty: it's the paragraph under the headline on the world page (`WorldHero`) AND the meta description search engines see, since `generateMetadata` falls back to it when `meta_description` is blank (confirmed live on `/categories/for-him` — both the on-page text and `<meta name="description">` now read the new sentence).

Full regression after both changes: tsc, eslint, 508/508 tests (9 new), production build all clean.
