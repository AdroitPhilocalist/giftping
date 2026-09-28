# The boutique storefront page redesigned — a generic template, not one vendor's content

The developer sent a ChatGPT-regenerated mockup of a boutique page ("Lumen & Ash", a candle/fragrance
boutique) as the style they want the storefront page to follow, explicit that only the *style* should be
replicated — the reference happens to show one specific real boutique, and its own content ("hand-poured",
"candles") must not get hardcoded into the shared template every vendor's page renders from.

## What the reference actually needed, since none of it can be hand-authored per vendor

The reference shows content a generic template can't literally copy: three hero icons and four "why shop
here" cards, two of which are specific to a candle boutique ("Hand-poured with care", "Premium fragrances").
`/vendors/[slug]/page.tsx` renders from real vendor rows, so this session designed a **4-claim feature set
that's either universally true of every approved boutique on a gifting marketplace, or genuinely data-driven**
from real columns (`vendorFeatures()`, a small pure function right in the page file — not extracted to `lib/`
since it's only used here, following the same inline-helper pattern `NavLinks.tsx`'s `occasionIcon()` uses):
1. "Handpicked Quality" — always true, every listed product is reviewed before going live.
2. `vendor.is_featured` → "Featured Boutique" / else "Verified Boutique" — both true statements, not a guess.
3. "Perfect for Gifting" — true of the whole platform, not this one boutique.
4. `vendor.year_established` → "Since {year}" / else "Crafted with Care" — uses the real column when a
   vendor has set it, a warm generic fallback when they haven't.

Checked live against several real seeded vendors, not just the one the reference happened to depict:
**Lumen & Ash** (featured, established 2018) showed "Featured Boutique" and "Since 2018" correctly; **The
Brass Diya** (also featured) showed its own correct founding year; **GiftPing Originals** (not featured, no
founding year set) correctly fell back to "Verified Boutique" and "Crafted with Care" — proving the template
adapts per vendor rather than assuming every boutique looks like the one in the reference.

## The layout itself

- **`components/shop/VendorHero.tsx`** (new): a full-bleed banner hero that runs behind the fixed header —
  the exact same `-mt-[5.5rem] lg:-mt-[6.5rem]` / matching `pt-` pairing `HomeHero.tsx` uses (see
  `docs/progress/2026-09-28-navbar-floating-pill.md`'s fourth correction for why this specific pairing is
  required and what breaks without it). Falls back through the same chain the old banner strip already used
  — the vendor's own uploaded `banner_url`, then a curated stock front (`defaultShopfrontImage`, picked by a
  stable hash of the vendor's slug — the same photo every time for a given boutique), then the drawn
  `ShopfrontArt` SVG — nothing new added to that chain, just given a full-bleed treatment instead of a small
  aspect-ratio strip.
- **`components/shop/VendorFeatureGrid.tsx`** (new): the four bordered feature cards below the hero.
- **`app/(shop)/vendors/[slug]/page.tsx`**: rebuilt around these two, keeping the existing info block (icon,
  breadcrumb, name, rating/featured badges, description) and the product grid below completely intact in
  substance — same data, same `ProductGrid`/`Pagination`, just laid out to sit beside the feature grid instead
  of alone in a plain accent bar.

## What this deliberately does not do

Doesn't touch `components/shop/VendorCard.tsx` (the striped-awning card used on the `/vendors` listing page
and the navbar's Boutiques mega-menu) — the developer's reference and request were specifically about the
**individual boutique page**, and the listing card is a different, smaller component with its own working
style; conflating the two would be a bigger, unasked-for redesign. Verified after the change that
`/vendors` still renders it untouched.

## Verified live against real, varied data

`/vendors/lumen-and-ash` (real photo via `defaultShopfrontImage`, matched to a fragrance boutique — genuinely
close to the reference's own warm, arched-doorway composition), `/vendors/the-brass-diya` (a different,
jewelry-appropriate stock photo, confirming the hash-based picker gives real variety), `/vendors/giftping-
originals` (the non-featured, no-founding-year fallback path), mobile at 375px (confirmed no real overlap
between the header and the hero's eyebrow text — a screenshot made it look tight against the dark photo, but
`getBoundingClientRect()` showed a genuine 112px gap), and the `/vendors` listing page (unaffected). Full
regression clean: `tsc --noEmit`, `npx eslint .`, `npx vitest run` (291/291), `next build`.
