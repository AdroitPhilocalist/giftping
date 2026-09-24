# The Personal Gifting Diary — design brief + ChatGPT prompts

The diary is GiftPing's main reason for someone to visit and to come back. Everything else on the site is a shop; this is the one place that should feel **personal, private and a little emotional**. This file is the brief for the redesign. The screens are generated in ChatGPT and dropped into `ui-references/diary/`; I then build them for real.

## The idea: the diary is an object, not a dashboard

Today the page is a grid of cards. The redesign treats it as **a real, cherished book on a warm desk** — the site's mall metaphor stops at the door and here you sit down, alone, with the people you love.

- **Paper, not panels.** Cream ruled/dotted pages, soft page-curl shadow, a ribbon bookmark, a leather cover with the robin embossed. Gold-foil detail on headings.
- **Handwriting for feeling, serif for structure.** Titles like "Mom's page" and notes in a handwriting font; dates, prices and buttons stay in DM Sans so it remains usable.
- **People are pages, not database rows.** Every person has their own page with a polaroid-style photo (or a monogram), what they love, a timeline of everything you have given them, and a private notes area ("she said she loves jasmine").
- **Time is visible.** A ribbon of the next few moments across the top with a countdown ("Mom's birthday — 9 days"), a whole-year strip, and small stickers per occasion instead of icons.
- **The robin is the companion, not the decoration** — it reads over your shoulder, sleeps when nothing is coming up, celebrates when you sort a gift.
- **The privacy promise is a feature**: a small lock-and-ribbon "Only you can open this" seal on the cover.

## What the diary already does (so the designs must show real things)

People with relationship, interests, gift preferences, usual budget, favourite star · dates per person (birthday, anniversary, wedding, housewarming, graduation, festival, thank-you, other) that repeat yearly · "Coming up" within 60 days with days-away · "Gift sorted" state · gift history ("Got it") · rule-based gift ideas per person and occasion · Gifting Score out of 100 with a breakdown and a "next best action" · mini calendar · reminders 7 days and 3 days before by email, web push and in-app (exactly once) · per-person reminder toggle · private, not even admin can read it.

## What I would add (needs building, each one earns the emotional side — tell me which to include)

1. **Memories / notes per person** — free-text private notes and "things she loves".
2. **"Last year you gave…"** on each person's page and in the reminder ("Last Diwali you gave Mom a brass lamp").
3. **Gift plan states**: idea → chosen → ordered → wrapped → given, with the order linked when bought on GiftPing.
4. **Year in review** — "Your gifting year": moments remembered, people made happy, favourite occasion (shareable card).
5. **Streak and small badges** ("Never missed a birthday — 6 months") feeding the Gifting Score.
6. **Wishlist per person** — save products to Mom's page, not just a global wishlist.
7. **Quick add from anywhere** — "Add to diary" on a product page ("gift this to Mom on her birthday").

---

## How to use these prompts

1. Start a **new ChatGPT chat**, paste the **MASTER STYLE BLOCK** first, and say "Remember this style for the next images."
2. Then paste **one screen prompt at a time**. Generate at **16:9 landscape (1792×1024) for desktop, 9:19 portrait for mobile**.
3. Ask for **"no readable text other than what I specify; everything else as blank lines or squiggles"** — ChatGPT invents copy and brand names otherwise (this cost us regenerations in Batch 2).
4. Save as `ui-references/diary/01-home-desktop.png`, `02-…` etc. (numbers matter, I read them in order). Give me all of them; a few extra alternates are welcome.

## MASTER STYLE BLOCK (paste first)

> You are an art director designing screens for **GiftPing**, an Indian gifting marketplace, specifically its **Personal Gifting Diary** — the emotional heart of the site, a private planner where a person keeps the people they love and their important dates. Create high-fidelity **website UI mockups** (not illustrations of a room, real usable screens), flat front-on view, crisp and legible.
>
> **Concept:** the diary is a beautiful physical book on a warm desk. The page itself is the interface: cream paper with a very subtle dotted grid, soft page shadow, a red-copper ribbon bookmark, small washi-tape strips, polaroid-style photo frames with a slight tilt, handwritten annotations, watercolour-and-gouache spot illustrations. Premium, warm, nostalgic, intimate — think a luxury stationery brand crossed with a modern app. Never cluttered, never corporate, never a generic dashboard of grey boxes.
>
> **Palette:** warm cream canvas (#FBF6F1), deep forest green (#0C2A1D) for the cover, header and primary buttons, copper accent (#B75F22) for highlights, ribbon and dates, soft blush and gold as secondary touches, ink (#1C1916) text. **Type:** an elegant serif for headings (like Newsreader), clean sans for body and buttons (like DM Sans), and a natural handwritten script only for personal notes and small annotations. **Mascot:** a small friendly **robin** (red-orange breast, brown back) who appears as a companion — perched on the book, peeking from a page corner, reading, sleeping, or celebrating. Indian context: names like Mom, Dad, Priya, Arjun, Nani; festivals such as Diwali and Raksha Bandhan; rupee prices (₹); brass diyas, marigold, silk, kumkum are welcome as touches.
>
> **Rules:** UI text must be real and readable ONLY where I specify it; all other text is rendered as neat placeholder lines or soft squiggles. **No real brand names, logos, monograms or slogans anywhere.** No stock-photo people — use polaroid frames containing soft illustrated portraits or an initial letter monogram. Consistent components across screens (same cover, ribbon, stickers, buttons). Desktop frame = a browser window with a slim green header bar (logo "GiftPing", nav, a "My Diary" button, cart icon); mobile frame = a phone with a bottom tab bar.

---

## SCREEN PROMPTS (one at a time)

### 01 — Diary home (desktop) — the most important screen
> Using the style above, design the **Diary home** screen, desktop 16:9. An open diary lying on a warm desk, filling most of the frame. Left page: a large handwritten title "Priya's Gifting Diary" with a small lock-and-ribbon seal reading "Only you can open this"; below it a horizontal **ribbon of the next three moments** as tilted paper tickets, each with an occasion sticker (birthday cake, diya, heart), a name, the date, and a big countdown ("9 days"); the first ticket has a copper "Choose a gift" button. Below that, "Gift ideas for Mom's birthday" as three product cards pinned with washi tape (small pictures of a candle, a scarf, a hamper, with ₹ prices). Right page: a **Gifting Score** drawn as a warm ring/wax-seal stamp "82 · Thoughtful Gifter" with three slim progress bars, a small hand-drawn **month calendar** with copper dots on dates and a ribbon on today, and below it "Your people" as a row of 5 polaroid frames (initials or soft portraits) labelled Mom, Dad, Arjun, Nani, Meera with a tiny countdown under each. The robin perches on the top corner of the book. A "+ Add a person" button and "+ Add a date" button in green. Everything on the page should feel handwritten-and-printed, not boxed.

### 02 — First-time / empty state (desktop)
> Same style. The **first-time diary experience**: a closed forest-green leather diary with a gold-foil embossed robin and "My Gifting Diary" on the cover, ribbon hanging out, sitting on the desk with a pen, a cup of chai and a marigold sprig. A soft light. Beneath it a headline "Never miss a moment that matters" and one line of body text, and a single green button "Open my diary". To the side a three-step strip drawn like torn paper notes: "1 Add someone you love", "2 Save their special dates", "3 We remind you, with gift ideas". Robin peeking from behind the book.

### 03 — A person's page (desktop)
> Same style. **"Mom's page"** — one diary page dedicated to a person. Top left a big polaroid of Mom (soft illustrated portrait) with washi tape, name "Mom" in handwriting, a "Mother" tag, a gold star for favourite, "Usual budget ₹2,000". Beside it, a hand-written box "Things she loves" listing jasmine, sarees, filter coffee, gardening as little tag stickers. Middle: **Dates** as stamp-like tickets — Birthday 14 Mar (in 9 days), Anniversary 2 Dec, Diwali — each with a reminder bell toggle. Below, a **timeline "What I've given Mom"** drawn as a vertical dotted line with small gift-box stickers and years (2023 brass lamp, 2024 silk scarf, 2025 hamper) and a green "Log a gift" button. Right column: "Ideas for her birthday" (three product cards) and a **private notes** area in handwriting: "She said she liked the jasmine candle at Nani's." Robin reading in the corner.

### 04 — Add a person / add a date (dialogs, desktop)
> Same style. Two small, beautiful **modal dialogs** shown side by side on a blurred desk background, styled as paper cards with washi tape. Left: "Add someone you love" with fields (Name, Relationship as a soft chip selector: Mother, Father, Wife, Husband, Sister, Friend, Colleague…, Interests as tag chips, Usual budget slider in ₹, favourite star toggle) and a copper "Save to my diary" button. Right: "Add a special date" with an occasion sticker picker (birthday, anniversary, wedding, housewarming, graduation, festival, thank-you), a date picker, "Remind me 7 days and 3 days before" toggles, and a green "Save date" button. All field labels readable, everything else soft.

### 05 — The year at a glance (desktop)
> Same style. A **year view** page: a hand-drawn twelve-month spread across two pages, each month a tiny calendar with copper dots for moments and small occasion stickers; a legend at the bottom; the current month highlighted with the ribbon. On the left a tally in handwriting: "24 moments this year · 19 remembered · 5 to go". A gentle "busiest month: October (Diwali + 2 birthdays)" callout. Robin on a month tab.

### 06 — "Your gifting year" review (desktop, shareable card)
> Same style. A **year-in-review** screen: a big warm gradient page with confetti of marigold petals. Headline "Your gifting year", big numbers as stickers — "23 moments remembered", "9 people made happy", "Favourite occasion: Birthdays". A row of polaroid frames of the people you gifted, a badge "Never missed a birthday", the robin celebrating, and green buttons "Share my year" and "Plan next year". Include a compact 1080×1080 square variant of the shareable card beside it.

### 07 — Mobile diary home (portrait 9:19)
> Same style, **mobile portrait**. The diary home as a phone screen: cover-style header "Priya's Gifting Diary" with lock seal, a swipeable stack of the next moments as tilted tickets with countdowns, a horizontal strip of polaroid people, the Gifting Score ring as a compact wax seal, "Gift ideas" cards, floating green "+" button, bottom tab bar (Home, Categories, Cart, Wishlist, Account) with the diary tab highlighted. Robin peeking above the header.

### 08 — Mobile person page (portrait 9:19)
> Same style, mobile portrait: "Mom's page" — polaroid and name at the top, "Things she loves" tags, dates as tickets, gift timeline, ideas carousel, notes; sticky green button "Find a gift for Mom".

### 09 — The reminder email
> Same style, but an **email design** (600px wide, shown in a mail client frame): subject "Mom's birthday is in 7 days". A cream paper card with a green header strip, robin holding a small envelope, handwriting line "Hi Priya, a little nudge from your diary…", the date ticket (14 March, 7 days), a line "Last year you gave her a silk scarf", three gift idea cards with ₹ prices and copper "See it" buttons, and a footer line "Only you can see this — manage reminders". Keep it simple enough to build as HTML email.

### 10 — Web push and in-app notification
> Same style. A tidy sheet showing: (a) a **macOS/Chrome web push notification** ("Mom's birthday is in 3 days — see gift ideas") with the small robin icon; (b) an **Android push notification** in the same wording; (c) the site's **notification bell dropdown** listing three diary reminders with occasion stickers and a "Gift sorted" tick on one. Clean and realistic.

### 11 — Gift plan states (desktop, optional feature)
> Same style. A person's upcoming occasion shown as a **five-step ribbon**: Idea → Chosen → Ordered → Wrapped → Given, each step a small paper tab with an illustration (lightbulb, gift tag, parcel, ribbon, heart), the current step ("Ordered") highlighted with a mini courier line "Arriving 12 Mar", and a copper "Track order" button. Robin on the tracker.

### 12 — Empty and small states (sheet)
> Same style. One sheet with six small components on the desk: "Nothing in the next 60 days" (robin sleeping on a closed book), "No gifts logged yet" (empty gift-box outline), "Gift sorted" badge, a 30-day "Never missed a birthday" streak badge, a reminder toggle on/off pair, and a loading state (robin flipping a page).

---

## SEPARATE ARTWORK PACK (so I can use real art, not just mockups)

Generate on a **plain cream (#FBF6F1) background, no shadows, no text**, one file each, save as `ui-references/diary/assets/<name>.png`.

| File | Prompt |
|---|---|
| `cover-closed.png` | A closed forest-green leather diary seen from the front, gold-foil robin embossed in the centre, copper ribbon bookmark hanging from the bottom, subtle stitching, soft light. Empty title area. |
| `open-book.png` | An open diary seen straight from above with two empty cream dotted pages, a red-copper ribbon lying across the gutter, soft page curl. Big empty pages. |
| `paper-texture.png` | Seamless cream paper texture with a very faint dotted grid, tileable. |
| `washi-tapes.png` | Six washi-tape strips in green, copper, blush, gold, floral and stripes, slightly transparent, separate. |
| `polaroid-frame.png` | An empty polaroid-style photo frame, slightly tilted, with a strip of washi tape on top. |
| `ribbon-bookmark.png` | A single copper-red satin ribbon bookmark, straight, V-cut at the bottom. |
| `stamp-ticket.png` | An empty perforated paper ticket / stamp shape for date cards, cream with a copper edge. |
| `wax-seal.png` | An empty copper-gold wax seal with a small robin impressed. |
| `pen-and-chai.png` | A fountain pen, a small cup of chai and a marigold sprig arranged as a still life. |
| `stickers-occasions.png` | A sheet of 8 separate round stickers: birthday cake, anniversary heart, wedding rings, housewarming house with a diya, graduation cap, festival diya, thank-you flower, other star. Watercolour style. |

(The 7 robin poses and the 8 diary stickers are already in `docs/design/asset-prompts.md` Batch 3 — generate those first if you haven't; the diary reuses them.)

## What I will do with them

When the numbered screens arrive I will (1) rebuild `/diary`, `/diary/people/[id]`, the add/edit dialogs, the empty state and the year view to match, in the site's token system (no raw colours), with the page-turn, ribbon and stamp motion respecting reduced-motion; (2) restyle the reminder email and add "last year you gave…"; (3) build whichever of the "what I would add" features you pick. Backend rules stay exactly as they are (private, exactly-once reminders).

---

## Status (25 Sep): built — what the client can still generate

All twelve screens were generated and the diary was rebuilt to match (see `docs/progress/2026-09-25-stage-12-diary-redesign.md`). The paper, leather, tape, ribbon, seal, polaroid frames, florals and occasion stickers are drawn in code, so **the artwork pack above is optional** — it upgrades the look, it isn't needed to ship. These slots are already wired; drop a PNG into `ui-references/batch-1/` and run `npm run images:sync`:

| File | Where it appears | Until it exists |
|---|---|---|
| `sticker-birthday.png` `sticker-anniversary.png` `sticker-wedding.png` `sticker-housewarming.png` `sticker-graduation.png` `sticker-festival.png` `sticker-thank-you.png` `sticker-other.png` | tickets, dates, calendar marks, the year view, the bell, the inbox, the add-a-date picker | the drawn SVG stickers |
| `robin-reading.png` | corner of a person's page | the perched robin |
| `robin-sleeping.png` | "Nothing in the next 60 days" | the peeking robin |
| `robin-celebrating.png` | the shareable "gifting year" card | the perched robin |
| `robin-waving.png` `robin-heart.png` `robin-search.png` `robin-bell.png` | empty states elsewhere on the site | the perched robin |

Prompts for the sticker sheet and the robin poses are in `docs/design/asset-prompts.md` (Batch 3 A and C). Give each sticker a transparent background, no text.
