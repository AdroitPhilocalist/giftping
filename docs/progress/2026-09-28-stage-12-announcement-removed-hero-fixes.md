# Stage 12 (slice 18) — the announcement ribbon is gone, the header touches the hero with no gap, the hero text is actually legible

Four things from a screenshot of the site as it stood: the announcement strip above the header (a similar-but-not-identical green) read as two clashing bars, not one; a thin strip of the plain page colour showed between the header and the hero photo; the eyebrow text and the "Watch Our Story" button were hard to read over the photo; and the header's green looked a little flat. Also asked for: make the hero photo look less soft, if possible.

## The announcement ribbon is gone, not just repainted

Removed outright — `components/layout/AnnouncementBar.tsx` deleted, `Navbar` no longer takes an `announcement` prop, `app/layout.tsx` calls `<Navbar />` with nothing to pass. The header is now the very first thing on the page.

This wasn't only a component deletion: the ribbon's text lived in `ThemeDef.announcement` (`lib/theme/themes.ts`), one line per theme, specifically so a festival theme could show its own seasonal message there — real, documented infrastructure (the file's own "ADDING A FESTIVAL" instructions listed it as step 2), not a hardcoded string. With nothing left to render it, the field would have sat there unused forever, so it's removed from `ThemeDef`, `THEMES`, and `DEFAULT_ANNOUNCEMENT` is gone too — confirmed nothing else referenced it (no other component, no test) before taking it out. **If a promotional message is wanted again later**, the natural home now is the admin-managed homepage banner carousel that already exists for exactly this (`lib/content/banners.ts`, `HeroBanners`) rather than reviving a dedicated strip — flagging this rather than deciding it, since it's a real feature choice, not just styling.

The navbar's own logo already carries a small artistic tagline underneath it ("Your companion for every occasion", small-caps, letterspaced) — that already does what "put the tagline in the navbar" asked for, so nothing new was added there.

## The white gap between the header and the hero

Real layout bug, not a spacing choice: `.gp-header` (the sticky outer box) has a fixed height (5.5rem, sized for the condensed pill's own math), but `.gp-header-inner` — the element that actually carries the green colour — was never told to fill it, only to size itself to its content (a padding + a 3.5rem logo, a few pixels short of 5.5rem). The leftover sliver at the bottom of the box showed the plain page colour straight through, between the header and whatever came after it. Fixed with `height: 100%` on `.gp-header-inner` at rest, reset back to `height: auto` once condensed (the floating pill is meant to hug its own smaller content instead).

## The hero text, made to survive whatever the photo happens to do

The single diagonal scrim from the last slice covered the badge and headline well enough near the top-left, but thinned out unevenly toward the middle of the image — exactly where "Watch Our Story" sits (further right than "Explore the Mall", and on a wide screen the whole block is vertically *centred*, not pinned to the bottom, so the old scrim's separate bottom-up layer — reaching only 30% up from the floor — never got near it at all). `.gp-hero-scrim` is now three layers instead of one: the original diagonal for character, a flat left-to-right wash guaranteeing a baseline of darkening under the whole text column regardless of exactly where a line falls, and a bottom-up wash reaching much further up (62% instead of 30%) so the button row is covered even centred mid-height. A new `.gp-hero-copy` class adds a soft text-shadow behind the headline block itself — insurance under the scrim, not a replacement for it, so a word stays legible even wherever the gradient math doesn't quite reach.

The "Watch Our Story" button specifically had no background of its own (an outline button, by design, so it doesn't compete with "Explore the Mall"'s solid fill) — meaning it depended entirely on the scrim to stay readable. Gave it a translucent dark backing plus a light blur (`bg-brand-primary-dark/35 backdrop-blur-[2px]`), scoped to this one hero instance only (the shared `Button` component's `outline` variant is untouched, since it's used elsewhere on the plain page where it doesn't need this).

## A richer green, still green

`.gp-bar-gradient` (the header's own background, `app/globals.css`) gained a soft warm radial glow low on the left — behind the logo, in the brand's own copper accent, not a new colour — plus a brighter top sheen and a slightly wider-contrast diagonal underneath, instead of one fairly flat fill. No hue change, just more depth.

## The photo's softness — a real ceiling, not something code can fix

Bumped the hero WebP quality (`scripts/sync-images.ts`) from 80 to 90 and re-ran the sync — the two hero files are now noticeably larger (245KB→375KB mobile, 300KB→465KB desktop) for less compression softness, a genuine small improvement. But the manifest confirms the actual limit: the source photo is 1672×941 natively. Stretched across a 1920px+ monitor (now that the hero runs full-bleed instead of being masked to 70% width), no amount of compression tuning changes that it's being scaled up past its own resolution. The only real fix is regenerating the source at a higher native resolution — the guidance from the previous slice (landscape ~1536×1024 or larger, portrait ~1024×1536 for mobile) still stands; if ChatGPT's own output is capped, asking it for the largest size it offers, or running the result through an upscaler afterward, would help more than anything on the code side.

## Verified

Desktop (1440×900) and phone (390×844): ribbon gone, header flush with no gap in either state (confirmed by eye and by `getComputedStyle`), rest and condensed-on-scroll both checked, "Welcome to GiftPing Mall" and "Watch Our Story" both clearly legible, the richer green visible in both states. `tsc`, `eslint`, `vitest` (291, confirming nothing depended on the removed `announcement` field) and `next build` all clean.
