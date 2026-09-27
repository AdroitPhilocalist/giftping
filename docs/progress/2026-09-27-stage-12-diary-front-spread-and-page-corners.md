# Stage 12 (slice 14) — the front spread greets you with everything, and the page turns from the page

Feedback on the flip book: it looked great, but (1) the first two pages had gone bland — a contents list and a list of plans — where the old front page was the thing that made people want the diary; (2) the pager under the book (dots, arrows, "pages 3–4") made turning a page feel like operating a website, not a diary. "The user should not be looking for something below the diary to turn the pages", and the contents page "is not required at all".

## The front spread (pages 1–2) — everything, in small

The old front page had a lot on it, which is why it was so tall. It is back, **summarised**, and each summary has a "see more" written on it that turns the book to the full page:

| Page 1 | Page 2 |
|---|---|
| "Priya's Gifting Diary", the ribbon and wax seal ("Only you can open this") | **Gifting Score**: the wax seal, four slim bars (one per factor), the next best action, the streak chip — "How it's scored →" turns to the Score spread |
| **Next 3 special moments** as torn tickets; a ticket whose gift plan is under way shows its five steps and "Chosen · Scented Candle Set" instead of "Choose a gift" | **This month**: a compact paper calendar (tap a circled day), the "2026 so far" scrap, a memo — "Open the month →" |
| **Gift ideas for Mom's birthday**: three polaroids — "See more →" turns to the Ideas spread | **My people**: up to six polaroids with days-to-go; a seventh person turns the last tile into "+N more"; "See everyone →", "Add a person" |

The Contents page and the "Gift plans" list are gone (plan progress lives on the tickets; the Month page still lists what is coming up). `components/diary/pages/FrontPages.tsx` builds both pages; `flip/TurnLink.tsx` is the client "turn the book to…" link the summaries use.

## Turning the page is written on the page

- No pager, dots or "pages 3–4" caption under the book any more. What is left: the index **tabs** on the book's edge, the arrow keys, a swipe, the "see more" links — and, in the bottom corner of every page, **"Turn the page →"** (later pages: "Next page →") in handwriting with a scribbled arrow, and a folded-up **corner of paper** that lifts when you reach for it. The left page's corner says "← Back". The first spread's corner breathes and its arrow nudges, as an invitation. The last page's says "Back to the front ↺". Page numbers stay, small, at the foot of each page.
- The fold is two CSS triangles (`.dy-curl`): the flap of paper turned over, and the darker paper it uncovers, with a drop-shadow that follows the fold. Mirrored for the left page.
- On a phone or tablet (one page at a time) the same two corners sit on the single page, and the foot of the page fades to paper behind them so text scrolling under doesn't fight the words.
- The book got taller for it: with no pager, `--dy-chrome` went from 16.1rem to 13.6rem.

## FitPage — a page fits the window, whatever the window

`flip/FitPage.tsx` wraps every page on a two-page screen. It measures the height the page *wants* and, if that is more than the page has, draws the page a little smaller (a box laid out at 1/scale of its size, then `transform: scale`, so text reflows wider instead of being squashed) and lets go of the least important extras first (`.dy-drop-1` = the tagline and the "so far" scrap, `.dy-drop-2` = the memo). A page that already fits is untouched. Results: 1440×900 both front pages at 100%; 1440×780 at 89–91%; 1280×720 at 73%, still complete, still no scrolling. It re-solves on resize and when the fonts arrive. This replaces most of the "hide it on a short window" container queries for the front pages (they are still there for the other pages).

## Small things fixed on the way

- On a phone the page had grown to its content's height (a 1300px page in a 530px book, with the turn button far below); the single-page grid row is now `minmax(0, 1fr)`, so the page scrolls inside the book.
- Between 1280 and 1359px the section tabs sit in a row above the book (there's no room on the edge), so the book gets 3rem less height there.
- I had named a phone-width override `.dy-seal` — which is also the wax seal's own class, so it was shrinking every wax seal on a phone. Renamed `.dy-bookmark`.
- Phone: the front page's tagline is dropped and the title is smaller, so the first screenful is tickets, not headline.

## Not verified

The real signed-in `/diary` with seeded data (the design gallery renders the same components over sample data); the feel of the corner curl and the nudging arrow on a touch screen; real Safari/Firefox behaviour of the transform-based fit (built on plain `transform`, no `zoom`, for that reason).

## Follow-up: "I can only go forward, not back"

Reported after the slice above. Clicking "Back" with real mouse clicks worked at every size I tried (1280–1920 wide, single-page tablet, 360–390 phone; the backward leaf animation is the mirror of the forward one), so I could not reproduce a dead button. What I did find were real gaps that make going back feel impossible:

- **The browser's own Back left the diary.** Turns were written with `replaceState`, so a Back press (or a two-finger swipe back) skipped every page and left `/diary`. Every turn now adds a history entry (`pushState`) and a `popstate` listener turns the book to wherever the address goes — the browser's Back/Forward are now "previous/next page", with the page-turn animation.
- **A click during a turn was dropped, and the corners vanished for ~1.9s after each turn** (they were unmounted during the turn, then faded in after a delay). The corners are now always drawn, and a click during a turn is remembered (`queued`) and the book carries straight on into the next turn from `finish()`. Rapid Next-Next lands two spreads on; Next-then-Back ends where it started.
- **The left corner said just "Back"** and looked lighter than the invitation on the right. It now reads "← Previous page" (phones: "Back" / "Next", so both fit on a 360px page).

Lesson: a handler that runs after `setState` in a timer cannot rely on a ref updated in an effect having caught up (`goRef` was one render stale, so a queued turn was silently dropped) — chain the next turn inside the same `finish()` instead.
