# The desktop navbar now floats as a pill from first paint — a real reversal, done on a clearer reference

The developer shared a fresh reference image of the homepage: a rounded, inset dark-green pill navbar
floating over the hero photo with margin on every side (including the top), pipe-separated nav links, and
no announcement strip above it — and asked for the navbar to match it exactly, with the text clearly
legible.

**Worth being honest about up front**: this reverses a decision from the last stage's own log
(`2026-09-28-stage-12-navbar-redesign.md`), which explicitly said the always-floating-pill idea "was tried
first and corrected same-day" in favour of a flush-at-rest bar, citing the client's own approved mockup.
Re-checked every mockup in `ui-references/` while working on this — six separate approved pages (mall,
product, order-tracking, boutique, diary dashboard, and the homepage itself) all show an announcement strip
+ a nav row on whatever's behind it (cream page background on most pages, the hero photo directly on the
homepage). None of them show a rounded, margin-inset pill shape. The new reference the developer just
shared is a different design again: a pill, no announcement strip at all. Given how directly and
specifically it was requested ("implement the navbar exactly like this"), this session matched it — but
it's flagged here plainly so a future session (or the client) doesn't read the old log and the new pill and
assume they were always consistent. **If this turns out to be a step away from what's actually approved,
it's a one-file CSS change to put back** (the previous rules are quoted in the diff/git history, not
deleted from anywhere else).

## What actually changed

- **`app/globals.css`**: `.gp-header-inner` now floats as a rounded, inset pill (`border-radius: 999px`,
  centred, `width: min(90rem, calc(100% - 2.5rem))`, `margin-top: 1rem`) from `lg` (1024px) up, at rest —
  not only once `data-condensed="true"` on scroll. Below `lg`, nothing changed: the bar is still flush
  full-width, exactly matching the client's own approved *mobile* mockup, and still condenses to a pill on
  scroll same as before. The condensed (scrolled) state above `lg` is now just a tighter version of the
  same pill shape it already started as, so nothing visually jumps between the two — it just tightens.
- **`components/layout/Navbar.tsx`**: no longer renders `AnnouncementBar` (removed the import and the
  `announcement` prop it threaded through from `app/layout.tsx`/`theme.announcement`). The reference image
  has no room for a strip above a pill that already floats with its own top margin. `AnnouncementBar.tsx`
  itself is untouched and still exists, just unused — cheap to bring back if this was the wrong call.
  Also added a `BookHeart` icon to the "My Diary" button, matching the reference.
- **`components/layout/NavLinks.tsx`**: nav items are now separated by a thin `|` (low-opacity cream),
  matching the reference's look at rest; the existing rounded-pill hover/current-page highlight per link is
  untouched, so the interaction quality doesn't regress, only the static appearance gained dividers.
- **A real bug found and fixed along the way**: the first pass at the new pill width (`min(80rem, ...)`)
  was too narrow for the actual content (logo + 6 nav links with new dividers + 4 icons + the "My Diary"
  button) — confirmed live by checking `scrollWidth` vs `clientWidth` on the pill (1335px of content in a
  1278px box), which showed up visually as "My Diary" getting cut off to just "My" past the pill's rounded
  edge. Fixed by widening the pill's cap to `min(90rem, ...)`, re-verified with the same DOM check and a
  screenshot showing the whole button and icon inside the pill with room to spare.

## Live-verified, not just eyeballed once

Checked against the running dev server, not just read from the diff:
- The homepage at the reference image's own approximate aspect ratio — side-by-side, the shape, spacing,
  dividers, icon layout and "My Diary" button now match closely.
- A non-hero page (`/mall`) — the same pill reads just as clearly over a plain cream background as over the
  photo, confirming the "one fixed colour, never transparent" principle still holds with the new shape.
- Scroll behaviour — the pill tightens further on scroll exactly as it did before, no jump introduced by
  starting from a pill instead of a flush bar.
- The Occasions mega-menu — still opens correctly positioned directly under the (now differently-shaped)
  pill.
- Mobile (375px) — completely unaffected, still the flush bar from the approved mobile mockup.
- Full regression: `tsc --noEmit` clean, `npx eslint .` clean, `npx vitest run` — 291/291 passing (includes
  `lib/theme/theme-safety.test.ts`, confirming no raw colours were introduced), `next build` clean.

## What wasn't touched, and why

`lib/theme/themes.ts`'s `announcement` field on each theme is now dead data (nothing renders it) but was
left in place rather than ripped out — no admin UI edits it directly, so it's harmless, and removing it
would touch every theme entry for a saving of a few unused lines. Not worth it in the same pass as a visual
change that might itself need to be revisited.
