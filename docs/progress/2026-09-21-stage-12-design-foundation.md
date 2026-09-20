# Stage 12 — slice 1: design foundation and theming (2026-09-21)

**Direction** (`docs/design/DESIGN_DIRECTION.md`): a mall you walk into, not a catalogue — derived from the client-approved reference screens. Palette was SAMPLED from those images (canvas `#FBF6F1`, deep forest `#0C2A1D`, **copper** `#B75F22` replacing the old gold), display serif **Newsreader** + **DM Sans**.

**Theming architecture (the hard requirement — a Diwali/Christmas makeover must be additive and safe)**
- Colours, radii, shadows, fonts, ornament colour and motion feel are CSS variables `--gp-*` (`app/globals.css`); Tailwind's `brand-*` utilities read them at runtime (`@theme inline`), so every existing class became theme-able without editing a component. New tokens: `brand-surface` (cards; replaced 90 hard-coded `bg-white`), `brand-on-primary`, `brand-on-secondary`, `rounded-card`, `rounded-button`, `shadow-card`, `shadow-lift`.
- A theme = `app/themes/<id>.css` (`:root[data-theme="<id>"]` overriding variables) + an entry in `lib/theme/themes.ts` (+ artwork mapped in imagery later). `app/layout.tsx` sets `data-theme` from `getActiveTheme()`. Unknown/removed theme ids fall back to native.
- **Proven, not assumed**: `/design` has a preview switcher; switching to the test themes `demo-night` (dark canvas) and `demo-jewel` (plum + gold, pill buttons) restyled the real header, footer and every component from variables alone — no component changed. Doing it found a real bug (theme blocks had the same CSS specificity as `:root` and lost) — fixed by `:root[data-theme]`, and recorded in the docs so it can't recur.
- **Guard test** (`lib/theme/theme-safety.test.ts`): fails the build if a component contains a hex/rgb colour, `bg-white`, or a non-brand palette colour (allowed: red for errors, photo scrims, and lines marked `theme-safe:` with a reason). It immediately caught three real spots (Google logo colours → documented exception; a category-card fallback colour → token; the Razorpay window colour → read from the active theme's `--gp-primary`).

**Built**
- Base components restyled to the reference (Button variants primary/secondary/**outline**/gold(=accent)/ghost, Card, inputs, radius/shadow tokens).
- Chrome: announcement bar (robin + line from the active theme + Track Order | Help & Support), **Logo** (type-based mark until the real logo file exists), header with active-link copper underline, **working mobile menu** (the old button did nothing; Radix dialog, closes on navigation), **mobile bottom tab bar** (Home · Categories · Cart · Wishlist · Account), **TrustStrip**, restyled footer with a jaali pattern. Header layout verified at 375 / 1100 / 1280 / 1700px (no overflow; full nav from 1280px, hamburger below; tagline only on very wide screens).
- Ornaments in code (`OrnamentDivider`, `Jaali` lattice) recolour with the theme; `Reveal` scroll-in animation (content is in the HTML; respects reduced motion; `<noscript>` fallback).
- `/design` live style sheet (public, `noindex`): colours, type, buttons, cards, ornaments/motion, theme switcher.
- `docs/design/asset-prompts.md`: Batch 1 artwork prompts for ChatGPT (hero atrium, isometric mall map, homepage cards, robin poses, monogram, wrap swatches, relationship portraits) with sizes, file names and one shared style line.

**Known gaps found (not built yet)**: `/about`, `/contact`, `/privacy`, `/terms`, `/refunds` don't exist though the nav/footer link to them; there is no "My orders" list page; category circles still use seeded per-category colours (replaced when the homepage is rebuilt); the admin/vendor portals are intentionally functional-only.

**Next slices**: theme scheduling + admin preview (DB `site_themes`, `/admin/themes`); homepage + `/mall` directory; boutique storefront; product page (personalise + wrapping tiles); order tracking; diary desk; cart/checkout; static pages; `imagery.ts`; performance pass.
