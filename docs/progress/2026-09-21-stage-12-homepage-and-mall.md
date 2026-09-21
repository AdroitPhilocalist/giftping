# Stage 12 — slice 2: homepage, mall directory, placeholder art (2026-09-21)

**Approach**: the client's illustrated/photographic artwork doesn't exist yet, so every page ships with **placeholder art drawn in code** (themed SVG) that looks finished today and drops out automatically when a real image exists. Nothing about a page changes when artwork arrives.

**Image handoff** — `npm run images:sync` converts whatever PNG/JPG the client generated in `ui-references/batch-1/` (sub-folder = theme, e.g. `batch-1/diwali/hero-atrium.png`) into optimised WebP in `public/images/` and rewrites `lib/content/imagery.manifest.json`. Components ask `siteImage(key, themeId)` (`lib/content/imagery.ts`) and get `null` (draw the placeholder) until the file exists; a theme's own artwork wins over the native one. Keys are listed in `docs/design/asset-prompts.md`.

**Placeholder art (components/art/)**: `AtriumScene` (the hero: skylight, balconies, fairy lights, glowing shop arches, gifts that float, a platform of gifts and flowers; left third kept calm for the headline), `MallMapArt` (floor plan with nine places, fountain, trees, entrance), `ShopfrontArt` (a boutique front with a sign showing its name), `DiaryArt`, `GiftBoxArt`/`GiftBoxShape` (four tones), `Robin`. All colours are theme tokens, so a festival theme re-lights them.

**Pages**
- **Homepage**: hero (art dissolving into the cream page via an image mask, headline with the copper italic *Emotions.*, two CTAs, a floating search + occasions card), the admin banner carousel, "Discover Meaningful Gifting" (four cards with round icon badges), "Trending in the Mall" (restyled product cards), "Boutique Avenue" (shopfront cards showing each vendor's own banner or a drawn one, logo hanging over the corner), and the diary band with the robin.
- **`/mall`** (new; "Explore Mall" now points here): the client's directory layout — headline left, floor plan centre with numbered hotspots, numbered list right. The nine places are real destinations (Birthday World, Wedding Pavilion, Anniversary Lane, Boutique Avenue, Gifts for Her/Him, Corporate Lounge, Gift Atrium, Grand Entrance) defined in `lib/mall.ts` with positions for both the drawn plan and the client's illustration. Markers are real links (keyboard-focusable), hover/focus lights the marker, list row and a live caption together, and **Take a Tour** walks the places and stops the moment the visitor touches anything (off for reduced-motion visitors).
- **Category pages** become "worlds" ("Birthday *World*" in copper italics, robin and gifts); **/categories** is a set of place tiles; **boutique pages** get a shopfront hero when no banner is uploaded.

**Lessons fixed along the way**
- Scroll-reveal hid content until the page hydrated, so the first screen could appear blank/half-faded. Two changes: above-the-fold uses a pure-CSS entrance (`.rise`, plays at first paint), and `Reveal` now only hides content that is BELOW the fold (visible by default, so no flash, no JS needed for crawlers).
- A `position:absolute` icon badge was clipped by its parent's `overflow-hidden` — clip the image layer, not the container the badge overlaps.
- The test browser pane reports `visibilityState: hidden` when the app window is behind, which freezes CSS transitions and IntersectionObserver — scroll-reveal cannot be verified visually then.

**Not done yet (next slices)**: product page (Personalise Your Gift + wrapping-style tiles + delivery countdown), order tracking "surprise" page, diary desk redesign, cart/checkout polish, About/Contact/Privacy/Terms/Refund pages, "My orders" list, theme scheduling admin, and swapping in the real artwork.
