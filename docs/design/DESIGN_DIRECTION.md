# GiftPing — Design direction (Stage 12)

_Source of truth for the look and feel. Derived from the client-approved reference screens in `ui-references/` (home, mall directory, occasion "world", boutique storefront, product page, order tracking, gifting diary, mobile home). If a decision here conflicts with a screen, the screen wins — then update this file._

## The idea

GiftPing is **a mall you walk into**, not a catalogue you search. Every screen should feel like a warmly lit, expensive, slightly theatrical place: amber-lit interiors, hanging gift boxes, brass and green, a robin that keeps you company. What separates it from Amazon / Flipkart / Myntra / Ferns N Petals:

| Marketplaces do | GiftPing does |
|---|---|
| Dense grids, white backgrounds, discount noise | Generous space, cream canvas, few things at a time, each one presented |
| "Categories" | **Places** — Grand Entrance, Birthday World, Wedding Pavilion, Boutique Avenue, Gift Atrium, Handmade Studio |
| "Sellers" | **Boutiques with a shopfront** — each vendor has its own storefront banner, logo, story |
| A wishlist | **A personal diary** that remembers the people you love and reminds you before their days |
| Generic stock icons | One character (the robin) and one monogram (GP) used consistently |

## Tokens (default theme: "native")

Sampled from the approved images, not guessed.

| Token | Value | Use |
|---|---|---|
| `canvas` (`brand-light`) | `#FBF6F1` | page background — warm cream, never pure white |
| `surface` | `#FFFCF9` | cards, panels, inputs |
| `peach` (`brand-accent`) | `#F8E9DA` | soft panels, chips, hover fills |
| `ink` (`brand-dark`) | `#1C1916` | text (warm near-black) |
| `primary` (forest) | `#0C2A1D` (dark `#061A11`) | announcement bar, main buttons, footer — very deep green |
| `copper` (`brand-secondary`) | `#B75F22` (dark `#97490F`) | accent words in headlines, links, active states, badges, the robin's breast |

Copper replaces the earlier gold. **Never use raw colours in components** — only tokens (enforced by a test), so a theme can restyle everything.

**Typography** — display serif for every heading, a warm geometric sans for everything else.
- Display: **Newsreader** (variable, optical sizes; roman + italic — the italic carries emotional accent words like *Comes Alive*).
- Body/UI: **DM Sans**.
- Wordmark: `GIFTPING` in the display serif, very wide tracking, small tagline beneath.
- Scale: hero 44–64px / section 30–40 / card title 20–22 / body 15–16 / caption 12–13. Headline pattern: two lines, the second line's key phrase in copper (*A World of Gifts. A World of **Emotions.***).

**Shape & depth** — soft, not flat, not glossy. Cards `radius 20px`, buttons `12px`, chips fully round, hairline borders (`ink/6%`), one gentle shadow (`0 8px 30px ink/6%`), a slightly stronger lift on hover. Images inside cards are rounded and warm-graded.

**Motion** — slow, warm, purposeful (see *Motion* below).

## Page patterns (from the references)

- **Chrome**: dark-green announcement bar (robin + one line + "Track Order | Help & Support"); header with monogram + wordmark, nav (Explore Mall · Occasions · Boutiques · Diaries · Corporate Gifting · About Us; active = copper underline), icons (search, account, wishlist, bag with copper count), dark **My Diary** button. Mobile: bag/search/menu + a bottom tab bar (Home · Categories · Cart · Wishlist · Account).
- **Hero**: a full-bleed photographic scene (mall atrium / boutique shopfront / birthday world) fading into the cream canvas on the left where the headline sits; a floating search-and-occasions card overlaps its bottom edge.
- **Cards**: image on top (rounded), a small round icon badge overlapping the image's lower-left corner, serif title, one grey line, copper "Explore Now →".
- **Trust strip**: a quiet row of five line-icon + two-line items above the footer on every shopping page.
- **Mall directory**: an illustrated isometric floor plan with numbered hotspots + a numbered list; hover/tap a number highlights the place; "Take a Tour".
- **Boutique storefront**: shopfront photo as hero, info card floating on the right (established, ships to, rating, response time, Follow), tab row (Featured · All · Best Sellers · New · Luxury · Corporate · Personalised), collection cards.
- **Product page**: gallery left, buy box right with a **Personalise Your Gift** block (note, recipient, occasion chips, **wrapping style tiles**), delivery countdown, robin "Need help choosing?" band.
- **Order tracking**: "Your surprise is on its way!" hero with the wrapped box, a five-step progress rail, gift preview / personal note / wrapping cards.
- **Diary**: a personal desk — sidebar (robin + quote), Upcoming Moments, Smart Suggestions, Gifting Score ring, calendar, people list.

## Theming (the hard requirement)

**Goal:** a Diwali or Christmas makeover is a *small, additive change* — never a redesign, never a risk to the shop.

Layers (each only depends on the one above it):
1. **Theme tokens** — CSS variables `--gp-*` in `app/globals.css` (`:root` = native). A theme is a `:root[data-theme="<id>"]` block (`:root[…]`, not bare `[…]`: it must out-rank the default `:root` block) that overrides any of them: colours, radii, shadows, display font, ornament colour, hero scrim, motion feel.
2. **Tailwind tokens** map to those variables (`@theme inline`), so `bg-brand-primary`, `text-brand-secondary`, `rounded-card`, `shadow-card`, `font-heading` restyle at runtime with no rebuild.
3. **Components use tokens only.** A guard test fails the build if a component contains a hex colour or a raw palette class (`bg-white`, `text-black`, …).
4. **Ornaments are code** (`components/ornaments/*`): SVG patterns, dividers, garlands drawn with `currentColor`/`var(--gp-ornament)`, so they recolour automatically and cost almost nothing to load.
5. **Theme extras** live in the registry `lib/theme/themes.ts`: display name, announcement-bar line, optional decoration component (falling petals, snow, diyas), image overrides. Anything not overridden falls back to native.
6. **Imagery** is looked up through `lib/content/imagery.ts` (`imagery.hero`, with optional per-theme override), never hard-coded in a component.
7. **Activation** — `data-theme` is set on `<html>` by the server from the active theme (scheduled start/end in admin, like banners) or an admin-only preview.

**Adding a festival takes four steps and touches no page:**
1. `app/themes/<id>.css` — override the tokens you want to change.
2. Register it in `lib/theme/themes.ts` (label, announcement line, optional decoration).
3. Drop artwork in `public/themes/<id>/` and map it in `imagery.ts`.
4. Schedule or preview it.

## Motion principles

Slow and warm (400–700ms, ease-out), never bouncy. Things *arrive* (fade-up as they enter the viewport), *breathe* (a gentle 6–8s float on hanging gift boxes / the robin), and *respond* (hover lift, soft glow). One signature moment per page at most. Everything is switched off under `prefers-reduced-motion`. No autoplay video. Animate `transform`/`opacity` only.

## Imagery plan (what ChatGPT makes, what code makes)

- **Code**: ornaments, dividers, icon badges, patterns, gradients, the wordmark, festive decorations (SVG).
- **ChatGPT (photographic / illustrated)**: hero scenes (mall atrium, boutique shopfront ×N, birthday world, wedding pavilion…), the isometric mall map, robin poses, product-photo placeholders, collection thumbnails, the hero for each "world". All in one shared style line so they read as one place. Prompts are in `docs/design/asset-prompts.md`.
- Every image is mapped in `lib/content/imagery.ts`; swapping one never touches a component.

## Performance & accessibility (non-negotiable)

Mobile-first at 375px. Hero images ≤ ~250KB WebP (via `next/image`), everything below the fold lazy. Text on photos always sits on a scrim that passes contrast. Focus rings visible, all motion optional, semantic landmarks, alt text from data.
