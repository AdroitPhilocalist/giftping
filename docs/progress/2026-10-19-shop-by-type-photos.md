# `/shop`'s cards were all empty — ChatGPT prompts for the 25 types, and artwork that wires itself in (19 Oct 2026)

**Report:** "when I go to shop by type, every card is empty right now… not very well styled." Every other
browse page has real artwork (`/categories`, `/mall`, the boutiques), and the client wanted the same for
`/shop` — plus, explicitly: *"keep the coding such a way that once I generate a particular image and save in a
particular folder with a particular name, that will be automatically adjusted."*

Both halves were real. `/shop` genuinely had no imagery at all, and the reason was structural, not cosmetic —
`ProductTypeCard`'s own header comment said it: *"the plain icon-medallion card style, since product types
don't (yet) have delivered artwork the way occasion categories do (see CategoryCard)."* The occasion cards get
theirs from a `world-<slug>` key in `lib/content/imagery.ts`; there was simply no equivalent key for types.

## What was built

**1. A new artwork namespace, `type-<slug>`** (`lib/content/imagery.ts`) — the product-type twin of
`world-<slug>`. A separate namespace on purpose: `world-wedding` is the Wedding *occasion* banner,
`type-wedding-festive` is the Wedding & Festive *type* card, and they must never collide.

**2. `ProductTypeCard` takes an `image` and, when one exists, draws a full-bleed photo card** — literally the
same markup as `CategoryCard`'s photo branch, so `/shop` and `/categories` are visually the same kind of page.
No new CSS at all: it reuses `components/motion/WorldCard.tsx` + `.gp-world`/`.gp-world-frame`/`.gp-world-photo`/
`.gp-world-sheen`, already live on two other pages. With no artwork it keeps today's icon-medallion card, so a
type whose picture hasn't been generated yet is never a broken-looking card — the drop-in is per-card.

**3. `/shop` passes `siteImage(\`type-${t.slug}\`, theme.id)`** (and now fetches the active theme alongside the
types, in one `Promise.all`) — the exact call `/categories` already makes for `world-<slug>`.

**4. Batch 7 in `docs/design/asset-prompts.md`** — 25 prompts, one per top-level type, numbered in display
order with the first 12 flagged (those are the ones the header's own "Shop by Type" menu shows). File name,
type name, and the objects/scene for each; a shared composition paragraph (paste once) covering the things
that actually matter here: one hero subject (these are read as thumbnails in a grid of 25), the bottom strip
left uncluttered (the card writes the type's name over it), a plain top-left corner (the badge sits there), and
**absolutely no text on any object that normally carries it** — book spines, game boxes, mugs, screens, jars,
plaques, tags. That last one is batch-specific: plenty of these categories are *about* objects that are
normally covered in writing, and the style line's generic "no text" doesn't spell that out.

## Decisions worth recording

- **The client chose the look, before any prompts were written** — "match the occasion cards" over a bespoke
  fifth card idiom or a boutique-style top band. That choice had to come first: the card's shape is what the
  prompt asks ChatGPT for (landscape here, exactly like the `world-*` set — same component, same crop).
- **Two things are deliberately NOT copied from `CategoryCard`:** its `ViewTransition name={\`world-${slug}\`}
  share="gp-door"` (the card is a *door* that grows into its own page's header photo — a product-type page has
  no such photo, so the name would dangle with nothing to match), and its `Ambience` (that artwork is keyed by
  occasion, and a product type isn't one).
- **`/shop` and `/categories` now share one card treatment.** That's a knowing exception to the "every card
  family looks deliberately different" rule the homepage families follow — the rule exists because four
  families sit side by side on one page; these two are the same kind of destination grid on separate pages, and
  the client picked consistency. Worth remembering if a bespoke treatment is ever wanted.

## Verification (live, not by inspection)

Dropped four stand-ins into `ui-references/batch-1/` (`world-birthday` → `type-cakes-bakery`, `world-for-her` →
`type-flowers-plants`, `world-wedding` → `type-jewellery`, `world-corporate-gifting` →
`type-corporate-branded-gifts`), ran `npm run images:sync`, and:

- the manifest gained **exactly** those 4 keys, at 1600×900 like the `world-*` ones;
- the rendered `/shop` contained **exactly 4** photo cards (`a.gp-world-frame`) and **21** icon tiles, with 37
  `/shop/` links (25 cards + the header menu's 12) — the mix is what proves the per-card drop-in;
- screenshots at 1440 and 414 show both treatments in one grid with a uniform row height (no layout jump as
  photos appear) and no horizontal overflow on mobile (`scrollWidth 399 < 414`);
- then the stand-ins and the generated WebPs were deleted and the sync re-run: **25 icon tiles, 0 photo cards,
  0 dangling image references, and `imagery.manifest.json` byte-identical to the committed one.**

Two things the sync surfaced, both pre-existing and both left alone deliberately: `atrium-layer-{far,mid,near}`
sources are committed in `ui-references/batch-1/` but were never synced (no code asks for those keys — that's
Sprint 4's B5 parallax hero, still on hold), and the sync re-adds them plus three `public/images/*.webp`, which
would have made this change touch 8 files instead of 4. Reverted, so the diff is exactly the three code/doc
files plus `imagery.ts`.

`tsc`, `eslint`, `npm run build` and **580/580 tests** clean; `/shop` is still `ƒ`, and the build has the same
4 static files (`apple-icon.png`, `icon.png`, `manifest.webmanifest`, `robots.txt`) and nothing else static.

Next.js's dev overlay warns that on `/shop` the first type image becomes the LCP and suggests `loading="eager"`
— **not changed**, because `CategoryCard` has behaved the same way since `/categories` shipped and the two
should keep behaving identically; worth doing to both together as a small image-priority pass if it ever
matters.

## Left to do

The prompts are written but **no pictures exist yet** — the page stays icon tiles until the client generates
them (any number, in any order; `npm run images:sync` after each batch does the rest).
