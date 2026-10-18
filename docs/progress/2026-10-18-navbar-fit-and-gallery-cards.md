# Header fit + a third card idiom: "gallery" prints (18 Oct 2026)

## 1. The header overflow bug

**Symptom.** After "Shop by Type" was added to the main nav (six top-level links now), the basket and the
"My Diary" button spilled past the floating pill's rounded edge — worst on wide screens and, especially,
once the header **condensed** on scroll (the pill shrinks from 90rem to 75rem but the row's contents do not).

**Cause.** The header row is a `justify-between` flex line whose children (logo, nav, action cluster) all
have an intrinsic min-width. When their sum exceeded the pill's inner width, nothing could shrink, so the
last group was pushed out. Measured with Chrome DevTools Protocol at six widths, at rest and condensed:
every width from 1280→1920 overflowed, by 21px (1280 at rest) up to **119px** (condensed at 1920).

**Fix (width guards, in priority order so the nav + basket + Diary always win the space):**

- The logo **tagline** (the widest part of the lockup) shows only from `2xl`; the whole wordmark+tagline
  block (`.gp-logo-text`) is **dropped in the condensed bar** — the monogram alone carries the compact pill.
- The floating pill's cap rose from `90rem` to `92rem`.
- Removed the `2xl` nav padding/divider bumps; the header's own padding is a touch tighter below `2xl`.
- *(Polish, same pass)* nav links now grow a short **copper underline** on hover; the current page keeps the
  full-width copper one.

**Verified** by re-measuring all six widths in both states: content now clears the pill's rounded edge by
24–33px everywhere, and headless screenshots at 1280/1536, at rest and condensed, show the basket and Diary
button comfortably inside the pill (screenshots in the session).

## 2. A third card idiom — "framed prints"

The card families now each have their own character, so the mall's pages don't repeat one effect:

| Family | Idiom |
| --- | --- |
| Boutiques / Shop by Type | **Lit glass** — leans toward you, gold edge follows the pointer (`GlowCard`) |
| Occasions (`/categories`) | **World windows** — still frame, the world inside moves (`WorldCard`) |
| Homepage Discover Cards | **Framed prints** — a mounted picture that grows out to fill its frame (`.gp-gallery`) |

`components/home/DiscoverCards.tsx` wraps its picture in a `.gp-gallery-mat` (the mount) + `.gp-gallery-photo`
(a rounded photo with a thin copper hairline). On hover the photo scales `1.16`, covering the mount and
clipping at the image area — the picture appears to grow **out of** its frame — while the hairline sharpens.
Pure CSS, no pointer tracking, no new component; the growth is switched off under `prefers-reduced-motion`
(the framed state and the hairline stay, so reduced-motion visitors still get a hover cue).

Alternatives considered for this third idiom: a cursor "spotlight" torch (too close to `GlowCard`'s light), a
flip/reveal card (gimmicky), and a lantern halo behind the card (too close to the world-window's outward
light). The framed print is unmistakably its own thing.

## Verification

`tsc`, `eslint`, **565/565 tests** (theme-safety + CSS layer-order guards clean) and `next build` all pass.
Header measured across 1280/1366/1440/1536/1680/1920 at rest and condensed; homepage gallery card captured at
rest and on hover. **Not verified here:** the hover *animation* feel (needs a real mouse), and the door
view-transition (a headless tab aborts it).
