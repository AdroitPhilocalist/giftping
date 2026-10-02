# Header contrast fix: opaque by default, glass only where a photo is actually behind it

`docs/progress/2026-09-28-navbar-floating-pill.md` already named this exact trade-off and deliberately
didn't fix it: the header's low-alpha glass tint (`.gp-header-glass`) was tuned to keep the homepage's hero
photo sharp underneath it, which meant a low-alpha dark tint over a **plain, flat, light** page background
(the cream `--gp-canvas`) barely darkens it at all. The client flagged this directly after using the site —
on `/mall`, `/diary`, and `/account/profile` the header read as "too transparent," camouflaging with a
light "skin-coloured" strip and making the white nav text hard to read.

## Options considered

Three were discussed with the client before building anything:

1. **Page-aware header** (chosen): keep the glass tint only where a photo genuinely sits behind the header;
   default to the header's own already-proven opaque fill everywhere else.
2. **Generate a background photo for every page** — rejected: this turns a header-contrast bug into a
   full site redesign, and putting photography behind functional/transactional pages (forms, account,
   checkout, admin) works against the readability those pages are deliberately kept plain for.
3. **Switch the site's default theme to a darker palette** — rejected: the warm cream/forest-green/copper
   look is the client's approved visual identity; changing it is a brand decision, not a bugfix, and
   unrelated to the seasonal/festival theme-scheduling feature the client had actually seen in the admin
   panel (`demo-night`/`demo-jewel` are proof-of-mechanism themes, never offered for real scheduling).

## What was built

`.gp-header-glass` (`app/globals.css`) now defaults to the same opaque fill the header already used once
condensed on scroll (`.gp-bar-gradient`'s formula) — already proven legible, since that's exactly what
every page has shown after a few pixels of scroll since the floating-pill redesign. The original low-alpha
glass gradient only applies when `<html>` carries `data-hero-header="true"`, guarded with
`:not([data-condensed="true"])` so scrolling still always wins and shows the opaque fill regardless.

`data-hero-header` is set by a new, tiny client component, `components/layout/HeroHeaderFlag.tsx` — mounts
with `useEffect` to set the attribute on `document.documentElement`, clears it on unmount. It's mounted
inside the two sections that actually bleed a photo up behind the fixed header via the established
`-mt-[5.5rem] lg:-mt-[6.5rem]` trick: `HomeHero.tsx` and `VendorHero.tsx`. No `HeaderShell` prop-drilling
needed — this follows the same `data-*`-attribute-on-`<html>` convention the theme system
(`data-theme`) already uses, so the header itself stays completely unaware of routing.

**`/diary` was deliberately left out of the hero-photo set for now**, even though it has a rich dark
wood-desk background (`.dy-desk`) that could in principle bleed up the same way. That would mean applying
the header-bleed pairing (negative margin + matching padding) to `DiaryDesk.tsx`, which sits underneath the
heavily-tuned flip-book layout (`FitPage`'s window-height scaling, `DeskProps`' absolutely-positioned
decorations) — real layout risk for a component that already took several correction rounds to get right,
for a purely cosmetic upgrade. The opaque default header already fully resolves the reported complaint on
`/diary` (a clean, legible pill instead of a near-invisible tinted strip) without touching that component at
all. Extending the bleed there to keep the glass look is a reasonable future polish item, not required.

## Verified live

Checked in the real dev preview, not just reviewed in code:
- `/mall`, `/account/profile`, `/diary` — header is now a solid, clearly legible forest-green pill from
  first paint, no camouflaging with the light background.
- `/` (homepage) — the glass tint is unchanged, hero photo still shows through sharp.
- `/vendors/lumiere-keepsakes-c9cef8` — same glass tint over the boutique's own banner photo.
- Scrolling on both a hero page (`/`) and a plain page (`/mall`) still condenses into the same opaque pill
  either way — the `:not([data-condensed])` guard works as intended.
- Full regression: `tsc --noEmit`, `eslint .`, `vitest run` (302/302), all clean. No new tests were needed —
  this is a CSS/attribute-toggle change with no new pure logic to unit test.

## Also fixed in passing

Two comments in `app/globals.css` describing the header's *old*, page-agnostic behavior ("same dark-green
colour every time... it never has to guess whether what's behind it is light or dark") were now false and
have been corrected to describe the new page-aware behavior, so a future session doesn't read stale
documentation next to the code it no longer describes.

## Follow-up, same day: a gilded edge for a "premium" feel

Separately, the client asked for "a golden tinge or touch" on the navbar to read as more premium. Rather
than changing the header's actual colour (the forest green is the client's approved brand colour, and the
site already has a warm copper accent used everywhere — dividers, badges, the current-page nav underline —
so a *different*, unrelated yellow-gold would clash with it), the fix adds a thin **gilded edge** using that
same copper token, pushed lighter at the highlight points so it reads as a warm gold rather than a flat
copper fill:

- A new token, `--gp-gold-edge` (`app/globals.css`): a `linear-gradient` that runs light-gold → copper →
  a bright near-white-gold highlight → copper → light-gold, simulating a brushed-metal shimmer rather than
  one flat tone.
- **Desktop pill (`lg`+):** a genuine 1.4px gradient ring all the way around the floating pill, via the
  standard "gradient border on a rounded element" technique — a full square of the gradient, `padding: 1.4px`
  clipped down to just that ring using `mask-composite: exclude` (`-webkit-mask-composite: xor` for Safari),
  since a plain CSS `border` can't take a gradient and keep `border-radius` at the same time (`border-image`
  ignores rounded corners entirely). This replaces the old flat, barely-visible copper `border-color`
  (`color-mix(... 20%/26%, transparent)`), which is now unused and removed.
- **Mobile/tablet flush bar (below `lg`):** just a thin gold hairline along the bottom edge
  (`.gp-header-inner::after`) — a ring on all four sides would put a stray gold line down both edges of the
  screen, since the bar runs edge-to-edge there; a bottom line alone reads as a deliberate accent instead.
- The opaque fill (`--gp-opaque-bar`, used by both `.gp-bar-gradient` and `.gp-header-glass`'s default from
  the fix above) also got its top sheen warmed from plain white (`rgb(255 255 255 / 0.1)`) to a warm
  champagne tone (`rgb(255 244 224 / 0.18)`), and its existing copper corner-glow strengthened from 20% to
  30% mix — small, but it means the gold accent is present in the fill itself, not just the edge.
- Applies uniformly regardless of the page-aware glass/opaque split above — the ring sits on `.gp-header-inner`
  itself, independent of which background variant is active underneath it.

Verified live: the ring is clearly visible on `/mall` (opaque pill), the homepage and a vendor storefront
(glass pill over a photo, at rest and condensed-on-scroll), and the mobile hairline shows correctly on the
flush bar. First pass used a 1px ring with less contrast between the gradient's light/dark stops — barely
visible at normal viewing size in a real screenshot comparison, so both the ring thickness (to 1.4px) and the
gradient's contrast were increased before calling it done. Full regression (`tsc`, `eslint`, `vitest`
302/302, `next build`) clean throughout.

## Third fix, same day: the "My Diary" pill spilling out of the header

The client reported the "My Diary" button visually vanishing against a light background specifically when
the header shrinks on scroll — investigated properly rather than taken at face value, and it turned out to
be a real layout bug, not a colour bug. `.gp-header-inner` is a single-row flex (`flex items-center
justify-between`, no wrap), and at real desktop widths the row — logo + every `NavLinks` item + the icon
group + the "My Diary" ghost pill — needs more width than the header actually has. With no `overflow`
declared, the excess doesn't get cut or wrapped; it just renders past the pill's own rounded edge, onto the
plain page behind it — exactly where the pill's translucent cream border/text (styled to be read against the
dark bar) reads as nearly invisible. Confirmed by measuring real `getBoundingClientRect()`s in the live
preview, not by inspecting CSS alone: at 1280px width (right at the `xl` breakpoint where the pill starts
being shown) the button's right edge already sat ~95–101px past the header's own right edge, at rest, before
any scrolling. It's **worse once condensed**: the shrunk pill's width caps at a fixed `75rem`
(`app/globals.css`'s `@media (min-width:1024px)` / `[data-condensed="true"]` rules) *regardless of viewport*,
so the same ~101px overflow reproduces on every desktop width once condensed, not just narrow ones — matching
the client's report that scrolling specifically is what triggers it.

Fixed two ways, both in the interest of not losing anything real: "/diary" is already reachable from the main
`NAV_ITEMS` "Diaries" link (`lib/nav.ts`) and from `AccountMenu`'s own "My Diary" item, so the standalone pill
is a redundant, purely decorative third way to the same place — safe to hide rather than needing to be
squeezed in.
1. `components/layout/Navbar.tsx`: the pill now appears from `2xl` (1536px) instead of `xl` (1280px) — the
   narrower "`xl` but not much more" range (≈1280–1400px, a very common laptop width band, e.g. 1366×768) is
   exactly where the at-rest row doesn't have room for it; confirmed live that at 1366px the row now fits
   with margin to spare once the pill only shows from 2xl.
2. `app/globals.css`: a new rule, `.gp-header[data-condensed="true"] .gp-diary-pill { display: none; }`,
   hides it once condensed regardless of viewport width (the fixed-cap problem above), the same
   `data-condensed`-scoped-override pattern already used for shrinking the logo mark.

**Verification note, for honesty**: the browser preview pane was backgrounded for part of this session, and
this app's own condense detection (`HeaderShell.tsx`) uses `requestAnimationFrame`, which browsers pause for
a non-visible/non-compositing tab — so the live, real-scroll condensed transition couldn't be captured
end-to-end in that window. What *was* verified live: the pre-fix overflow itself (measured directly, real
scroll, real condensed state, before any code changed); the at-rest fix at 1366px (real page load, real
measurement, no manual state manipulation); and the CSS selector `.gp-header[data-condensed="true"]
.gp-diary-pill` matching the actual DOM node (`Element.matches()`), confirming the rule targets the right
element. The condensed-specific `display: none` itself is simple, unambiguous CSS with no complex
interaction to go wrong — but a real click-and-scroll check by a human is still worth doing once, the same
caveat already on file for the native-`confirm()`-dialog items.
