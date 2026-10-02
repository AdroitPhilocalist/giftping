# Admin SEO tools, sitemap and robots — gap-analysis item #11

## What was missing
Search engines and share links get their text from page metadata. Before this: product pages had it; the homepage/mall/about/etc. had a few hard-coded strings; **category and boutique pages had none**; there was no `metadataBase` (so canonical/share URLs were relative), no sitemap, no robots file, and no admin screen. Worse, the Meta title / Meta description fields in the category admin saved to the database and were read by nothing.

## Decisions
- **Overrides, not a CMS.** `site_seo` holds only an admin's customisations (title, description, noindex) for six fixed pages; the code defaults live in `lib/seo/pages.ts`. Saving "all blank, indexable" deletes the row, so a missing row is the normal state and the site can never end up without a title.
- **Category/boutique/product pages use their own data** (admin's category meta → category description → generic sentence; boutique short description → description → generic), not `site_seo`.
- **Public reads use the service role for `site_seo`** (admin-only under RLS; it's just page-title text) and **never throw** — a failed lookup means defaults, because metadata isn't worth taking a page down for.
- **The sitemap is read with the visitor's anon session**, not the service role, so RLS (active products, approved boutiques, active categories) decides what is listed; a hidden item can't leak by a forgotten filter. Paged with `fetchAllRows`; capped at the 50,000-URL protocol limit (past that it needs `generateSitemaps` splitting).
- **robots.txt prefix trap.** Disallow matches by prefix, so `/vendor` would also block the public `/vendors/*` pages — the exact class of bug `proxy.ts` hit. The portal is `/vendor/` + `/vendor$`, and a test asserts no public path is blocked by any rule and every private area is. Non-production Vercel environments get `Disallow: /` so a preview can't compete with the real site.
- **Filtered category URLs** (`?sort=`, `?vendor=`, price filters…) are `noindex, follow` with the plain page as canonical, to avoid thin duplicate pages.
- **Share cards:** each page carries siteName + a default image (the hero), a product uses its own photo. **Bug found and fixed:** the layout's `openGraph` originally included a title, and Next hands a page without its own `openGraph` the parent's whole object — so every such page (privacy, terms, gifts-for, search…) showed the *homepage* title on shared links. The layout now supplies only the shared parts.

## Built
Migration `20261002130000_site_seo` (applied; types regenerated) · `lib/seo/{pages,site,robots,sitemap,site-seo}.ts` · `lib/validation/seo.schema.ts` · `lib/admin/seo-actions.ts` (admin gate, RLS under the admin's session, audit-logged) · `components/admin/SeoPageForm.tsx` · `app/admin/seo/page.tsx` + nav entry · `app/robots.ts`, `app/sitemap.ts` · `generateMetadata` on home, mall, occasions, boutiques, about, contact, category, boutique, product (canonical + share card), gifts-for (canonical) · a title for `/search` · `lib/db/{categories,vendors}.ts` `getCategoryBySlug`/`getVendorBySlug` now `cache()`d (the page and its metadata both call them).

## Verified (running server + real database; test data removed)
robots.txt and sitemap.xml content (92 unique URLs; 57 products / 10 categories + index / 11 boutiques + index; no private path; `lastmod` on the 78 rows that have one). Head tags (title, description, canonical, robots, og:image/title) on `/`, `/mall`, `/categories`, `/categories/birthday`, the same with `?sort=`, a boutique, a product, `/gifts-for/parents`, `/privacy`, `/search`. Admin in the browser: 6 editors + health panel; Save/Reset disabled until a change; over-long title refused with the live counter; custom text saved → DB row → live `<title>`, description and og:title changed immediately → audit row; noindex ticked → `robots: noindex, follow` on the page and the page left the sitemap while others stayed; Reset → row deleted, default title back, page back in the sitemap. A category's Meta title/description set directly in the DB showed on `/categories/birthday` and the fallback returned when cleared. 23 unit tests (fallbacks, truncation, robots never blocking a public page, sitemap exclusions/escaping, schema round-trip).

## Not verified
How Google and Facebook actually render the tags (no external debugger available here). The preview-deployment `Disallow: /` behaviour (unit-tested; needs a real Vercel preview). Anything about ranking — this makes the site *eligible* to be described well, it doesn't promise position.

## Findings worth acting on
- **6 occasion pages have no description at all** (Birthday, Anniversary, Wedding, Corporate Gifting, For Her, For Him) — the panel lists them. Writing ~160 characters each in Admin → Categories is the single best SEO improvement available right now.
- Product structured data (price/stars/stock in search results) isn't done — idea **E12** in `docs/ideas/DELIGHT_AND_FEATURE_IDEAS.md`, small and free.
- Open Graph images are the hero for everything except products; boutique pages use their banner/logo only if set.
