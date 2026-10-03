# 3 Oct 2026 — Occasion "worlds" de-duplicated; the Diary gets its own button

## 1. Two occasion filters on `/categories/birthday` — was it a bug?

**Yes, a real design fault, not a rendering bug.** Two different things were both called "occasion":

| What | Where | What it really is |
|---|---|---|
| The pill row under "Birthday World" (Birthday · Anniversary · Wedding · Corporate Gifting · For Her …) | `WorldHero` | navigation between **categories** (`/categories/<slug>`) |
| "Occasion" in the left filter card | `ShopFilters` | a filter on the product's **`occasion_tags`** |

Inside the Birthday world the tag filter repeated the world's own choice and showed nothing selected next to a highlighted "Birthday" above it. Worse, the data showed the world itself was too small: only **8** products are *filed under* the Birthday category but **38** carry the `birthday` tag, so a shopper walking into the Birthday world saw a fifth of the birthday gifts.

### Fix
- A category whose slug is an occasion tag (`birthday`, `anniversary`, `wedding`, `housewarming`, `thank-you`) or a recipient tag (`for-her`, `for-him`, …) is a **world**: it now lists *every active product in the category OR carrying the tag* (`worldTagFor` / `worldOrClause` in `lib/catalog/tags.ts`; `listProducts({ world })`; `getVendorsForCategory(id, world)` so the Boutique filter matches).
- The filter group the world already answers is hidden (`ShopFilters hide=`): "Occasion" in occasion worlds, "For" in recipient worlds. The *other* group stays — Birthday + "For him" is a genuinely useful narrowing. Hidden only when the URL doesn't already carry that filter, so an old shared link can still be cleared.
- Categories without a tag twin (Corporate Gifting, Festivals, Kids & Baby) are unchanged and keep both filters.
- The slug is checked against the controlled vocabulary before it goes into the PostgREST `or()` string, so a hostile slug can't inject filter syntax (tested).

Counts after: Birthday 8 → **38**, For Her 7 → **36**, Wedding **15**; Corporate/Festivals unchanged (7 / 6).

## 2. The Diary button

The Diary is the product's signature feature; it was a plain "Diaries" text link in the nav, plus a "My Diary" pill that only showed from 1536px and **hid itself when the header condensed** — so on most laptops it effectively didn't exist.

- "Diaries" removed from `lib/nav.ts` (so also from the desktop bar and the mobile menu list; the mobile menu keeps its big My Diary button, the footer keeps its link).
- New `components/layout/DiaryButton.tsx` + `components/art/DiaryBookIcon.tsx`: a **drawn leather diary** (copper cover, gold-foil border and heart, cream page block, ribbon bookmark, twinkling sparkle) on a **cream pill with a gold-foil ring and a slow shimmer**, caption "Never forget a date / My Diary". Drawn in code from theme tokens, so a festival theme re-colours it. Hover straightens and lifts the book.
- **Always visible.** ≥1440px at rest: book + caption. Condensed on scroll, or narrower: the caption folds away and the book chip alone remains (it can't push the row past the pill — the original overflow bug). Phones: the chip sits in the header beside search/basket/menu.
- First try was copper on copper and the book disappeared into the pill; a light pill makes it pop on the dark-green bar.

### Verified live
1440 / 1280 / 1100 / 375px, at rest and condensed (condensed forced via `data-condensed` — the hidden pane throttles the scroll handler): the button is inside the pill and the page doesn't scroll sideways at every width. At 1280px the caption version overflowed the pill by ~45px, which is why the caption starts at 1440px.

### Not verified
- A real scroll-and-look on a physical machine (as before, the pane can't run the rAF-driven condense through a real scroll).
- Real phone feel. The shimmer/twinkle are skipped under reduced motion by the global rule but I didn't toggle that setting.
- No ChatGPT asset needed — the book is drawn. If the client wants a painted diary icon later, a transparent-background PNG of a closed leather diary with a gold heart (3/4 view, ~400px) would replace `DiaryBookIcon` in one place.
