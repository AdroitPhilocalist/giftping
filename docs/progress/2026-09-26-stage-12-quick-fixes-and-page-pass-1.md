# Stage 12 (slice 12) — quick fixes, then page pass 1

Feedback: the mall map and the diary are far ahead of the rest of the site. Plan: fix three small things, then give every page a "scene".

## Quick fixes
- **Robin cursor no longer covers small buttons.** It used to sit exactly on the pointer, 34px wide, and grew over anything clickable. Now it rides just below-right of a small copper dot that marks the real pointer; over clickable things it shrinks and the dot becomes a ring. A footer switch ("Robin cursor: on/off", remembered in localStorage) turns it off. `RobinCursor.tsx`, `RobinCursorToggle.tsx`.
- **Header condenses on scroll** (81px → 51px, logo 56 → 40px, soft shadow) with hysteresis; `HeaderShell.tsx` + `.gp-header[data-condensed]` in globals.css. Writes a data attribute, no React re-render while scrolling.
- **The diary book fits the window** (≥1280px wide and ≥700px tall): pages scroll inside themselves like a notebook (`.dy-book--fit`, `.dy-page-scroll`); the home spread was compacted so both pages show their essentials at 1440×900 (the streak became a chip in the score title; photos got shorter). Shorter screens keep the internal scroll.

## Page pass 1 (`components/shop/shop.css`, same rules as the diary kit: `components` layer, theme tokens)
- **Product cards are gift tags hung on twine** (`ProductCard`, `ProductGrid` — every product grid on the site now uses it): a hole and loop, the price as a dashed paper stamp overlapping the photo, the discount as a round seal, a swing on hover.
- **Occasion worlds** (`WorldHero`): the artwork drifts (slow zoom), petals / hearts / confetti / gold sparks fall across it (`Ambience`, deterministic), a row of the other worlds to hop between, a scalloped edge into the page. **Filters are tap-to-filter tags** (`ShopFilters`): plain links, so server-rendered, shareable and JS-free; the old select form was deleted.
- **Boutique Avenue**: a street hero, and every shopfront gets an awning (4 colourways), an "Open" sign and a stable hue shift so the same three photos stop looking identical. Storefront pages get the awning too. `defaultShopfrontImage` now uses every delivered `shopfront-*` file automatically.
- **Product page**: the personal note shows live on a handwritten gift card (`GiftCardPreview`).
- Batch 4 artwork prompts (six more shopfronts, four more worlds, checkout / account / courier / display-stand / empty-shelf scenes) are in `docs/design/asset-prompts.md`.

## Still to do in the pass
Home rows, product gallery (display stand), cart items, checkout (gift counter), orders (courier on the tracking line), account (keepsake box), search/empty states, page transitions.
