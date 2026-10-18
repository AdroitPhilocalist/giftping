# 16 Oct 2026 — Header logo legibility on the home page

**Complaint:** over the home-page photo, the logo in the top-left of the glass header looked camouflaged.

**Cause:** the glass bar is only a 14–40% dark-green tint (deliberately, so the photo shows through sharp — see `2026-09-29-header-page-aware-glass.md`). The logo art is cream, copper and olive-green mid-tones and the tagline is 8.5px at 60% opacity, so over a warm, blurry photo they had little contrast.

**Fix (`app/globals.css`, `components/layout/Logo.tsx`), scoped to the see-through state only** (`html[data-hero-header="true"]`, not condensed):
- the left end of the glass gradient is darker (0.66 → 0.54 → 0.26, then back to the existing light tint across the middle and right);
- a soft dark drop-shadow halo on the monogram, and a text-shadow on the wordmark and tagline;
- tagline opacity 60% → 80% on the light variant.

**Deliberately unchanged:** the opaque header on every other page, the condensed-on-scroll pill, and the glass tint over the middle/right (the photo still shows through). No `backdrop-filter` (see the earlier log for why).

Checked in the browser at desktop, scrolled, and phone widths.
