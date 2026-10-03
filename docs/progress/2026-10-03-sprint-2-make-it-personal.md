# Sprint 2 — "Make it personal" (ideas A3, A4, B1)

From `docs/ideas/DELIGHT_AND_FEATURE_IDEAS.md`.

## What changed for people

### A3 — live personalisation on the product photo
- A boutique switches on **"Personalised text on the photo"** in the product form, names the field ("Name on the box"), sets a length limit, picks a lettering style (gold foil, deep engraving, cream print, handwritten) and whether text is required, then **drags a box onto their own main photo** to say where the text goes (drag to move, round handle to resize, arrow keys / sliders as the keyboard-accessible route). The editor draws the text with the very same component shoppers see.
- On the product page the shopper types into a field and **the words appear on the photo as they type**, fitted to the box. Typing jumps the gallery back to the main photo; the zoom view shows the same thing.
- The text then travels with the order: cart line, checkout summary, the customer's order page, the **vendor's order page** (a highlighted "Engrave: “…”" line, separate from the rest) and the **vendor's new-order email**.

### A4 — gift-wrap preview at checkout
Ticking gift wrapping shows the chosen wrap, large, with the handwritten card tucked into it carrying the **real gift message**, addressed "Dear <first name of the delivery address>". The five wraps cross-fade as you switch (a little re-tie pop each time).

### B1 — gift finder (`/gift-finder`)
Four questions (who, occasion, budget, what they love — up to three) become a shelf of real products, each with its reasons ("Great for a birthday", "Suits your mother", "Matches their love of personalised things", "Within your budget"). The robin asks each question; choosing an answer moves on; Back works; the last step goes to a shareable results URL. Entry points: a homepage band and a footer link (not the header — it is already at its width limit).

## Design decisions (and why)
- **Reuse, don't duplicate.** The quiz ranks with the diary's existing, tested suggestion engine (`lib/diary/suggestion-matcher.ts`), so both features recommend consistently. The quiz module adds: its own vocabulary, strict URL parsing, a **hard budget limit** (the engine's budget rule is only a soft penalty), readable reasons, and a "popular picks" fallback.
- **Bug caught by the tests:** the first fallback re-added products the engine had deliberately dropped as "meant for someone else" (a for-her item on a dad's shelf). The fallback now obeys the same recipient rule.
- **The stored setup is untrusted.** It lives in `products.personalization_options` (a column that existed, empty and unused, since the first migration). Vendors can edit it and the public page renders it, so: a DB CHECK bounds its shape (array, ≤5 entries, ≤2 KB); every read goes through `parsePersonalizationOptions`, which clamps all numbers, validates the style, and drops anything unexpected — a hostile value can make the preview look odd, never break a page.
- **The browser is never trusted for the text.** `normaliseEngraving` (zod-free, shared) runs in the browser for instant feedback and again in `addItemToCart` against the product's OWN rules (required / length / characters). A product with no setup discards any engraving text sent anyway. Characters allowed: letters and digits in any script (Indian-language names work), combining marks, spaces and light punctuation — no markup-ish symbols; all output is also escaped.
- **A fixed square frame for engravable products.** The gallery frame is square on phones but 5:4 / 6:5 on larger screens, with `object-cover` cropping differently in each; a placement stored as a % of the photo would drift across the product as the window resized. Products WITH an engraving keep a square frame at every size, and the vendor's editor uses the same square.
- **Font size from the box.** Text size is container-query units (1cqw = 1% of the photo's width) computed from the box and the text length, erring small so it never overflows.
- **Progressive enhancement for the quiz.** It is a real `<form method="get" action="/gift-finder">`; with JavaScript off, all four questions show and Submit searches. With JavaScript it becomes one question at a time (switched on via `useSyncExternalStore`, so hydration never mismatches).
- **Results are `noindex`** (any answer combination is thin and personal), the bare page is indexable and is an editable SEO page; answers are whitelisted against the option lists, so a hand-edited URL can't inject anything.
- **Wrap preview needs no new data:** it uses the order-level gift message and the selected address's recipient that checkout already holds.

## Built
`lib/personalization/engraving.ts` (+17 tests) · migration `20261002140000_personalization_options_shape` (applied) · `lib/validation/product.schema.ts` + `lib/vendor/actions.ts` (setup saved) · `lib/validation/cart.schema.ts`, `lib/commerce/{cart,checkout,personalization}.ts` (engraving through the pipeline; `personalizationLines/Summary` shared by all four displays) · `lib/commerce/payments.ts` + `lib/notifications/templates.ts` (vendor email) · `components/shop/{EngravingOverlay,PersonalizationPreview,WrapPreview,GiftFinderQuiz}.tsx`, gallery/buy-box/product-page edits, `components/vendor/EngravingPlacementEditor.tsx` + product form section · `lib/gift-finder/quiz.ts` (+18 tests) · `app/(shop)/gift-finder/page.tsx`, `components/home/GiftFinderBand.tsx`, footer link, SEO registry entry · `lib/db/products.ts` `getProductCardsByIds`, `lib/diary/candidates.ts` (deterministic best-reviewed 500).

## Verified (real server and database; test data restored)
- **A3 customer side:** field and live text on the photo (typed "Aarav Nair" → `AARAV NAIR`); a required empty field is refused with an inline message, focus and `aria-invalid`; **server-side enforcement proven** by tightening the limit in the DB after the page loaded — the browser allowed it, the server rejected with the product's real limit and nothing was added; a successful add showed `Engraving: “Aarav Nair”` in the cart.
- **A3 vendor side** (signed in as the real vendor): the section, the editor on the product's real photo, drag (+40 px → +8.9% x, +80 px → +17.9% y of a 448 px frame), the resize handle (and its edge clamp, fixed during testing), keyboard and slider routes, saving through the real form → stored setup exactly as placed, product returned to "pending" (a vendor edit to a live product always does), setup reloaded into the form unchanged; the shopper's view then showed "MEERA & ROHAN" on the keepsake box's gift card, tilted to match.
- **Vendor order view** with engraving text temporarily placed on a real order line: "Engrave: “Meera & Rohan”" highlighted, not duplicated in the summary; original data restored.
- **A4:** wrapping ticked, message typed, Royal Blue chosen → exactly one of five wraps visible, caption updated, card read "Dear Asha, Happy birthday! So proud of you — love, Mom".
- **B1:** the quiz in the browser (steps, auto-advance, the 3-interest limit, results), 9 sensible results with reasons; "Change my answers" reopens at question 1 with answers preselected, Back keeps choices; the quiz collapsing to the recap after submit (a bug found and fixed in testing); hostile URLs (`<script>`, negatives, `__proto__`, `who[]`, 500 repeated interests) all return normal pages with nothing reflected; no-JS markup contains all four questions and the submit button; sitemap lists `/gift-finder`, robots doesn't block it.
- **Regression:** tsc, eslint, `next build`, **478/478 tests** (+53 this sprint).

## Not verified
- A real phone: touch dragging of the placement box (pointer events + `touch-action: none` are set, but I could only exercise drag with dispatched pointer events and the keyboard/slider routes — the test tool's own drag jumps without intermediate moves), and the quiz's feel on a small screen.
- That vendors find the editor intuitive — it has had one person (me) using it.
- Engraving text rendering for non-Latin scripts: the allowed-character rules accept them, but the preview fonts (Newsreader, DM Sans, Caveat) have no Devanagari/Tamil glyphs, so the browser falls back to a system font there. The boutique still receives the exact text.
- Gold foil legibility on very busy or very light photos is the vendor's call (4 styles to choose from); only the gold/deep styles were seen on real photos.
- Ranking quality on a real catalogue: tested on 57 demo products and unit tests; the shared candidate slice is capped at 500 products (best-reviewed first).

## Demo data note
The dev database now has live engraving set up on **Personalised Name Plate** (GiftPing Originals; placement is arbitrary — its seed photo isn't actually a name plate) and **Engraved Wooden Keepsake Box** (Lumière; a deliberate placement on the gift card in its photo). Remove them by unticking the section in the vendor form, or: `update products set personalization_options='[]' where slug in (...)`.

## Idea left over
Per-product **text fonts/photo templates**, **two lines of text**, and a **customer-uploaded image** (photo frame) are natural next steps for personalisation; none are built.
