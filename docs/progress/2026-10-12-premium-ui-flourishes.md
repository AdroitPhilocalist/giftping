# Three premium UI flourishes — 12 Oct

Client brought a ChatGPT-researched brainstorm of four big recipient-facing features (a gift "reveal room,"
a post-gift reaction diary, a multi-vendor gift composer, a recipient-choice handoff) and asked what else
could be done — specifically asked for ideas scoped to pure UI/animation work: no new art assets, no new
backend architecture, just making the existing site feel more premium and more like a real physical mall to
walk through. Surveyed the existing animation/motion conventions first (`TiltCard.tsx`'s CSS-variable
cursor-follow technique, `Ambience.tsx`'s drifting-shapes mechanism, `shop.css`'s token system) so the three
built here extend what's already there rather than introducing a new pattern or a new dependency — confirmed
via `package.json` that no animation library (`framer-motion`/`motion`) is installed at all; everything here
is hand-rolled CSS + vanilla DOM, consistent with the rest of the codebase.

## 1. A gift-wrap ribbon corner on every product card

Every `ProductCard` now carries a small copper ribbon + bow in the photo's bottom-right corner — literally
"this is already a wrapped gift" — that perks up (scales, tilts) on hover. Reuses the exact bow drawing
`DeliveryRibbon.tsx`'s free-delivery ribbon already uses (same paths, same copper tokens), so it reads as the
same idea rather than a third unrelated "ribbon" style in the app.

**Two real problems found and fixed by actually looking at it, not just reading the CSS**: the first version
positioned the ribbon strip with guessed pixel offsets, and it was too thin (0.9rem) and too close in tone to
warm-toned product photography — it visually disappeared against anything copper/brown (confirmed via a
zoomed screenshot: on a leather-diary photo, it was barely a hairline). Fixed by (1) anchoring the strip
geometrically instead of by guesswork — `right:0; bottom:0` then `translate(50%, 50%)` before rotating, so its
centre always lands exactly on the photo's corner regardless of container size, no more manual offset tuning
— and (2) giving both the strip and the bow a white rim + dark drop-shadow, so they read against any photo
tone, light or dark, rather than blending into whatever's behind them.

## 2. A boutique spotlight that follows the cursor across a grid

`components/motion/SpotlightSection.tsx` — the "room-scale" version of what `TiltCard` already does per card:
a soft warm light that drifts across an entire section of product cards as the cursor moves over it, like
walking under a boutique's track lighting, rather than one card lighting up in isolation. Same proven
technique as `TiltCard` (two CSS custom properties written straight onto the element via a ref on
`pointermove`, no React state, so the grid underneath never re-renders while the mouse moves; mouse-only;
off under `prefers-reduced-motion`), just applied to a whole section instead of one card. Deliberately
restrained — low max opacity (0.65), `soft-light` blend mode, `pointer-events: none` — so it reads as ambient
light, not a flashy follow-spot. Mounted around the homepage's "Trending in the Mall" grid and every category
page's product grid.

## 3. Dust motes in the atrium's skylight

`Ambience.tsx` already drives the drifting confetti/hearts/petals/sparks/diyas/snow on occasion pages and
festival theming — a generic mechanism, not something tied to festivals specifically, it just hadn't been
used outside those contexts yet. Added a new `"motes"` kind (a soft, blurred, low-opacity speck rather than a
crisp shape) and mounted it on the homepage hero, behind the headline, so the one place in the app meant to
feel like real indoor space — the mall's atrium under a skylight — actually has light catching dust drifting
through it, instead of being a static photo.

## Verification

Typecheck/lint/540 tests/build all clean. Live-verified in the browser, not just read back from the code:
confirmed the ribbon's geometry and contrast fix by zooming into actual rendered screenshots at both desktop
and mobile widths (the first version's flaw was only visible this way — the computed CSS looked fine in
isolation), confirmed the hover flourish with a real OS-level hover (not a synthetic DOM event, which does
not trigger `:hover` CSS), confirmed the spotlight's cursor-tracking via its live CSS custom properties update
in response to a real pointer move, and confirmed the dust motes render (14 elements, correct per-element
CSS variables) on the homepage hero. Checked three surfaces: the homepage grid, a category listing page
(`/categories/birthday`), and mobile width (375px) — ribbon sizing holds up at the much larger single-column
card size without looking cramped or colliding with the wishlist button or price tag.

## Scope notes

This was deliberately the "cheap, high-craft polish" tier, not the four heavier features from the ChatGPT
brainstorm (reveal room, afterglow diary, gift composer, recipient handoff) — those need real backend work
(tokenized links, new DB tables, fulfilment logic across vendors) and were out of scope for "just UI
elements, no new assets" as asked. If any of those four get greenlit later, the spotlight/ribbon/motes work
here doesn't need revisiting — they're independent, additive flourishes.
