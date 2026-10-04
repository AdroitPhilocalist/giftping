# 4 Oct 2026 — Diary polish: C1 (wax-seal & tape-peel moments), C2 (countdown ribbons)

## C2 — Countdown ribbons
"12 days to Mom's birthday" is now a gift ribbon that visibly fills (pulls tighter) the closer the date gets — the same recipe as the shop's own
free-delivery ribbon (`components/shop/DeliveryRibbon.tsx`), re-themed in diary paper/copper rather than invented from scratch.

- **Pure logic**: `lib/diary/countdown.ts` (tested, 8 tests) — `ribbonPercent(daysAway, horizonDays=60)` (0 at 60+ days out, 100 today; 60 matches the diary's
  own existing "next 60 days" horizon, not a new number) and `countdownPhase` (reuses DateCards' existing 14-day "soon" threshold rather than inventing a
  second one that could drift from it).
- **Component**: `components/diary/DateRibbon.tsx` + `components/diary/art/Bow.tsx` (the same bow drawing `DeliveryRibbon` rides, so the app's two
  "ribbon filling up" moments read as one idea). `size="lg"` on tickets (`MomentTickets`, used by both the dashboard and the front page), `size="sm"`
  inline on each date card (`DateCards`) and in the plan header (`PlanSheet`).
- **Today = confetti**: a small one-shot burst of paper confetti plays the moment a ribbon reads "Today" — plain CSS (`.dy-confetti`, 6 pieces, each just
  a colour/delay/flight-path/spin), no JS, so the site-wide reduced-motion rule neutralises it automatically.
- **A real name collision caught before it shipped**: `.dy-ribbon` already existed (the bookmark hanging off the page). The new classes are `dy-count-*`.

## C1 — Wax-seal & tape-peel moments
- **Marking a gift "Given" stamps a wax seal** (`PlanSheet`): the existing `WaxSeal` art (used elsewhere for the Gifting Score and privacy marks) now
  stamps down next to "Given with love" — but only for the person who just pressed the button, not on every later visit. This needed a real fix along the
  way: `PlanSheet` is deliberately remounted (its own `key` includes `status`) the instant the status changes, so plain component state set inside the
  click handler was erased before the seal ever painted — caught by actually clicking through it, not by reasoning about the code. Fixed with a one-shot
  `sessionStorage` flag (`dy-just-given:<planId>`) set right before `router.refresh()` and read-then-cleared on the fresh mount, so it survives the
  remount but never replays on a later visit or reload (wrapped in try/catch — private browsing just means no stamp, nothing else breaks).
- **Adding a person lays a polaroid down with a tape-peel** (`components/diary/person/NewPersonReveal.tsx` + new CSS keyframes): the redirect after
  creating someone now carries a one-shot `?welcome=1`; the person's own page captures that into local state once at mount (so the URL cleanup that
  follows can't interrupt the animation), plays the drop-in + tape-peel, and immediately strips the query param via `router.replace` so a refresh or the
  back button never repeats it.

## Verified live (real account, real data — added then removed afterward)
- Ribbons at 9/18/26 days away (design fixtures) show visibly different fill — the closer date reads as tighter.
- Added a real contact ("Ribbon Test"): the polaroid dropped and its tape peeled in; a refresh of the same page showed it sitting still, not replaying.
- Added a real birthday dated today: the ribbon on the ticket, the date card and the plan header all read 100%/"Today!", and confetti fired in all three
  places at once.
- Walked a real plan through Idea → Chosen → Ordered → Wrapped → Given: the wax seal stamped the moment "Given" was reached; a fresh tab opened straight
  to the same page showed "Given with love" with no seal (the one-shot sessionStorage flag correctly didn't replay it).
- Cleaned up: removed the test date and the test contact; cleared the test plan along the way.
- tsc, eslint, production build, and 516/516 tests (8 new) all clean.

## Not verified
- Real-device touch feel of the confetti/reveal timing (desktop browser only).
- A person added on a slow connection where the redirect and the first paint are further apart — the capture-at-mount approach should still work since
  `justAdded` comes from the URL at request time, not from timing, but it wasn't tested under throttling.
