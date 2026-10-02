# GiftPing — artwork prompts for ChatGPT (Batch 1: Home + Mall)

**How to use this**
1. Open ONE ChatGPT conversation for all of Batch 1 (it keeps the style consistent). Paste the **STYLE LINE** below as the very first message and say "Remember this style for everything I ask next."
2. Then paste each numbered prompt. If ChatGPT adds text or a logo to the picture, reply "Regenerate with absolutely no text, letters, numbers or logos anywhere in the image."
3. Save each result as a **PNG** with the **file name** shown and put it in the folder `ui-references/batch-1/` (or send them to me another way). I convert to WebP, resize and wire them in — you don't need to optimise anything.
4. Send me whatever you have; I'll build with the pieces that exist and leave a tasteful placeholder for the rest.

## STYLE LINE (paste first, once)

> Style for every image in this project: a warm, premium, cinematic gifting-mall aesthetic. Golden-hour amber and honey lighting, deep forest green, brushed brass and copper accents, cream and ivory marble, soft bokeh fairy lights, fresh flowers (roses, ranunculus, dried florals), satin ribbons. Refined, luxurious, emotional, photorealistic, shallow depth of field, gentle film grain. Subtle Indian craftsmanship where it fits naturally (brass diyas, jaali lattice screens, marigold accents). ABSOLUTELY NO text, letters, numbers, logos, signs with writing, or watermarks anywhere in any image. No people's faces unless I say so.

## About sizes

Don't ask ChatGPT for exact pixel sizes — it only makes **square**, **landscape** or **portrait** (about 1024–1536px on the long side) and ignores custom numbers. Just say which shape. I crop, resize and optimise everything myself. Bigger is fine; the file name matters more than the size.

## The pictures

**1 · `hero-atrium.png` — homepage hero (most important)** · **landscape** · goes behind the headline (I crop it a little wider than 3:2, so keep the important parts — skylight, hanging gifts, the platform — in the middle and leave extra room at the top and bottom edges)
> A grand, warm-lit luxury gifting mall atrium seen from the ground floor entrance: a circular glass skylight ceiling, two floors of curved balconies with hanging green plants and thousands of tiny warm fairy lights, large gift boxes wrapped in copper satin ribbons hanging from the ceiling at different heights, a central round marble platform piled with beautifully wrapped gifts and flowers, boutique shopfronts with glowing amber windows on both sides, polished cream marble floor with warm reflections. The LEFT THIRD of the image must be calmer and darker (soft shadow, fewer details) because a headline will sit there. Wide cinematic composition.

**2 · `hero-atrium-mobile.png` — same scene for phones** · **portrait**
> The same warm-lit gifting mall atrium as a tall portrait composition: hanging gift boxes and glowing skylight in the top half, the central platform of gifts and flowers in the middle, soft darkness at the bottom where text will sit.

**3 · `mall-map.png` — the mall directory illustration** · **square** · on a plain cream background
> An isometric, top-down miniature illustration of a luxury gifting mall floor plan, like a beautiful architectural model: a rounded rectangular building cut open to show the inside, nine distinct zones — a grand entrance with wide stairs at the bottom (a round medallion on the floor), eight shop interiors arranged around a ring-shaped promenade (each with warm amber lighting and a different display: hampers, flowers, jewellery, handmade crafts, books, chocolates, experiences, a birthday party room), and in the centre a circular garden with trees around a round fountain. Cream and ivory walls, warm wooden floors, small trees, glowing shop lights. Soft shadows, clean edges, cream background. No numbers and no text anywhere — I will add markers myself.

**4 · `card-collections.png`, `card-boutiques.png`, `card-diary.png`, `card-services.png` — four homepage cards** · **landscape** each
> (a) A dark green gift box with a wide copper satin ribbon on a warm wooden surface, dried flowers around it, warm side light.
> (b) The interior of a luxury boutique: dark wood shelves lit from within, displaying candles, perfumes and small gifts, amber glow, seen from the doorway.
> (c) An open cream-coloured leather diary with a brass pen and a sprig of dried flowers on a wooden desk, warm morning light, pages blank.
> (d) Hands gently tying a satin ribbon on a kraft-wrapped gift with a dried flower sprig tucked into the bow, warm light, close-up.

**5 · `robin-perched.png` — the mascot** · **square** · transparent background if it can, otherwise a plain flat white background
> A friendly, elegant illustration of a European robin (orange-red breast) perched on a small green sprig, gentle watercolour-meets-digital style with soft shading, warm and charming, facing slightly to the left. Transparent background (or plain white so I can cut it out).
> Then ask for the same robin in 3 more poses, each as its own image: `robin-flying-gift.png` (flying with a tiny wrapped gift in its beak), `robin-on-gift.png` (sitting on top of a green gift box with a copper ribbon), `robin-peeking.png` (peeking over the edge, curious).

**6 · `logo-gp.png` — monogram** · **square** · transparent background if it can, otherwise plain flat white
> A refined monogram logo: the letters "G" and "p" intertwined in an elegant high-contrast serif, deep forest green with the "p" in copper, a small robin perched on top of the G. Flat vector-style, clean, transparent background. Also make a version in cream/white for dark backgrounds: `logo-gp-light.png`.

**7 · `wrap-green.png`, `wrap-blush.png`, `wrap-blue.png`, `wrap-gold.png`, `wrap-ivory.png` — wrapping-style swatches** · **square** each · transparent background if it can, otherwise plain flat white
> A single gift box with a satin ribbon bow, front view, soft studio shadow, transparent background. Five colourways: classic forest green box with copper ribbon; blush pink box with rose-gold ribbon; royal blue box with gold ribbon; premium gold box with cream ribbon; ivory box with sage-green ribbon.

**8 · `rel-parents.png`, `rel-partner.png`, `rel-friends.png`, `rel-colleagues.png`, `rel-kids.png` — "Shop by relationship"** · **square** · *faces allowed for these*
> Warm, candid, golden-hour portraits of Indian people, natural and joyful, not stock-photo stiff: (a) an elderly couple smiling together; (b) a young couple laughing, the woman in a saree; (c) four young women friends laughing together; (d) two colleagues in smart-casual clothes sharing a coffee and a small gift; (e) a small child hugging a large teddy bear.

## What I'll build meanwhile

The homepage, the mall directory page (with numbered clickable hotspots I place over picture 3), the boutique page shell and the cards — all working with tasteful placeholders — so your pictures drop in without changing any code. Picture 1 is the one that changes the feel most; if you can only make one batch first, make **1, 3 and 5**.

## Batch 1 — status (updated 21 Sep): COMPLETE

All delivered and live: hero (desktop + mobile), mall map, four cards, the four robin poses, both logos, five wrap swatches (now the wrapping-style picker at checkout) and five relationship portraits (now "Shop by relationship" on the homepage and the `/gifts-for/<who>` pages).

---

# Batch 2 — pages built since Batch 1

Same rules as Batch 1: use the same ChatGPT conversation (the STYLE LINE is already in it), pick landscape/portrait/square as stated, no text or logos in any picture, save as PNG with the file name shown into `ui-references/batch-1/`. **Priority order is the order below** — 1 to 4 change the look of pages people visit most.

**Where each one appears** (so you can judge if it fits): a "world" picture is the right-hand side of an occasion page's header, fading into the cream page on its left — so keep the *left third calm and darker/softer*, with the interesting parts in the middle and right.

**9 · `world-birthday.png`** · **landscape**
> A joyful, warm birthday celebration scene with no people: a long table with a tiered cake with lit candles, brass-and-copper balloons and blush-pink balloons, wrapped gifts with satin ribbons, confetti, dried flowers, soft golden-hour bokeh lights. The LEFT THIRD of the image is calmer and softer (out of focus, empty warm wall). Wide composition.

**10 · `world-anniversary.png`** · **landscape**
> A romantic anniversary table for two seen at golden hour: candlelight, two glasses, a bouquet of roses and ranunculus, a small wrapped gift with a satin ribbon, handwritten-card shapes with no writing, fairy lights and soft bokeh, deep green and copper tones. LEFT THIRD calmer and softer. Wide composition.

**11 · `world-wedding.png`** · **landscape**
> A grand Indian wedding gifting scene with no people: a marigold and rose floral arch, brass urns and diyas, silk saree fabric in deep green and gold, a beautifully wrapped trousseau gift box with a copper ribbon, warm golden light and bokeh. LEFT THIRD calmer and softer. Wide composition.

**12 · `world-corporate-gifting.png`** · **landscape**
> A refined corporate gifting scene with no people: an executive wooden desk with a premium dark-green gift box with copper ribbon, a leather notebook, a brass pen, a small plant and a warm desk lamp, soft window light, understated and elegant. LEFT THIRD calmer and softer. Wide composition.

**13 · `world-for-her.png`** and **14 · `world-for-him.png`** · **landscape** each
> (a) A soft, elegant arrangement of gifts for a woman: perfume bottles, a silk scarf, a jewellery box, blush roses and dried flowers on cream marble, warm side light.
> (b) A refined arrangement of gifts for a man: a leather wallet, a watch, a cologne bottle, a leather-bound notebook and a brass pen on dark polished wood, warm side light.
> Both: LEFT THIRD calmer and softer.

**15 · `shopfront-perfume.png`, `shopfront-jewellery.png`, `shopfront-florist.png` — default boutique fronts** · **landscape** each · used for boutiques that haven't uploaded their own banner, so they must look good with NO name on them
> (a) The glowing front of a luxury perfume boutique at dusk: arched glass door and windows, shelves of amber perfume bottles lit from within, brass fittings, dark green walls, a small potted olive tree by the door.
> (b) The glowing front of a fine jewellery boutique at dusk: arched windows with velvet displays of gold necklaces and rings, warm spotlights, cream marble and brass trim, dark green door.
> (c) The glowing front of a flower boutique at dusk: buckets and shelves of roses, peonies and dried flowers spilling out onto the pavement, hanging plants, a striped copper-and-green awning (no lettering), warm interior light.
> All three: no signs with writing; the door centred; the top edge has a little empty space above the roofline.

**16 · `diary-desk.png` — the Personal Gifting Diary header** · **landscape**
> A beautiful writer's desk at golden hour, seen slightly from above: a cream leather diary open with blank pages and a satin ribbon bookmark, a brass fountain pen, a small bouquet of dried flowers, a vintage brass desk lamp glowing, a cup of tea, a wrapped gift with a copper ribbon at the edge, a window with soft bokeh lights behind. Pages must be blank. LEFT THIRD calmer and softer.

**17 · `order-hero.png` — the order-tracking header** · **landscape**
> A magical "your gift is on its way" scene with no people: a small wrapped gift with a copper satin ribbon resting on a cream doorstep at dusk, a warm porch lantern glowing, a paper-and-brass delivery scooter or bicycle blurred in the background, fairy lights, gentle bokeh, cosy and anticipatory. LEFT THIRD calmer and softer.

**18 · `world-boutiques.png` and `world-atrium.png` — the two mall destinations that aren't occasions** · **landscape** each · the /mall "Handpicked Experiences" cards use these
> (a) A charming covered promenade of boutiques ("Boutique Avenue") at dusk with no people: cobbled cream stone, glowing shop windows with warm amber light, hanging lanterns and fairy lights, potted olive trees and flowers at each door, awnings in green and copper with no lettering.
> (b) The grand central gift atrium seen from the ground: a round marble platform piled high with beautifully wrapped gifts and flowers under a glass skylight, hanging gift boxes on ribbons, warm golden light. (Different angle from the homepage hero — closer to the platform.)
> Both: no text; keep the important part in the middle, it will be cropped to a tall-ish card.

**19 · `auth-welcome.png` — the sign-in / sign-up side picture** · **portrait**
> A tall, cinematic, welcoming scene: a beautiful arched mall entrance doorway glowing warm amber at dusk, a small wrapped gift with a copper ribbon and a sprig of dried flowers on the doorstep, fairy lights framing the arch, deep green walls, a hint of the atrium beyond. No people, no text. The bottom third is calmer and darker (text will sit there).

## Batch 2 — status (23 Sep): DELIVERED AND WIRED, four need a redo

All 17 Batch 2 files are live (occasion worlds, boutique fronts, diary desk, order header, mall interiors, sign-in panel). Reviewed one by one:

| File | Verdict |
|---|---|
| `world-anniversary`, `world-wedding`, `world-atrium`, `world-boutiques`, `diary-desk`, `order-hero`, `auth-welcome`, `shopfront-perfume/jewellery/florist` | Great — keep. |
| `world-for-her` | **Regenerate.** Real brand names are visible ("Miss Dior", "Chanel Gabrielle", "Chanel" on the box) plus slogans on books and a candle. Using those on a commercial site is a trademark risk. |
| `world-for-him` | **Regenerate.** "Bleu de Chanel" on the bottle, a monogram on the wallet, and slogans on books, a mug and a poster. |
| `world-corporate-gifting` | Regenerate if you can: readable slogans everywhere ("Good Ideas Build Brighter Tomorrows", "Big Ideas Brighter People", book spines). Not a legal risk, just off-brand. |
| `world-birthday` | Regenerate if you can: a neon "Happy Birthday", "Good People Brighter Days" on the cake and a framed card. Charming, but it says words we didn't write. |

**Add this to the prompt for those four** (ChatGPT keeps inventing text unless told firmly): *"Absolutely no readable text, letters, numbers, slogans, brand names, logos or monograms anywhere — book spines, mugs, posters, cards, tags, labels, bottles and packaging must be completely blank or unmarked. Generic unbranded perfume bottles only."*

## What each new picture unlocks

| File | Where it appears | Until it arrives |
|---|---|---|
| `world-<category>.png` (slugs: birthday, anniversary, wedding, corporate-gifting, for-her, for-him) | header of that occasion page | drawn robin + gift boxes |
| `shopfront-perfume/jewellery/florist.png` | boutiques with no banner of their own (picked steadily per boutique) | drawn shopfront |
| `diary-desk.png` | Personal Gifting Diary header | drawn robin + gift |
| `order-hero.png` | top of every order tracking page | drawn robin + gift |
| `world-boutiques.png`, `world-atrium.png`, plus the occasion worlds | the "Handpicked Experiences" cards on /mall | plain green card with a lattice pattern |
| `auth-welcome.png` | left panel of sign-in / sign-up on wide screens | the plain centred form |

## Batch 3 — status (1 Oct): A and B and D delivered, C generated but not needed

**A (7 robin poses), B (4 more occasion worlds, including a bonus `world-kids-baby`), and D (3 "how it
works" icons) are all delivered and wired** — synced via `npm run images:sync`, reviewed one by one, all
clean (no stray text/logos). Live on `/about` (the three steps), `/categories` (Housewarming/Thank You/
Festivals/Kids & Baby now show photo cards instead of the plain icon fallback), and wherever each robin pose
appears (empty wishlist, search, notifications bell, payment-confirmed moment, etc.).

**C (8 diary stickers) was also generated, but turns out not to be needed** — `OccasionSticker`
(`components/diary/art/OccasionSticker.tsx`) already solves this as a hand-drawn SVG component, built
before this batch was requested. The 8 `sticker-*.png` files are synced into the manifest harmlessly but
nothing in the app reads them. No action needed — just don't expect them to appear anywhere.

**E (real product photography, 20 products) is still outstanding** — see the prompt list below; these go
in a different folder (`ui-references/products/`) and a different script (`npm run seed:images` +
`npm run seed:demo`), not `images:sync`.

**Still flagged from Batch 2, not yet done**: `world-for-her`/`world-for-him` (real Dior/Chanel branding —
a trademark risk, currently held back from the new `/categories` photo cards specifically because of this)
and `world-corporate-gifting`/`world-birthday` (readable slogans, off-brand but not a legal risk) all still
need regenerating with the "no readable text/brand names" line added to the prompt.

## Batch 3 — what would make the site feel even more like a place (each one has a slot already wired)

The best additions so far (the mall map, the world banners) work because they are **pictures the page is built around**, not decoration. More of the same, in order of impact:

**A · Robin sticker pack — 7 more poses** · **square** · transparent background · same robin, same watercolour style as the first four
`robin-waving`, `robin-heart`, `robin-search`, `robin-bell`, `robin-celebrating`, `robin-reading`, `robin-sleeping`
> (waving) the robin waving one wing, cheerful, welcoming. (heart) holding a small copper heart in its beak. (search) peering through a small brass magnifying glass. (bell) perched on a small brass hand-bell, mid-ring, with tiny motion lines. (celebrating) wings up with a few gold confetti pieces and a tiny party hat. (reading) perched on an open blank diary with a small pen. (sleeping) curled up asleep on a folded cream cloth, eyes closed, a tiny "z" made of dots — no letters.
Where they go: `heart` = empty wishlist, `search` = search page and "nothing found", `bell` = empty notifications, `celebrating` = the payment-confirmed moment, `reading` = the diary's empty state, `waving` and `sleeping` are reserved for the sign-in welcome and the 404. Until each exists the site uses the perched robin.

**B · Four more occasion worlds** · **landscape** · same rules as the other worlds (left third calm, no text, no people)
`world-housewarming.png`, `world-thank-you.png`, `world-festivals.png`, `world-kids-baby.png` — these four categories now exist with demo products, so their pages currently draw the placeholder.
> (housewarming) a bright new-home entrance: an olive tree, a brass lamp, a candle and a wrapped gift on a stone step, warm sunset light. (thank-you) a sunlit kitchen table with a bouquet of seasonal flowers, a tea set and a small wrapped gift with a blank kraft tag. (festivals) a Diwali evening: rows of brass diyas, marigold garlands, a brass thali of sweets and a wrapped gift box, golden bokeh lights. (kids-baby) a soft nursery corner: a wooden crate of plush toys, storybooks, a small wrapped gift, pastel balloons, warm morning light.

**C · Diary stickers — one per occasion** · **square** · transparent background · flat, hand-painted style, about the size of a stamp
`sticker-birthday`, `sticker-anniversary`, `sticker-wedding`, `sticker-housewarming`, `sticker-graduation`, `sticker-festival`, `sticker-thank-you`, `sticker-other`
> A small hand-painted sticker in the GiftPing palette (forest green, copper, blush, cream): (birthday) a slice of cake with a candle; (anniversary) two interlocked rings with a rose; (wedding) a marigold garland arch; (housewarming) a little house with a lit window; (graduation) a scroll tied with a ribbon; (festival) a brass diya; (thank-you) a tied bouquet; (other) a wrapped gift with a bow. No text.
They replace the small cake icon on every "coming up" date card in the diary.

**D · "How it works" illustrations — 3** · **landscape** · in the same isometric miniature style as the mall map, on a cream background
`step-browse`, `step-personalise`, `step-deliver`
> (browse) an isometric miniature of the mall's promenade with glowing shopfronts and no people. (personalise) an isometric desk: a gift box open, a handwritten card, ribbon and a small copper pen. (deliver) an isometric street scene: a green scooter with a gift box on the back riding to a front door, a trail of dotted light.
Where they go: the three steps on the About page (already wired).

**E · Real product photography (the biggest realism win for the demo)** · **square** · save as `<product-slug>.png` in `ui-references/products/` (a new folder) — `npm run seed:images` picks them up as that product's main photo
The demo catalogue (57 products) currently uses crops of your artwork as stand-in photos. If you want real ones, these are the most-seen products; ask for "a studio product photograph on a cream marble surface, soft warm side light, shallow depth of field, no text, logos or branding":
`emerald-and-copper-celebration-hamper` · `signature-gift-box-forest-green` · `journal-and-brass-pen-set` · `amber-glow-candle-and-diffuser-set` · `bone-china-tea-cup-and-saucer` · `velvet-jewellery-box-pendant-set` · `floral-silk-scarf` · `royal-zari-trousseau-box` · `brass-kumkum-thali-set` · `kuthu-vilakku-brass-lamp` · `rose-and-ranunculus-bouquet` · `peony-rose-bouquet` · `belgian-truffle-gift-box-24` · `festive-mithai-and-dry-fruits-box` · `executive-leather-notebook` · `monogrammed-leather-wallet` · `executive-watch-gift-box` · `kundan-bridal-necklace-set` · `storybook-and-plush-gift-box` · `olive-tree-planter`
(describe each in the prompt by its name and short description in `scripts/seed-demo.ts`.)

## Ideas that need a little building first (say the word and I'll start)

- **A courier scooter that rides along the order progress bar** — the delivery illustration above, animated to the parcel's real position. Needs one picture: `courier-scooter.png` (side view, transparent background, a green scooter with a gift box on the back).
- **E-gift cards** — four card designs (`giftcard-birthday`, `-anniversary`, `-festive`, `-thank-you`, landscape, no text) sold as a product and emailed to the recipient. It is a real feature (a balance ledger, a redeem-at-checkout code), not just pictures — worth raising with the client because gift cards are a big share of gifting sales.
- **Shop-the-look** — tag products on a world picture (hover the candle in the wedding banner to see it). Uses pictures you already have.
- **Festival kits** — Diwali and Christmas versions of the hero, mall map and cards (the theme switch is already built). Each festival is ~6 pictures under `ui-references/batch-1/<festival>/` with the same file names as the native set.

## Batch 4 — art for the page-by-page pass (26 Sep)

Every page is getting its own "scene" the way the diary and the mall map have. The code is built to work without these files (it draws its own version), so generate them in any order — the ones near the top change the most. Same rules as before: **no readable text, letters, numbers, slogans, brand names or logos anywhere**, warm cream/green/copper palette, the same painterly style as `shopfront-florist`. Save as PNG into `ui-references/batch-1/` with the exact file names, then `npm run images:sync`.

### A. More boutique shopfronts (biggest visible change — right now three pictures are shared by all boutiques)
Each one: *"The front of a small boutique on an Indian mall street at dusk, seen straight on, with a striped awning, a glowing shop window and a door, painterly warm style like the florist shopfront. The window shows: <ITEMS>. No text, no signs with letters, no logos."* Landscape 3:2.

| File | `<ITEMS>` |
|---|---|
| `shopfront-chocolate.png` | ribbon-tied chocolate boxes, glass jars of sweets, a cake stand |
| `shopfront-stationery.png` | notebooks, leather journals, fountain pens, a brass desk lamp |
| `shopfront-homedecor.png` | brass diyas, cushions, a vase of dried flowers, a small rug |
| `shopfront-candles.png` | candles of every size, glass jars, a warm glow |
| `shopfront-tea.png` | tea tins, china cups, a brass kettle, dried flowers |
| `shopfront-kids.png` | soft toys, wooden blocks, a small tent, balloons |

They appear automatically on Boutique Avenue and boutique pages (each boutique picks one and gets its own awning colour).

### B. Occasion worlds still missing
`world-housewarming.png`, `world-thank-you.png`, `world-festivals.png`, `world-kids-baby.png` — a 16:9 painterly *room/scene* for that occasion with generous empty space on the left for the headline (see `world-wedding` for the composition). Regenerate `world-for-her`, `world-for-him`, `world-corporate-gifting`, `world-birthday` with the "no text or brand names" line if you haven't yet.

### C. Scenes for the next pages (I will build these next)
| File | Prompt |
|---|---|
| `scene-gift-counter.png` | A wooden gift-wrapping counter seen from the front: rolls of paper, ribbons on spools, a brass scale, a small handwritten-style card (blank), a robin perched on the counter. 16:9, empty space at the top. (checkout) |
| `scene-keepsake-box.png` | An open wooden keepsake chest with drawers slightly open, filled with ribbons, a small stamp collection, tickets and a heart-shaped charm. 4:3. (account) |
| `scene-courier.png` | A friendly cartoon-painterly courier on a small scooter carrying a wrapped gift, side view, transparent background, facing right. (order tracking) |
| `scene-display-stand.png` | An empty round wooden display stand with a soft spotlight and a draped cloth, on a cream wall. Square. (product pages) |
| `scene-empty-shelf.png` | An empty wooden shelf with a single hanging tag, a robin looking around. 4:3. (empty search / no results) |
