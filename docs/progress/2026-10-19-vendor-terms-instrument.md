# The vendor terms page, as an instrument (19 Oct 2026)

**Report:** *"the terms and conditions page should not feel boring… like in real life, terms and conditions
pages are written on stamp papers or court papers… or an ancient scroll… make this as a component so we can
use the same styling anywhere other than this page as well."*

The page was a `LegalPage`: a hero, a draft notice, and eleven numbered sections in a 3xl column. Correct,
readable, and indistinguishable from every other policy on the site.

Both of the client's references are the same instinct — **a legal document should look like an object, not a
web page** — so the page is now neither a literal parchment nor a photocopied court stamp, but an
**instrument**: warm laid paper, ruled down the margin, numbered in the gutter, sealed at the foot and held
between two brass rods. That reads as "official record" at a glance, keeps the body copy in ordinary web
type at a real reading measure, and — unlike a scroll or a scanned stamp paper — survives a 390px screen,
dark themes, and a printer.

## What is on the page

- **A docket header**, not a hero: `The small print ————— GiftPing · Legal`, then the h1, one line of intro,
  and a **DRAFT rubber stamp** (rotated, double-ruled, pressed in with a 0.7s settle). The stamp is
  `SITE.legalReviewed` — the same flag that already drove the plain "Draft" box — turned into the page's
  most distinctive mark instead of a compliance afterthought, and it disappears by itself when the client's
  advisers sign the text off.
- **A paper sheet** (`components/legal/legal.css`): `--gp-surface` tinted by a `--gp-peach` wash, an SVG
  fractal-noise fibre layer at ~3% behind the text, a tucked shadow under the top rod, and two turned brass
  rods whose shading is mixed from `--gp-copper` — so a festival theme re-inks and re-metals the whole
  document rather than fighting a hardcoded parchment.
- **A printed masthead** (`GiftPing / Vendor terms`, monogram, issued date, clause count, reading time), a
  double rule, then **"at a glance" particulars** in a ruled 2×2 table.
- **Eleven clauses**, numbered `01`–`11` in the margin beside a double margin rule on large screens (the
  number moves above the heading on mobile), each heading linkable via a `#` anchor that is faint on touch
  and appears on hover/focus on pointer devices.
- **A foot**: the issuer's signature in the diary kit's existing Caveat face, a wax seal (deterministic
  hand-pressed outline, token-coloured, ribbon tucked under it), the "reading this doesn't accept the terms"
  line, the CTA pair, *Print this copy*, and `End of record · 11 clauses`.

## What was added for reading, not decoration

- **A clause index that knows where you are.** A sticky rail on `xl` (fourteen and a half rem, sticky under
  the header) and a collapsible index card on smaller screens; the active clause is computed from real
  scroll position — "the last heading that has passed under the header" — and marked with a copper rule.
  It closes itself after a jump on mobile. A long instrument without an index can only be read
  top-to-bottom.
- **Reading time and clause count, derived** (`lib/legal/reading-time.ts`, with tests): 200 wpm over the
  headings, paragraphs and list items, floored at one minute, skipping `{ node }` bodies. Nothing hardcoded.
- **Print is a first-class state.** The rods, docket, stamp and index are dropped; the sheet loses its
  wash, grain and shadow; clauses avoid breaking across pages. The site's own fixed header, trust strip and
  footer are hidden **only while a deed is on the page** (`body:has(.deed-scope)`), because Next keeps a
  route's CSS loaded across client-side navigations and printing any other page must not lose its chrome.
- **Reduced motion**: the stamp is simply present — `animation-name: none`, same opacity/rotation. Verified
  with emulated `prefers-reduced-motion: reduce`.
- **Contrast**: the informational micro-labels (issued date, clause counts, "issued by") were at 45% ink,
  ≈2.8:1; raised to 65% (≈5:1) so the small print is actually legible. Decorative rules stay light.

## Reuse

Nothing in `components/legal/` is vendor-specific:

| Piece | Use |
|---|---|
| `InstrumentPage.tsx` | the whole page: header, index, sheet, clauses, seal, foot, print |
| `InstrumentClauses.tsx` | just the numbered clauses, for an agreement panel or an excerpt |
| `InstrumentSeal.tsx` | the wax seal on its own |
| `PrintButton.tsx` | "print this copy" anywhere |
| `InstrumentContents.tsx` | the scroll-aware clause index |
| `types.ts` / `LegalBodyView.tsx` | the policy body shape + renderer, now shared with `LegalPage` |
| `legal.css` | the paper, rods, margin rule, stamp, seal — all `.deed-*`, all token-derived |

`LegalPage` keeps its exact API and output (the customer Terms, Privacy and Refunds are untouched) but now
imports the shared body types and renderer, so a policy can move between the plain and instrument
treatments without rewriting its content. Switching `/terms` to the instrument is a one-line swap if the
client wants it.

**No new claims.** The "at a glance" block restates four facts that already appear in the clauses (free to
apply; applications and listings are reviewed; commission comes out of the payout; a refund only touches its
item). Every clause is the same text as before. The one content change is a real link: the "Questions"
clause now points at `/contact` instead of naming a page you couldn't reach from there.

## Verified

- `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` — **585/585** (3 new reading-time tests).
- Live at 1440 and 390 (headless Brave over CDP): 11 clauses, 11 index links, rail sticky at 112px, active
  clause tracks a jump to clause 6 and to the foot, no horizontal overflow at either width, no console
  errors.
- Clause links land with the heading 112px from the top on both widths — the first attempt put
  `scroll-mt` on the `<section>` while the anchor target was the `<h2>`, so headings scrolled under the
  fixed header; caught by measuring after a real click, not by eye.
- Print: `Page.printToPDF` at A4 with backgrounds → 5 pages, starting at the document masthead with no site
  chrome, rods or index.
- The other three legal pages still return 200 with their draft notices after the shared-type refactor.

**Build caveat:** at the time of writing, `npm run build` compiles this page successfully but fails its
type-check on files another agent has in progress in the account area (`WelcomeHero.tsx`,
`DeskGrid.tsx`, `app/(shop)/account/page.tsx` — all untracked/modified outside this work). `tsc` on this
subtree was clean before those files appeared; the change set here does not touch them.

This change set was committed on its own, path by path; the account-area work another agent had in the tree at
the same time was deliberately left out of the commit and untouched.
