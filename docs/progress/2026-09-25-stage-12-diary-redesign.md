# Stage 12 (slice 11) — the Personal Gifting Diary, redesigned

The brief: the diary is the site's main reason to visit — it has to feel like the most personal, emotional place on GiftPing, not a dashboard. The client generated twelve reference screens in ChatGPT from `docs/design/diary-ui-prompts.md` (on the developer's machine in `ui-references/diary/01.png … 12.png` — 28MB, deliberately not committed, like `ui-references/batch-1`); this slice rebuilds every diary screen to match them, in code.

## The idea, and what it means for the code

**The diary is a book on a desk.** Cream dotted paper, a leather cover, a copper ribbon, washi tape, polaroids, torn notes, a wax seal, handwriting for anything personal and DM Sans for anything you have to *use* (prices, buttons in forms, dates).

Nothing is a flat image of a page. Everything is built from parts, so it is responsive, themeable and cheap:

| Part | How it is made |
|---|---|
| Paper, leather, wood grain, tape, ribbon, seal, polaroid, torn edges | CSS (`components/diary/diary.css`) — SVG-noise data URIs for grain, `clip-path` polygons for torn edges, `filter: drop-shadow` so shadows follow the torn shape |
| Florals, occasion stickers (cake, heart, rings, house, cap, diya, flowers, gift), plan icons, desk props | SVG components in `components/diary/art/` — coloured from CSS variables, so they follow a festival theme |
| The robin | The client's real art (`Robin`), poses `reading`/`sleeping`/`celebrating` fall back to a delivered pose until those exist |
| Watercolour stickers / extra robin poses, when the client generates them | Already wired: `sticker-<type>` and `robin-<pose>` in `lib/content/imagery.ts`; `npm run images:sync` picks them up |

## Screens (all real, all responsive)

- `/diary` — front page: "Priya's Gifting Diary" with the sealed ribbon ("Only you can open this"), next 3 moments as torn tickets, gift ideas for the nearest un-sorted moment, Gifting Score in wax, streak rosette, a paper calendar (month arrows, tap a marked day), your people as polaroids. Two-page spread from 1280px; on smaller screens a leather cover then stacked pages. **First run** (empty diary): a closed leather diary on the desk, "Open my diary" opens "Add someone you love".
- `/diary/people/[id]` — a person's page: the **gift plan strip** across the top (Idea → Chosen → Ordered → Wrapped → Given; a vertical list on phones), polaroid + tagline + usual budget, dates as tickets with a reminder switch, the timeline of what you have given (with what they said), "Things Mom loves" (add/remove inline), gift ideas with "Pick this", private notes (inline), "Find a gift for Mom".
- `/diary/people` — everyone, with search once the shelf is long. `/diary/year` — the year at a glance (12 mini months, "24 moments · 19 remembered · 5 to go", busiest month). `/diary/review` — "Your gifting year" + a shareable card (numbers only — no names, no photos leave the diary).
- Dialogs are paper sheets (Radix Dialog underneath): add/edit a person (relationship chips, interests as removable chips, budget slider, favourite, optional photo), add/edit a date (sticker tiles for the occasion), log a gift, remove.
- The reminder **email** follows the same look (green header, paper, the date on a ticket, "last year you gave Mom a silk scarf", three ideas with pictures). The **notification bell** is now a dropdown with occasion stickers; the inbox shows the same stickers.
- Loading state: the robin turning a page (`loading.tsx`). Empty states: robin resting ("nothing in the next 60 days"), an open empty box ("no gifts logged yet").

## New data (migration `20260924100000_diary_redesign.sql`, applied to the dev database)

- `diary_contacts.tagline` (≤ 80 chars). `diary_contacts.photo_url` — a column that already existed but was unused — now holds the **storage path** of a person's photo.
- **Private `diary-photos` bucket, no client policies at all.** Written only by `POST /api/diary/photo` (proves ownership through the user's own session, sharp re-encodes to a 720² WebP and strips EXIF/GPS, service-role write), shown through 1-hour signed URLs made on the server, `<img>` not `next/image` (the optimiser must not cache private pictures). A CHECK pins `photo_url` to `<owner id>/<person id>-<uuid>.webp`. Verified against the real bucket: signed URL 200, public URL 400, non-WebP refused. Erasure (`eraseUser`) and removing a person delete the files too.
- `diary_gift_plans`: one row per (date, occurrence); owner-only RLS, no admin bypass; a SECURITY INVOKER guard trigger refuses a plan on someone else's date or order. Verified by hand as two real users (cross-user insert refused, other user and admin see zero rows).
- `export_user_data()` redefined to include the tagline, "has a photo" and the plans.
- "Ordered" fills itself in when the user's own paid order contains the plan's chosen product placed after the plan was made (`findLinkedOrder`); "Given" writes the gift into history exactly once, so the timeline, "Gift sorted" and next year's "last year you gave…" learn from it.

## Decisions worth remembering

1. **Diary CSS lives in Tailwind's `components` layer.** Unlayered CSS beats *every* utility, so a `dy-note` with `absolute` silently stayed `relative` (found on the phone cover). In the layer, utilities win like everywhere else. Anything that must override a `dy-*` rule needs a utility, not a rule of its own.
2. **CSS variables scoped to a container don't reach a Radix portal.** Dialogs render on `document.body`, outside `.dy-desk`, so they carry their own `dy-scope` (same variables) and font class; the sticker colours are on `:root` (`diary-tokens.css`) so a sticker also works in the inbox/bell.
3. **A Server Component can't pass a function to a Client Component.** The dialogs take a render-prop trigger, so pages use the ready-made client buttons (`AddPersonButton`, `EditDateButton`…) — caught by the design preview, not by tsc.
4. **Handwriting font loaded only for the diary** (`components/diary/fonts.ts`, Caveat) — root layout untouched, no cost to the rest of the site.
5. **Nobody is blamed for a moment that passed before it was written down**: "remembered"/streak only count occurrences on/after the date's `created_at`. "Remembered" = a gift logged in the 45 days before or the day after (same rule as "Gift sorted").
6. **No pronouns are guessed**: "Things Mom loves", never "Ideas she loves" (the mockups used she/her).
7. The share text contains numbers only. The diary's privacy promise is the product; what leaves it is a sentence the person can read first.

## Testing

`npm test` 282+ (new: present, plans, memories, page-data, gift-links, reminder email). Pure rules are tested; the pages are thin composition. **Development gallery** (404s in production): `/design/diary?screen=home|first|person|year|review` and `/design/diary/email` render every screen over sample data without signing in — that is how the layout, both breakpoints and the dialogs were checked. Real-data pipeline checked with the service role against the dev database (queries, builders, private bucket).

## Not verified (needs a signed-in click-through)

The real `/diary` pages with the seeded data and a real session (the design gallery renders the same components, but the sign-in wall stopped me), uploading a photo from a browser, the bell dropdown, and starting/advancing a plan. Web push and the daily cron are unchanged (the cron now also sends the occasion in the notification metadata and the richer email).

## Demo data

`npm run seed:demo` now seeds the test customer's diary as a real family (Mom, Dad, Riya, Nani…) with taglines, notes, three years of gifts with what they said, a few moments that already passed this year (so "remembered" and the streak have something to show), and three gift plans (chosen / wrapped / one linked to a real paid order). To refresh it: delete the test customer's diary rows, then re-run — the seed is idempotent.
