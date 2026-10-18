# Occasion cards get a different treatment: "world windows" (18 Oct 2026)

## Why

After the boutique ("lit glass", `GlowCard`) upgrade landed on `VendorCard` and `ProductTypeCard`, the
occasion cards on `/categories` (`CategoryCard`) were still on the older, simpler CSS `TiltCard` — they
leaned toward the cursor and lit up, but looked and felt the same as everything else. The ask was a
**deliberately different** experience for the occasion cards, so the mall's cards feel varied rather than
one repeated effect.

## The concept: a window, not an object

The card types now embody different metaphors:

| Boutique / Shop by Type (`GlowCard`) | Occasions (`WorldCard`) |
| --- | --- |
| The card is an **object** you pick up | The card is a **window** into a place |
| It leans and rises toward the cursor (springs) | The **frame never moves** — the world inside answers you |
| A gold edge tracks the cursor on the frame | Light **spills OUT** of the frame onto the page |
| `.gp-glow-parallax` photo drifts against the pointer | The photo drifts *with* the gaze and zooms deep (1.13) on a slow 0.9s ease |
| — | The occasion's own **ambience** (confetti / petals / hearts / sparks) drifts down *inside* the pane |
| — | A **sheen** crosses the glass, like a pane catching the light |

This reuses the existing `Ambience` system (`components/shop/Ambience.tsx`), so each occasion's window
carries its own personality for free, and keeps the "one effect = one removable mount point" convention:
`components/motion/WorldCard.tsx` is that mount point, and all of it sits in one block in `app/globals.css`
(`.gp-world`), next to the sibling `.gp-glow`.

## Alternatives considered

- **Cursor-biased zoom origin** (the world "opens toward your gaze" by moving `transform-origin`). Dropped:
  `transform-origin` isn't transitioned, so it slides the image abruptly as the pointer moves, and it can't
  be verified in the headless preview pane. A fixed-origin drift + zoom (mirroring the proven `GlowCard`
  parallax) is smooth and safe.
- **A "peek inside" product shelf** sliding up on hover (a real content feature) — deferred: needs per-category
  product data on the page (extra queries) and would drift toward the thing the mall place cards already do.
- **Always-on slow ken-burns** on every card — rejected: costs battery on phones and breaks the project's
  "no autoplay motion" ethos. The world moves only while you are at the window.

## How it works

- `components/motion/WorldCard.tsx` (client) writes only `--wpx`/`--wpy` (−1…1: how far the pointer is from
  the card's centre) straight onto the element — no React state, so moving the mouse never re-renders.
- `components/shop/CategoryCard.tsx` wraps both variants in `WorldCard` and drops its own
  `hover:-translate-y-1.5 hover:shadow-lift` (the frame must stay put — and two transforms must not stack,
  per the project's placement-transform gotcha). The photo variant gains the `Ambience` layer, the sheen and
  `gp-world-photo`; the plain no-artwork variant keeps its calm look but gets a warm "haze" rising from the
  sill instead of light on glass.
- `app/globals.css` holds `.gp-world` (unlayered, so it can override the Tailwind `shadow-card`/border
  utilities on hover, exactly as `.gp-glow` does): the frame's copper warmth + outward light spill on
  hover **and** keyboard focus (never hover-exclusive), the deep zoom behind
  `@media (hover: hover) and (prefers-reduced-motion: no-preference)`, the re-tuned `gp-world-drift` keyframes
  (the shared `shop-drift` is paced for a tall hero, so particles only crossed a thin band of a small pane),
  and the sheen. Ambience is **paused while hidden** so a wall of idle cards costs nothing.
- Reduced motion: the world holds still; the frame still warms and spills light (a static cue). Touch: no
  hover, just a gentle press (`@media (hover: none)`), so it never fights scrolling.
- The older `components/motion/TiltCard.tsx` + `.gp-tilt` were retired — `CategoryCard` was its only user.
  Live references in `CLAUDE.md`, `SpotlightSection.tsx` and the manual test guide were updated; the dated
  `docs/progress/*` entries that describe it historically were left as written.

## Verification

`tsc`, `eslint`, **565/565 tests** (incl. the theme-safety and CSS layer-order guards — no raw colours
added) and `next build` all clean. `/categories` rendered locally over HTTP 200 with the window markup and
ambience present and no server errors. **Not verified here:** the hover/zoom/sheen motion itself, which
needs a real mouse in a real window (and the door view-transition, which a headless tab aborts).
