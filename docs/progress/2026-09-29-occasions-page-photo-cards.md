# The Occasions listing page gets photo cards — and a real brand-name risk found while checking assets

The client asked why `/categories` (the "Occasions" link in the main nav) looked bland next to every other
major page. The answer: it was the one significant listing page with **no imagery at all** — a plain heading
and a grid of icon-in-a-circle cards, while `/mall`, the homepage, vendor storefronts, and even each
individual occasion page (`/categories/[slug]`, via `WorldHero`) all use real photography.

## What was checked before building anything

The client asked directly whether the artwork had actually been generated. It has: `lib/content/
imagery.manifest.json` has a `world-<slug>` entry for all 6 real categories (birthday, anniversary, wedding,
corporate-gifting, for-her, for-him) — these are the exact same images `/mall`'s own "Handpicked Experiences"
cards already reuse (`zoneArt()` in `app/(shop)/mall/page.tsx`), so no new asset generation was needed, just
reusing what already exists.

**Also found while checking, not something the client asked to be checked for specifically**: opened all 6
images to confirm they actually looked right before shipping them onto a second page, and two of them —
`world-for-her.webp` and `world-for-him.webp` — show real, clearly legible third-party luxury brand names and
logos: a "Miss Dior" perfume bottle and a "Gabrielle CHANEL" bottle in the for-her image, a "BLEU DE CHANEL"
bottle in the for-him image. This isn't a content-quality nitpick — publishing these as GiftPing's own
marketing photography on a commercial storefront risks a real trademark / false-endorsement problem (it
reads as an implied association with or endorsement by those brands, which isn't true and isn't licensed).
This was already a known, tracked item (`PROGRESS.md`'s "Next" list already said "regenerate
world-for-her/for-him — real brand names visible"), but re-confirmed directly by opening the actual files
rather than trusting the note.

## What was built

`components/shop/CategoryCard.tsx` now takes an optional `image` prop and renders a full-bleed photo card
(photo + dark gradient scrim + icon badge + name + description + "Explore") when one exists — the exact same
visual treatment `/mall`'s destination cards already use, for consistency — and falls back to the original
plain icon-medallion card when it doesn't, so a category with no artwork (there are others beyond the six
with `world-*` images — Housewarming, Thank You, Festivals showed up live with no image and correctly used
the plain fallback) never looks broken.

`app/(shop)/categories/page.tsx` resolves the active theme and each category's `world-<slug>` image once,
server-side, and passes it down — **except** for `for-her`/`for-him`, which are deliberately held back to
`null` (the same code path as "no artwork exists yet") via an explicit `BRAND_VISIBLE_IMAGES` set, so this
new page doesn't add a *second* surface showing the two problematic images while they're unregenerated. This
does **not** touch the two places that already show these same images today — `/categories/for-her`'s own
`WorldHero` and `/categories/for-him`'s — since that's pre-existing behavior, already flagged, and out of
scope for what was asked here; the developer was told directly and can decide whether to also suppress those
before the images are regenerated.

## Verified live

Screenshotted `/categories` after the change: Birthday, Anniversary, Wedding and Corporate Gifting show rich
photo cards matching `/mall`'s look; For Her, For Him, Housewarming, Thank You and Festivals correctly show
the plain icon card (the first two deliberately, the last three because no artwork exists for them at all).
Opened `world-birthday.webp`, `world-anniversary.webp`, `world-wedding.webp` and `world-corporate-gifting.webp`
directly and confirmed none of them show any real third-party branding. Full regression (`tsc`, `eslint`,
`vitest` 302/302, `next build`) clean.
