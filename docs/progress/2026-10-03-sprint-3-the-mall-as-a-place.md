# 3 Oct 2026 — Sprint 3: "The mall as a place" (B3, B4, B6, B7, B8)

## What was built

### B3 — The mall map is alive (`/mall`)
- The map already had numbered markers, a list and a tour. New: **the robin flies to whichever place you touch** (the real `robin-flying-gift` art, flipped to face the way it flies; it stays where it landed when the pointer moves off, so it doesn't dart back every time the mouse crosses a gap) and a **place card** replaces the one-line caption: name, live count ("38 gifts", "5 boutiques"), the robin's line about the place, **three real thumbnails** (products, or boutique logos) and a "Step inside" button.
- Data: `lib/mall-summaries.ts` (server) reads each place with the same category listing its page uses, so the count on the card equals the count on the page. A place that can't be read is left without a summary — the card then shows just its name.
- **Touch screens:** first tap on a number shows its card, second tap goes in (there is no hover to preview with).
- `lib/mall.ts`: every zone now has a `guide` line. The old static "Hi there!" robin was removed — the flying one replaced it, so there is one robin, not two.

### B4 — "Entering the shop" transitions
React's `<ViewTransition>` (no config needed in Next 16): the **shopfront picture on a boutique card grows into that boutique's banner** (`VendorCard` ↔ `VendorHero`, name `shop-<slug>`), and an **occasion card's picture grows into the world's header photo** (`CategoryCard` ↔ `WorldHero`, name `world-<slug>`). Only those named pictures animate (`default="none"`); CSS in `app/globals.css` (560 ms, `::view-transition-group(.gp-door)`); disabled entirely under reduced motion; a browser without the API simply navigates normally.

### B6 — Robin as a guide
Most of the idea already existed (peeking at an empty basket, napping in a quiet diary, flying a gift on add-to-cart, bell/heart/search empty states). Added: **the waving robin at sign-in / sign-up / reset** (`app/(auth)/layout.tsx`, sways gently), and the **map robin** above. No new artwork was needed — `robin-waving` and `robin-flying-gift` were already delivered.

### B7 — Festival mode (Diwali first)
- **Theme:** `app/themes/diwali.css` + a `kind: "festival"` entry → appears in `/admin/themes` to schedule or preview (nothing else to wire). Warm ivory canvas, deep maroon bars, marigold-gold accent.
- **Calendar + countdown:** `lib/festivals/calendar.ts` (pure, 10 tests): India's calendar day, "36 days to Diwali — order by 4 Nov for Diwali delivery", a last-chance state in the final two days, an honest "cut-off has passed — may arrive after the festival", a greeting on the day, rolling to next year after.
- **Shown when the festival's theme is the live one:** a countdown ribbon under the homepage hero with a "Shop Diwali gifts" button (→ Festivals category), a one-line note in the cart, and **floating lamps rising across the site** (`components/festival/*`; kept off checkout, cart, orders, sign-in and both portals; `pointer-events: none`; stills under reduced motion).
- **To add Rakhi/Christmas later:** a theme file + `THEMES` entry + a `FESTIVALS` entry. See the header comment in `lib/festivals/calendar.ts`.

### B8 — Shop-window cards
`components/motion/TiltCard.tsx`: boutique cards and occasion cards lean up to 5° toward a real mouse and a warm light follows the pointer. Never for touch, never under reduced motion; CSS variables written straight to the element (no React state). **Product cards were deliberately left out** — they already swing on hover like a gift tag, and the two motions fight.

## ⚠ Decisions a human must make before launch
1. **Festival dates** are in code (`FESTIVALS`): Diwali 8 Nov 2026 and 29 Oct 2027. Lunar festivals move — **check them against the panchang.**
2. **`cutoffDays: 4`** ("order by" = 4 days before) is an *assumption*. It should be the slowest realistic boutique's dispatch + courier time. The ribbon and cart note state this date to customers, so it is a promise.

## Verified live
- Map: robin moved to the touched place (the card, count, quote, thumbnails and "Step inside" all updated: Birthday 8 gifts after the revert below); mobile: first tap shows the card and stays, second tap navigates to `/categories/wedding`; no sideways scroll at 375px.
- Diwali (admin preview): `data-theme="diwali"`, ribbon "36 days · Order by 4 Nov", 12 floating lamps, cart note with a real item in the cart (removed afterwards), preview stopped, theme back to native.
- Tilt: pointer vars set, `matrix3d` transform applied, glow gradient follows the pointer, touch pointers ignored, resets on leave.
- Sign-in page shows the waving robin.
- tsc, eslint, 491/491 tests (10 new, all for the festival calendar), production build.

## NOT verified (be honest about these)
- **The shop-door morph itself.** React *does* start a view transition on `/vendors` → boutique and `/categories` → world, and the card's picture is named, but the browser pane I test in is a hidden tab, and a hidden page aborts view transitions ("invalid state") — so I never saw the morph play, or confirmed the destination banner pairs with the card. **Please click through it once in a normal browser window.** If it doesn't pair, the fallback is a normal page change (nothing breaks).
- Real-device feel of the robin flight, tilt and lamps; the ribbon at phone width; the Diwali palette beyond the home page, cart and sign-in.
- Whether a real scheduled (not previewed) festival behaves the same — the schedule path is the existing one, untouched.
- Hindi/regional festival names, and the `/categories/festivals` page content (it has whatever products are in that category — 6 today).

## Regression found by the client after Sprint 3, and fixed (same day)
The filter chips on occasion pages (and every `.pill`) turned into unstyled text with black strips for the active one. **Cause: my own Sprint 3 change.** The festival lamps are mounted in the root layout, and their component (and `Ambience`) imported `components/shop/shop.css`. That file is a `@layer components` stylesheet; imported from the root layout it loaded before `globals.css`, so the `components` layer ranked *below* Tailwind's base reset and lost to `padding: 0; border: 0`. I missed it because my live checks looked at the new features, not at the pages I hadn't touched, and the filter panel was visible in none of my screenshots.
**Fix:** the root-layout/auth pieces' CSS (`.gp-festival-*`, `.ambient`, the waving robin) moved into `app/globals.css`, and the `shop.css` imports were removed from `FestivalFx`, `FestivalCountdown`, `Ambience` and the auth layout. **Guard:** `lib/theme/css-order.test.ts` walks everything reachable from `app/layout.tsx` and fails if any of it imports a layered stylesheet (verified: it fails when the original import is put back). Verified live: chips have padding/border again, the active chip is green with light text; vendors page, birthday world and ambience unchanged. 492/492 tests, tsc, eslint, build.
