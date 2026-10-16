# 16 Oct 2026 — Product types, category-specific attributes, and the starter taxonomy

## Why
Comparing GiftPing with IGP showed a structural gap: IGP browses two ways — by occasion and by *what the thing is* (Cakes, Plants, Jewellery → Necklaces) — and each type has its own filters (Cakes: Flavor/Shape/Weight; Plants: Placement). GiftPing only had the occasion axis (`categories`), and nowhere to say "this is a necklace made of Kundan".

## Decision: a second, parallel axis — not a change to `categories`
`categories` is wired deeply into the occasion experience (nav, /mall, commission rates, SEO) and a product genuinely needs both answers at once (a wedding necklace). `categories.parent_id` exists but was never used by anything, so it was left alone rather than repurposed for a different meaning.

New tables: `product_types` (tree), `product_attributes` (per-type facets: select / multi_select with an options list), `product_attribute_values` (one row per product+attribute+value), plus `products.product_type_id`. Attributes **inherit down the tree**: a necklace is asked Metal because Metal is defined on Jewellery. Removing an attribute is a soft delete, because a hard delete would cascade away every vendor's saved answers.

## What was built
- **Admin** `/admin/product-types`: indented tree, add/edit/reorder/hide/delete, attributes edited inline with the type.
- **Vendor form**: one cascading select per tree level (up to three) and the type's attribute questions; server re-validates every answer against the live definitions.
- **Shop**: `/shop` and `/shop/[...path]` (products of the type and all its descendants, subcategory/sibling chips, breadcrumbs + JSON-LD, attribute filters in the desktop panel and phone sheet, canonical-URL redirect, friendly empty state); a "Shop by Type" header menu; sitemap lists only type pages that hold a live product.
- **Starter taxonomy** (`lib/catalog/taxonomy.ts`): 273 types — 25 broad (Cakes & Bakery, Flowers & Plants, Gift Hampers, Chocolates & Sweets, Personalized, Jewellery, Home & Living, Candles, Beauty & Wellness, Fashion, Gourmet, Toys & Games, Electronics, Watches & Accessories, Bags & Wallets, Leather & Stationery, Wedding & Festive, Pooja & Spiritual, Kids & Baby, Party & Celebration, Corporate & Branded, Handicrafts, Books/Art/Hobbies, Fitness & Travel, Pet Gifts), 190 subcategories, 58 third-level — and 149 attributes (53 multi-select, 1,302 options). Installed with `npm run seed:taxonomy`.

## Choices worth remembering
- **The seeder never overwrites by default.** It adds what is missing, matched by slug / type+key; a client who has renamed or hidden things can re-run it safely. `--overwrite` re-syncs but never deletes or changes `is_active`/SEO text. (A PostgREST bulk upsert writes NULL into any key missing from some rows, so rows with and without a description are written separately.)
- **A test guards the data** (`taxonomy.test.ts`): unique URL-safe slugs, parents before children, ≤3 levels, no comma in any option (filters travel in the URL comma-separated), ≤30 options, no inherited key redefined, ≤10 questions per type, and the slugs/values the demo catalogue uses are kept.
- **Gift cards / vouchers are not a type** — GiftPing ships physical goods, so a digital product would have no fulfilment path.
- **Empty categories still show.** Most of the 273 types have no products yet; they are listed (a marketplace's taxonomy should be visible) but with an honest empty message, and kept out of the sitemap until they hold something.

## Bugs the live testing caught (all fixed)
1. **Untouched multi-select groups blocked saving, silently.** react-hook-form reports a checkbox group nobody ticked as `false`, so `z.array` failed on a field the vendor never saw. The schema now normalises it (`attributeValueList`) and the form reports the first failing field instead of doing nothing. Found only by saving a product with a multi-select type for the first time.
2. **Nested type pages were `noindex` while also in the sitemap** (my own bug in the first version). Canonical is now the full ancestor path; only filtered URLs are `noindex`.
3. Attribute values were never a single value for a "select" attribute server-side; now enforced, and inactive attributes are ignored.
4. A stale `placement` attribute on Flowers & Plants (moved onto Plants) had to be removed from the dev DB by hand so a product wasn't asked twice.

## Not built / known limits
- CSV import has no type/attribute columns.
- An attribute filter fetches matching product ids and applies `.in("id", ids)`; PostgREST clamps one response at ~1,000 rows, so a very large catalogue needs this moved into an RPC.
- Admin edits the tree as an indented list, not drag-and-drop.
- No artwork for product types (plain icon cards), unlike occasion worlds.
