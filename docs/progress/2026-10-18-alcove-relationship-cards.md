# The fourth card idiom: "alcoves" for the relationship cards (18 Oct 2026)

## The ask

> "do the relationship cards give them a good crazy majestic artistic design nothing seen before"

The homepage "Shop by relationship" row (`components/home/RelationshipCards.tsx`) had five plain photo tiles with a
bottom scrim — effectively a default product card. It needed its **own** idiom, and a genuinely different one: the
three already in the codebase must not be repeated, and "lit glass in another colour" was explicitly off the table.

## What the other three are (so the fourth can't be any of them)

| idiom | where | the idea | motion is… |
|---|---|---|---|
| lit glass `GlowCard` | `/vendors`, `/shop` | an OBJECT that leans toward you | pointer-driven (springs) |
| world window `WorldCard` | `/categories` | a WINDOW whose world moves | pointer-driven (CSS vars) |
| framed print `DiscoverCards` | homepage Discover row | a PRINT that grows in its mount | pure CSS, hover-only |
| **alcove** `.gp-alcove` | homepage relationships | a **PLACE OF HONOUR** | **time-driven** |

## The idea: a votive alcove

Each person is shown in an **arched niche cut into the wall and lit from within** — the shape a thing is given when
it is precious. Three things are new at once, which is what makes it feel unlike anything else on the site:

1. **The shape.** A dome-topped arch (`border-radius: 50% 50% r r / 40% 40% r r`) rather than a rounded rectangle, so
   a row of five reads as a **colonnade**. No other card has a shape of its own.
2. **The ornament.** A **gilded double hairline** — the 1px ring in the arch's own `box-shadow` plus an inset
   tracery hairline — with a small gold **keystone** diamond at the crown (`--gp-gold-edge`).
3. **The motion, which is TIME-driven, not pointer-driven.** Nothing here follows the cursor (that is the lit-glass
   card's job). Instead the niche *wakes*: the veil of shadow lying over the portrait lifts, a **rose-window fan of
   light** wakes in the crown and **sways**, and the **halo blooms out past the arch onto the page** like a lamp in a
   chapel. On hover the niche is simply *lit*; the portrait, the veil, the fan and the gilding all brighten together.

## How it is built

- `components/home/RelationshipCards.tsx`: `Link.gp-alcove > stage(.gp-alcove-halo + .gp-alcove-arch[portrait, .gp-alcove-veil, .gp-alcove-light, .gp-alcove-tracery]) + .gp-alcove-plaque`.
- The **caption moved out of the photo** and onto an **engraved plaque beneath the arch**, over a rule that widens
  and turns copper when the niche lights — a museum-placard feel, and it removes the old `text-white`-on-scrim.
- `globals.css` `.gp-alcove*`: all of it plain CSS. Two custom-property-free, JS-free layers:
  - the **fan** is a conic gradient on a big disc centred on the crown, so the `gp-alcove-sway` rotation turns it
    about its own origin (a fixed origin is why it is a pseudo-element and not a `@property`-animated angle);
  - the **halo** is a blurred radial behind the arch, so only the spill past the edge is ever seen.
- `mix-blend-mode: screen` is confined with `isolation: isolate` on the arch, so the light blends with the portrait
  inside the niche and never with the page.
- **Touch has no hover**, so `@media (hover: none)` opens the niche by default (lighter veil, portrait brightened,
  light part-bloomed) — otherwise a phone would see five sealed black arches forever. A press scales the arch.
- The halo bleeds past the arch on purpose, which also **widened the document** — a phone measured a 14px horizontal
  overflow (`scrollWidth 404` vs `clientWidth 390`). The section now carries `.gp-alcove-row { overflow: clip }`:
  the bleed stays inside the section (its own padding absorbs most of it, so nothing visible is lost), and unlike
  `hidden` it never turns the section into a scroll container. Re-measured: `scrollWidth === clientWidth` at
  390 / 1280 / 1300 / 1366px.
- **Reduced motion**: the light cue (veil lift, light up, ring warms, rule turns gold) is *not* motion, so it stays;
  only `gp-alcove-sway` and `gp-alcove-breathe` are gated behind `prefers-reduced-motion: no-preference`.

## Verified

- `tsc`, `eslint`, **565/565 tests** (including the theme-safety scan — no raw colour in the TSX, the fallback icon
  uses `text-brand-on-primary`), `next build` — all clean.
- **Headless Brave, 1440px**: screenshotted the row at rest and with the middle niche hovered. At rest it is a
  colonnade of five gold-lined arches in warm shadow; hovering one lifts the shadow, warms the ring gold, reveals the
  fan of light and turns the plaque rule copper — a clearly dramatic reveal next to its unlit neighbours.
- **Touch emulation confirmed** (`Emulation.setTouchEmulationEnabled` + `hover: none` matching): veil `0.3`, light
  `0.4`, portrait brightened — the niches are open on a phone. Screenshotted at 390×844: two columns, arches intact.

## Not verified here

- The feel of the sway/breathe over time in a real browser (the screenshots are single frames), and the look at
  `sm`/`md` (3-column) widths specifically — only 1440px and 390px were captured.
