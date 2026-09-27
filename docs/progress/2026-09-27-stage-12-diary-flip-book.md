# Stage 12 (slice 13) — the diary becomes a real book you flip through

> Superseded in part by `2026-09-27-stage-12-diary-front-spread-and-page-corners.md`: the Contents page and the pager under the book described below were replaced (the front spread now shows everything in small; turning is written on the pages).

The feedback: the redesigned diary now *fit* the window, but both pages had to be scrolled inside, and the robin at the top right had its head cut by the navbar. "Use what a diary actually is — multiple pages. Flip them. As people and dates are added, add more pages. No vertical scrolling."

## What changed

`/diary` is no longer one dashboard squeezed into two pages. It is a **book of numbered pages**, shown two at a time on a big screen (one at a time on a tablet or phone), and you turn them.

| Pages | Spread | What is on it |
|---|---|---|
| 1–2 | **Today** | Front page (whose diary, the next 3 moments as tickets, gift plans in progress) + **Contents** (what is on which page; tap a line to turn straight there) with "Add a person / Add a date" |
| 3–4 | **Month** | The paper calendar (arrows change month, tap a marked day) + **Coming up** (the agenda, max 7) |
| 5–6 | **Ideas** | Gift ideas for the nearest two moments that have no gift yet, four each |
| 7–8… | **People** | Polaroids, six to a page; a person added past six adds a page; the last page always has "Someone else on your mind?" so the book ends on an even number |
| next | **Year ahead** | Twelve mini months, Jan–Jun on the left, Jul–Dec on the right, the month you are in marked with a ribbon |
| next | **Score** | Gifting Score in wax + this year so far, and "Your Gifting Year" (moments remembered, people made happy, favourite occasion, the people who made it special, share) |
| last | **Log** | What you gave lately (six most recent, with what they said) + the back page (add someone, look at another year) |

So the book **grows with use**: more people ⇒ more People pages (`PEOPLE_PER_PAGE = 6` in `components/diary/pages/PeoplePages`), each new spread appears in the pager dots and the Contents page renumbers itself. Nothing scrolls on a big screen: each page is laid out for the space it has.

## The turning

- Two-page mode (≥ 1280px wide and ≥ 720px tall): a **leaf hinged at the spine**. `rotateY` ±180° over 1s, `backface-visibility` so its back is the next page, a moving shade that darkens as the leaf lifts, the stack of paper edges on each side thickening/thinning with where you are in the book, and a small lift of the whole book while it turns. Turning back is the mirror image.
- Single-page mode: the leaf is hinged at its left edge.
- Ways to turn: the pager under the book (arrows and dots), the coloured **section tabs** (jump to Today / Month / Ideas / People / Year / Score / Log), the dog-ear at the page corner, the **Contents** page, arrow keys, and a horizontal swipe on touch. `prefers-reduced-motion`: the page changes with no animation.
- The URL is the bookmark: `history.replaceState` writes `?p=<spread>` (so a refresh, and a link from another page, opens the right spread). `/diary/people`, `/diary/year` (no year), `/diary/review` (no year) now redirect into the book.
- The robin's head is no longer cut: the book has room above it (`xl:pt-10` and a `--dy-chrome` of 16.1rem), and the pager caption sits beside the arrows so the whole thing — book, pager, caption — fits a 900px-tall window with the header.

## Decisions worth remembering

1. **Pages are components, not one big layout cut in half.** `components/diary/pages/*` are single-page components; `buildSpreads.tsx` decides which two sit together. Adding a page type (e.g. "Memories") means one component and one entry in `buildSpreads`.
2. **Everything is server-rendered data, the book itself is a client component** (`DiaryBook`). The server page builds `SpreadDef[]` (`{id, tab, label, left, right}`) from `lib/diary/home-book.ts`; the pages are already-rendered React elements passed as props, so no function props cross the boundary. Constants shared with server code (`TAB_META`, `tabHref`) live in `flip/tabs.ts`, not in the `"use client"` file — a constant exported from a client module isn't usable in a server component.
3. **The mode (spread or single) comes from a media query read with `useSyncExternalStore`**, whose server snapshot is "spread" — the server can't know the window. The book therefore stays invisible until the browser has measured (`data-ready`) and then fades in; without that a phone briefly saw a collapsed two-page book.
4. **Container queries, not viewport queries, decide what a page shows.** A page is a `container-type: size` box on a big screen, so `.dy-hide-short` / `.dy-hide-tiny` drop the least important blocks (a third gift plan, the 7th agenda row) when the window is short, instead of a scrollbar. In single mode the page is `inline-size` only and scrolls inside — that is the honest behaviour for a phone.
5. **A turn always finishes.** A 1250ms safety timer completes it if `animationend` never fires (a backgrounded tab), so the book can never be stuck mid-turn.
6. **The person, year and review pages still use the older two-page `Book`** (they are deep views with a lot of data, reached from a link) — they have the same section tabs, and the tabs link back to the right spread (`tabHref`). Turning each person into their own multi-page section is the natural next step.
7. Two links that pointed at "the diary" from inside the book (`See the whole year`, `Look at another year`) now carry an explicit year, otherwise the new redirects would send them straight back into the book.
8. A rule that cost time: **utilities beat `@layer components` rules**, so a phone-width override of a padding set with a utility (`pr-[11.5rem]`) needs `!important` in the layer.

## Tablet and phone

Single page, portrait, the cover hugging it (`max-width: 38rem`), the pager as a dark pill riding at the bottom of the screen (above the phone tab bar), tabs as chips above. A page that has more than fits is scrollable inside; the welcome page's header rearranges for a phone width (ribbon + wax only, no tag).

## Files

New: `components/diary/flip/{DiaryBook,ContentsRow,tabs}`, `components/diary/pages/{WelcomePage,ContentsPage,MonthPages,IdeasPage,PeoplePages,YearPages,ScoreReviewPages,LogPages,PageBits,buildSpreads}`, `lib/diary/home-book.ts` (pure view-model), the flip CSS block in `components/diary/diary.css`. Removed: `HomeSpread`, `HomeHeader`, `PeopleBrowser`, `PeopleShelf`. `/design/diary?p=<spread>` shows the book over sample data (development only).

## Verified

`tsc`, `eslint`, `vitest` (291) and `next build` clean. In a real browser at 1440×900 and 1440×780: all seven spreads fit with no internal scroll, the turn animation frozen mid-flight at 430ms shows the leaf rising past the spine with the next page underneath, the URL follows the spread. 1024×768 (single page, hugging cover, pager visible) and 390×844 (phone header fixed after a screenshot showed the ribbon over the title). **Not verified**: the real signed-in `/diary` with the seeded data (the sign-in wall — the design gallery renders the same components); a real trackpad swipe; the feel of the animation timing on real hardware.
