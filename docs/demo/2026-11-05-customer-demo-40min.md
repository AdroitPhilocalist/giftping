# GiftPing customer demo — 40-minute walkthrough

This is the customer-side script only. No admin screens, no vendor portal, no internal dashboards.

The run is built for a local production build at `http://localhost:3000`, not the dev server. The public `www.giftping.in` deployment is a separate step and is currently blocked by Vercel billing, so do not promise a live public URL during this demo.

The story is simple: a customer walks into the mall, finds a gift without hitting dead ends, personalises it, checks out securely, tracks it afterwards, and comes back because the diary remembers the people they love.

---

## Before the demo

### Environment

Use the production build, not `next dev`.

```bash
cd /Users/ricky/Downloads/GiftPing-Dev
npm start
```

If the server is not running, build first and then start:

```bash
npm run build
npm start
```

Open a fresh incognito window so the demo starts signed out and there is no stale session or saved pincode.

Use a desktop viewport around `1280 × 800` or `1440 × 900`, browser zoom at 100%, bookmarks bar hidden. Close Slack, email, and any other notification pop-ups.

### Demo account

- Email: `test-customer@giftping.test`
- Password: `TestPass123!`
- Display name in the database: Asha Nair

Do not show the password on screen. Keep it in a note beside you.

### Demo data to confirm before you start

| Item | What should be there |
|---|---|
| Signed-in cart | 1 × Luxe Memory Hamper, ₹2,999 |
| Guest cart | Empty at the start, because we are in incognito |
| Wishlist | Vintage Luxe Perfume and Jaipur Keepsake Box |
| Orders | `GP-100189` shipped, `GP-100188` delivered with a return request in review |
| Diary | Mom and Dad, with occasions, gift history, and plans |
| Notifications | Price-drop and diary-reminder examples |
| Coupon | `FLAT200` |
| Address | Home, Asha Nair, Kochi, Kerala, 682031 |
| Engraving product | Engraved Wooden Keepsake Box, ₹1,499 |
| Zero-result filter | Birthday + Little Wonders |
| Vendor pagination | GiftPing Originals has 14 active products, so it has two pages |
| Corporate form | Ready, but do not submit unless you want a live lead in admin |

The pending product `Amber & Oud Soy Candle Trio` is not customer-visible. Do not search for it or mention it in this demo.

### Tabs to keep ready

Keep one main tab for the run. Open these only when needed:

- `/sign-up` and `/reset-password` for the 20-second auth detour after you sign out
- `/corporate-gifting` for the close
- `/orders` as a fallback if a navigation gets stuck

### Payment decision

Choose one before the demo starts.

**Safe option:** place the order, land on the order page, click `Pay now`, let the Razorpay test sheet open, point to the secure gateway, then close it. The order stays in payment pending and you can clean it up afterwards.

**Full-moment option:** complete a test payment with a Razorpay test instrument you have already rehearsed. Then show the unwrap celebration and use that order in the order section. Never use a real card.

The script below assumes the safe option. The full-payment path is in the appendix.

### Do not click or promise

- Do not click `Continue with Google`. Google OAuth keys are empty in this environment.
- Do not use phone OTP. `PHONE_OTP_ENABLED=false`.
- Do not promise live courier ETA, live labels, or live tracking. Shiprocket credentials are currently rejected. The order page uses prepared tracking data.
- Do not claim push notifications will arrive on localhost. Show the controls, not a delivery promise.
- Do not claim the public site is deployed from this build. It is a local production build.
- Do not claim Upstash rate limiting is active locally. It is designed for production.
- Do not open admin or vendor screens.

### Rehearsal checklist

- Home loads in under 2 seconds.
- Search suggestions appear for `candle`.
- `choclate` returns fuzzy results.
- `zzzz` returns the helpful no-result state.
- Birthday + Little Wonders shows zero results and the filters stay visible.
- The engraved box accepts `Asha` and shows the preview on the photo.
- Add to cart works signed out.
- Checkout redirects to sign-in.
- Sign-in merges the guest cart.
- `FLAT200` applies.
- Gift wrap and message preview work.
- `Continue to payment` creates an order and lands on the order page.
- `Pay now` opens the Razorpay test sheet.
- Orders, diary, wishlist, and notifications open without a redirect loop.
- Signed out, the diary opens the sample at `/diary/preview`; saving anything asks for sign-in, and `/diary` itself stays private.

---

## Run of show at a glance

| Time | Section | What the client sees |
|---|---|---|
| 0:00–1:30 | Opening | The frame: customer side only, discovery to retention |
| 1:30–4:00 | Home | The mall's front door, occasions, boutiques, diary |
| 4:00–6:30 | Search | Autocomplete, typo tolerance, no dead ends |
| 6:30–10:30 | Browse | Categories, filters, zero-result recovery, sort |
| 10:30–12:30 | Mall and boutiques | Experiential map, boutique storefront, pagination |
| 12:30–15:00 | Gift Finder | Guided selling by person, occasion, budget, likes |
| 15:00–20:00 | Product detail | Variants, engraving, gift note, reviews, add to cart |
| 20:00–23:00 | Cart and sign-in | Mini basket, guest cart merge, per-boutique clarity |
| 23:00–29:00 | Checkout | Address, gift wrap, coupon, server-confirmed total, payment handoff |
| 29:00–32:30 | Orders | Payment pending, shipped tracking, delivered return, review |
| 32:30–35:30 | Diary | People, occasions, ideas, plan, year, privacy |
| 35:30–38:00 | Account and notifications | Profile, addresses, reviews, wishlist, consent, data rights |
| 38:00–39:30 | Corporate and trust | B2B brief, legal pages, security and SEO close |
| 39:30–40:00 | Close | One sentence and the next step |

---

## 0:00–1:30 — Opening

**Goal:** Set the frame and make the demo feel like a customer journey, not a feature tour.

**Do this:**

1. Start on the home page, signed out.
2. Leave the mouse still for a moment.
3. Point to the logo, search, account icon, and basket.
4. Do not click yet.

**Say this:**

> Today I'm only showing the customer side. No admin, no vendor portal. We're going to shop the way a real customer would: walk in, find something, personalise it, pay, track it, and come back for the next occasion.
>
> Three things to watch. First, discovery never dead-ends. Second, checkout is server-authoritative, so the browser never decides the price. Third, the diary is the retention engine: it remembers the people and dates that bring customers back.
>
> This is the production build running locally, so the experience and speed are what customers get. The public domain cutover is a separate step.

**They should see:** A polished home page with a search bar, occasion shortcuts, and a basket icon.

**If it goes wrong:** If the page is slow, keep talking and do not refresh. Remote Supabase is the bottleneck, not the page code.

**World-class / security note:** The site is server-rendered, mobile-first, and built on a security-hardened Next.js setup. The customer never sees the admin or vendor surfaces.

---

## 1:30–4:00 — Home: the mall's front door

**Goal:** Show that the home page is a merchandised mall, not a flat catalogue.

**Do this:**

1. Scroll slowly through the hero.
2. Point to the occasion shortcuts: Birthday, Anniversary, Wedding, Corporate, More.
3. Point to the festival countdown or campaign only if one is visible. It is schedule-driven and may be off between festivals; do not wait for it.
4. Point to the search card.
5. Scroll to the discover cards: Premium Collections, Boutique Stores, Gifting Diary, Corporate Gifting.
6. Scroll to the relationship cards: Parents, Partner, Friends, Colleagues, Little Ones.
7. Click `For Parents` to show `/gifts-for/parents`. Point to the relationship hero and the real product grid. Go back to the home page.
8. Scroll to the Gift Finder band.
9. Scroll to Trending in the Mall and the featured boutiques.
10. Stop on the diary band. Click it once: because you are signed out, it opens the sample book at `/diary/preview`. Turn one page, open `Mom`, and point to the `Sample diary` banner and the sign-in prompts on the save actions. Go back to the home page. This is the teaser; the real diary comes after sign-in.

**Say this:**

> This is the front door. The hero is editorial, the occasion strip is the fast path, and the search card is the intent path. Any festival campaign is data-driven: the shop can change it without a code change.
>
> These are not decorative cards. Every card leads to real products or a real destination. The relationship cards are especially important: `For Parents`, `For Your Partner`, `For Friends` are real filters over tags the boutiques already choose.
>
> The diary band is the difference between a marketplace and a gifting companion. A visitor can open the sample diary and explore it before creating an account — the people and dates are made up, and every save action asks them to sign in. We'll open the real one after checkout.

**They should see:** Smooth scrolling, real product imagery, and cards that look clickable.

**If it goes wrong:** If an image is slow, keep scrolling and talk over it. Do not refresh.

**World-class / security note:** The home page is merchandised through the admin, not hard-coded. The layout is responsive and the images are optimised. The customer-facing site is separate from the vendor and admin roles.

---

## 4:00–6:30 — Search: intent, not a dead end

**Goal:** Show fast suggestions, typo tolerance, and a helpful empty state.

**Do this:**

1. Click the search field.
2. Type `candle` slowly.
3. Let the suggestions appear.
4. Point to the grouped suggestions: products, categories, boutiques, and `See all results`.
5. Press Enter or click `See all results`.
6. On the results page, point to the product cards and the count.
7. Click the search field again and type `choclate`.
8. Show the fuzzy fallback line: `No exact matches — showing close results`.
9. Clear the field and type `zzzz`.
10. Show the no-result state and the related browse links.

**Say this:**

> Search is intent capture. The moment someone types, we suggest products, occasions, and boutiques, not just a list of products. If they make a typo, we don't punish them: `choclate` still finds chocolate. If there's truly nothing, we don't show a blank page. We offer a way out.
>
> This is the difference between a search box and a discovery system. The goal is to keep the customer moving, not to make them start over.

**They should see:** Suggestions under the field, results for `candle`, fuzzy results for `choclate`, and a friendly no-result page for `zzzz`.

**If it goes wrong:** If suggestions do not appear, press Enter. The search form is a plain GET fallback, so the results page still works.

**World-class / security note:** Search queries are not indexable. Query URLs are `noindex, nofollow`, so the crawl budget is not wasted on infinite filter combinations. Query-free category and type pages stay indexable.

---

## 6:30–10:30 — Browse: categories, filters, and zero-result recovery

**Goal:** Show the core browse experience and the zero-dead-end filter behaviour.

**Do this:**

1. Hover `Occasions` in the main navigation to show the mega menu.
2. Click `Shop by Type` in the navigation to open `/shop`. Point to the product-type cards and the `What kind of gift?` framing.
3. Click `Occasions` to open `/categories`.
4. Point to the ten occasion cards.
5. Click `Birthday` to open `/categories/birthday`.
6. Point to the category hero, the sibling occasion links, the filter panel, the sort control, and the result count.
7. In the filter panel, select `Little Wonders` under Boutique.
8. Show the zero-result state. The filters must remain visible.
9. Without clearing anything, click `GiftPing Originals`.
10. Show results returning immediately.
11. Point to the applied filter chip and click `Clear all`.
12. If time, change the sort order to `Price: Low to High`.

**Say this:**

> We have two ways into the catalogue: by occasion and by type. `Shop by Type` answers "what kind of gift?" and `Occasions` answers "what is the moment?" Both are real browse paths, not landing pages.
>
> This is the browse page, and this is where most marketplaces lose people. A customer applies one filter too many, gets zero results, and has to start over. We don't do that.
>
> Watch: Birthday plus Little Wonders is a legitimate combination with no products. The page does not hide the filters. It keeps them right there. I can change one thing — the boutique — and the results come back. I don't have to reset the whole page.
>
> That is the Amazon and Flipkart expectation, but done with our own visual language. The filters are client-side actions, so the query-string combinations do not become crawlable links. The customer gets the convenience; Google gets a clean category page.

**They should see:** Zero results with filters still visible, then results return when the boutique changes.

**If it goes wrong:** If the filter action is slow, use the direct URL `/categories/birthday?vendor=giftping-originals` and keep the same talk track.

**World-class / security note:** The filter controls are buttons, not crawlable query links. Query URLs return `noindex, nofollow` and an `X-Robots-Tag` header. Query-free category pages remain indexable. There is no global `/*?` robots rule, so the site does not accidentally block clean URLs.

---

## 10:30–12:30 — Mall and boutiques: the experiential layer

**Goal:** Show that GiftPing has a sense of place and real boutique storefronts.

**Do this:**

1. Click `Explore Mall` in the navigation.
2. Point to the floor plan and the numbered zones.
3. Hover one zone to show the robin guide.
4. Click `Boutique Avenue` or the boutiques zone.
5. On `/vendors`, point to the boutique cards, ratings, and descriptions.
6. Open `GiftPing Originals`.
7. Point to the storefront hero, the product grid, and the pagination.
8. Click `Next` to show page 2. Do not stay there.

**Say this:**

> This is the experiential layer. The mall is not a gimmick: every zone is a real destination. The boutiques are real storefronts with their own story, rating, and products.
>
> GiftPing Originals has fourteen active products, so the storefront paginates. That matters because the catalogue is not a single flat list. Each boutique can grow without making the page unusable.

**They should see:** The mall map, the boutique directory, the GiftPing Originals storefront, and pagination.

**If it goes wrong:** If the mall map is slow, go straight to `/vendors` and keep the same point about real storefronts.

**World-class / security note:** Vendor storefronts are public and indexable. Vendor onboarding, product approval, and payouts stay in the vendor and admin portals, out of the customer journey.

---

## 12:30–15:00 — Gift Finder: guided selling

**Goal:** Show the quiz that turns a vague gifting problem into a shortlist.

**Do this:**

1. Click `Gift Finder` from the home band or navigate to `/gift-finder`.
2. Choose `Mom`.
3. Choose `A birthday`.
4. Choose a budget. Use `₹2,500` or the closest option.
5. Choose two likes: `Candles & home` and `Personalised things`.
6. Continue to the results.
7. Point to the result cards and the reason lines.
8. Point to the shareable URL.
9. If time, change one answer and show the results update.

**Say this:**

> Most gift shopping starts with a vague brief: "something for my mom, under three thousand, she likes candles." The Gift Finder turns that into a structured brief without making the customer fill a form.
>
> The results are not random. Each card explains why it is there: the relationship, the occasion, the budget, the interest. That reason line is the difference between a recommendation and a guess.
>
> The URL is shareable, so a customer can send it to a partner or come back to it later. The quiz is also a data asset: it tells us what people are actually looking for.

**They should see:** A short, focused quiz and a result page with gift ideas and reasons.

**If it goes wrong:** If the quiz feels slow, skip the final question and use the direct URL `/gift-finder?who=mother&occasion=birthday&budget=2500&likes=home,personalised`.

**World-class / security note:** The quiz does not require an account. It is a low-friction entry point. The answers are used to filter real products, not to create a fake personalised page.

---

## 15:00–20:00 — Product detail: the decision page

**Goal:** Show why the product page is built to convert and reassure.

**Do this:**

1. Open `/products/luxe-memory-hamper`.
2. Point to the gallery, the sale price, the strike-through price, the discount badge, and the stock line.
3. Point to the quantity stepper and `Buy now`. Explain that `Buy now` is the one-step path; we are using `Add to cart` so the mini basket can be shown.
4. Point to the variant selector. Show `Classic Green` and `Premium Gold (+₹150)`.
5. Point to `Personalise your gift`: recipient name, personal note, occasion.
6. Type `Amma` in the recipient field.
7. Type `Happy birthday, Amma — with all my love, Asha.` in the note.
8. Show the gift card preview update.
9. Select `Birthday`.
10. Point to the delivery checker. If you use it, enter `682031`. If it says it will confirm at checkout, use that as the resilience point.
11. Point to the vendor link, the benefits, and the tabs: about, specifications, delivery and returns, reviews.
12. Open the reviews tab. Show the rating and the customer review.
13. Scroll to related products and the diary band.
14. Open `/products/lumiere-engraved-wooden-keepsake-box`.
15. Point to the live engraving field.
16. Type `Asha`. Show the name appear on the photo preview.
17. Fill `Recipient's name` with `Amma`.
18. Fill `A personal note` with `For the keepsakes that matter.`
19. Select `Birthday`.
20. Click `Add to cart`.

**Say this:**

> This is the decision page. The customer can see the price, the saving, the stock, the boutique, and the reviews without leaving the page.
>
> The variants are real: each option can carry its own price and stock. The personalisation is not a text box that disappears into an email. The note previews as a gift card, and the engraving previews on the product photo. That is the moment the customer sees the gift becoming theirs.
>
> The delivery checker is deliberately honest. If we know the route, we show a date. If the courier data is unavailable, we don't block the sale; we confirm at checkout. Only a definite "no courier serves this route" blocks the order. That is a resilience decision, not a missing feature.
>
> The reviews are social proof. The vendor link is trust. The tabs answer the questions that stop a purchase: what is it, how big is it, how does delivery work, what if I need to return it.
>
> Now I'm adding the engraved box as a guest. Watch the basket.

**They should see:** The gift card preview, the engraving preview, the delivery answer, the engraved box flying into the basket, and the mini basket or toast after adding.

**If it goes wrong:** If the engraving preview does not load, type the name anyway and say the preview is the visual layer; the server validates the engraving rules again on add to cart. If add to cart fails, use `Buy now` as the fallback.

**World-class / security note:** The server re-checks stock, variants, engraving rules, and price when the item is added and again at checkout. The browser is never trusted with the final price. Product pages carry structured data and canonical URLs so they can be found without exposing filter combinations.

---

## 20:00–23:00 — Cart and sign-in: the basket follows the customer

**Goal:** Show the mini basket, the cart, the guest cart merge, and the per-boutique clarity.

**Do this:**

1. Move the mouse to the basket icon. The mini basket should show the engraved box.
2. Click `View basket` or go to `/cart`.
3. Point to the guest cart line.
4. Click `Proceed to checkout`.
5. You should be redirected to `/sign-in?redirectTo=/checkout`.
6. Sign in with the test customer.
7. You should return to checkout, and the cart should now include the signed-in account's Luxe Memory Hamper plus the guest engraved box.
8. If you land somewhere else, go to `/cart`.
9. Point to the two boutique groups, the quantities, the remove controls, the free-delivery nudge, and the assurance strip. If the festival note appears, point to it as the same countdown in a quieter form.
10. Reduce the hamper quantity to 1 if it is higher. Keep the engraved box at 1.

If you want to show the empty-cart state, do it before the run in a separate window: `/cart` offers `Explore the Mall` and `Shop by occasion` instead of a blank page. Do not open a second tab mid-run, because it shares the same session.

**Say this:**

> The basket is not a single anonymous list. It is grouped by boutique, because each boutique ships its own parcel. The customer can see who is sending what.
>
> The guest cart is important. A first-time customer can add something before signing in. When they sign in, the basket follows them. We don't punish them for shopping first.
>
> The free-delivery nudge is per boutique, not a fake site-wide progress bar. That is how the shipping actually works.

**They should see:** The mini basket, the sign-in redirect, the merged cart, and two boutique groups.

**If it goes wrong:** If the redirect does not return to checkout, sign in, then click the basket and `Proceed to checkout` again. The merge is already done.

**World-class / security note:** The guest cart is merged server-side after sign-in. The cart stores price snapshots for display, but checkout deliberately ignores them and re-prices from the database. The session is cookie-based and role-checked on the server.

---

## 23:00–29:00 — Checkout: trust, clarity, and a secure handoff

**Goal:** Show a checkout that feels simple to the customer and is strict underneath.

**Do this:**

1. On `/checkout`, point to the three steps: `Delivery address`, `Make it a gift`, `Review items`.
2. Show the saved Home address. Point to `Add new address`, `Edit`, `Set as default`, and `Delete` without submitting.
3. Select the Home address. If a delivery line appears, point to the per-boutique ETA. If it does not, explain the fail-open rule.
4. Tick `Add gift wrapping (+ ₹49)`.
5. Choose `Premium Gold`.
6. Type a gift message: `Happy birthday, Amma — with all my love, Asha.`
7. Show the wrap preview and the card preview.
8. In the order summary, point to the subtotal, delivery, GST, and total.
9. Apply coupon `FLAT200`.
10. Show the discount line and the new total.
11. Point to the note: final amounts are confirmed by GiftPing.
12. Click `Continue to payment`.
13. On the order page, point to the order number and the `Pay now` button.
14. Click `Pay now` to open the Razorpay test sheet.
15. Point to the secure gateway, the amount, and the test-mode label. Then close the sheet unless you are doing the full-payment option.

**Say this:**

> Checkout is where trust is won or lost. The customer sees a saved address, a clear gift option, and a total that includes GST. The coupon is applied server-side.
>
> The most important line on this page is the small one: final amounts are confirmed by us. The browser is not sending a price. The server recomputes the quote from the database, the coupon rules, the delivery rules, and the stock. That is how we prevent price tampering.
>
> Placing the order creates the order first, then hands off to Razorpay. The payment signature is verified, and the webhook is the source of truth. The order is idempotent, so a double click cannot create two orders.
>
> In this local demo the courier credentials are not live, so the delivery line may say we'll confirm at checkout. That is the designed fail-open state. A definite unserviceable route still blocks the order.

**They should see:** The gift wrap preview, the coupon discount, the order summary, the order page, and the Razorpay test sheet.

**If it goes wrong:** If the Razorpay sheet does not open, do not refresh repeatedly. Say the payment handoff is live in production and move to the order page. If the coupon fails, remove it and continue; the total is still correct.

**World-class / security note:** Checkout is server-authoritative. The browser never sends a price, discount, or vendor. Payment is signature-verified and webhook-confirmed. The order uses an idempotency key. The site has a per-request CSP nonce, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy, and a restrictive permissions policy.

---

## 29:00–32:30 — Orders: post-purchase transparency

**Goal:** Show that the customer can see what happened, what is coming, and what they can do next.

**Do this:**

1. From the order page, click `My orders` or go to `/orders`.
2. Point to the newest order. It should be the one you just created, in payment pending.
3. Open `GP-100189` (shipped).
4. Point to the progress stepper, the per-boutique shipment cards, the AWB, the courier, the expected delivery, and the tracking link.
5. Do not click the external courier tracking link in this demo. The AWB is prepared demo data.
6. Scroll to the items, delivery address, gift message, and payment summary.
7. Go back to `/orders` and open `GP-100188` (delivered).
8. Point to the delivered status, the return request already in review, and the `Cancel request` button. If a refund exists, the same card shows the refunded amount and the 5–7 working-day note.
9. Point to the review buttons on the delivered items.
10. Open one review modal. Show the star rating, title, and body. Close it without submitting, or submit a short review if you want the full loop.

**Say this:**

> Post-purchase is where most marketplaces go quiet. Here the customer sees the order status, the boutique split, the AWB, and the expected date. Each boutique ships separately, so each has its own shipment card.
>
> The return request is self-serve. The customer can see that it is in review and can cancel the request if they change their mind. The review button is right where the delivered item is, not buried in an account menu.
>
> The new order at the top is in payment pending because we stopped at the gateway. That is a real state, not a bug. In a live run, the webhook moves it to confirmed.

**They should see:** The order list, the shipped order with tracking, the delivered order with a return request, and the review modal.

**If it goes wrong:** If the new order pushes the old orders down, scroll or use the order number. If the tracking link is not live, say the in-app timeline is the customer-facing view and the courier link is the external handoff.

**World-class / security note:** Order pages are scoped to the signed-in customer. The server checks ownership before rendering. Returns and reviews are server-validated. The customer cannot see another customer's order by changing the URL.

---

## 32:30–35:30 — Diary: the retention engine

**Goal:** Show the feature that turns a one-time purchase into a relationship.

**Do this:**

1. Click the diary button in the header or go to `/diary`. You are signed in now, so this is the real diary, not the sample.
2. Point to the front spread: what is coming up, the gifting score, this month, and the people.
3. Click the `People` tab. Point to the add-person page at the end of the tab: name, relationship, photo, budget, interests, and reminders.
4. Open `Mom`.
5. Point to the photo, relationship, birthday, budget, interests, favourite, notes, gift history, and plan.
6. Click `Add a date` or `Edit` to show the fields: occasion type, date, recurring, reminder days. Close without saving.
7. Go back to the diary and click the `Ideas` tab.
8. Point to the gift ideas and the reason lines.
9. Click `Pick this` on one idea. Show `Your pick` and the plan strip.
10. Click the `Year` tab. Point to the year review and `Share my year`.
11. Click `Share my year` only if you are comfortable with the share sheet; otherwise point to it and explain that only the numbers leave the diary, never names or photos.
12. If time, click the `Score` tab to show the gifting score and streak.
13. Point to the `Month` and `Log` tabs even if you do not open them: `Month` is the calendar and the next 60 days, and `Log` is the gift-history timeline.

**Say this:**

> This is the retention engine. The diary remembers the people, the dates, the budgets, the interests, and what you gave last time. It turns GiftPing from a place you visit when you need a gift into a place that reminds you before you need one.
>
> The plan strip is the whole gifting workflow: idea, chosen, ordered, wrapped, given. When a real order exists, the ordered step fills itself in and links to the tracking. When the gift is given, it writes into the person's history so next year's reminder is smarter.
>
> The year review is the emotional payoff. And the share button is privacy-first: it shares the numbers, not the names, photos, or dates.

**They should see:** The diary book, the people cards, Mom's page, the plan strip, the year review, and the share button.

**If it goes wrong:** If the diary is slow, use the direct person page or skip the `Pick this` click and explain the plan strip.

**World-class / security note:** Diary photos are private and served through signed URLs. The share feature deliberately excludes names, photos, and dates. Reminders are opt-in and can be paused per person. The real diary is a private signed-in surface; `/diary/preview` is a sample with invented rows, no customer photos, and `noindex`. Saving anything requires sign-in.

---

## 35:30–38:00 — Account, wishlist, notifications, and data rights

**Goal:** Show the customer controls and the privacy posture.

**Do this:**

1. Go to `/account`.
2. Point to the tiles: Profile, My orders, Gifting diary, Wishlist, My reviews, Saved addresses, Notifications.
3. Open `Profile`. Point to the avatar upload, name, phone, and read-only email. Do not save.
4. Go back and open `Saved addresses`. Point to the Home address and the add, edit, default, and delete controls.
5. Open `My reviews`. Point to the existing review and the edit and delete controls.
6. Open `/wishlist`. Point to the two saved gifts and the move-to-cart and remove actions. If an unavailable section is present, point to it as the honest out-of-stock state.
7. Open `/notifications`. Point to the price-drop and diary-reminder examples, the read state, and `Mark all as read`.
8. Open `/account/notifications`. Point to the three categories: diary reminders, order updates, wishlist price drops. Point to the email and push toggles.
9. Point to the marketing consent. It is off by default.
10. Scroll to `Download my data` and `Delete account`. Do not click delete. If you want, click download and show the JSON file, then close it.
11. Sign out from the account menu.
12. Open `/sign-up`. Point to the marketing opt-in, which is off by default. Do not submit.
13. Open `/reset-password`. Point to the email field and explain that the emailed token opens the update-password page. Do not submit.

**Say this:**

> The account area is not a settings graveyard. It is where the customer controls their data, their addresses, their reviews, and their notifications.
>
> The wishlist is a real save-for-later list. The price-drop notification is the reason to keep it. The notification settings are granular: diary reminders, order updates, and wishlist alerts are separate, and email and push are separate.
>
> Marketing consent is off by default. The data export is a real JSON download. The delete-account path is there, not hidden. This is the DPDP posture: access, correction, consent, and deletion.
>
> Sign-up and password reset are the front doors. I've signed out so you can see them. We're using email sign-in for this demo. We're not using Google sign-in in this environment.

**They should see:** The account tiles, profile, addresses, reviews, wishlist, notifications, consent toggles, data export, and the auth pages.

**If it goes wrong:** If the push toggle is unsupported in the browser, say the control is there and the delivery depends on the browser permission. Do not promise a push notification on localhost.

**World-class / security note:** Data export and delete are POST-only and scoped to the signed-in user. The unsubscribe link is a signed token and the page requires a confirm click, so mail scanners cannot unsubscribe someone by opening a link. Marketing consent is explicit and off by default. Role redirects keep customers out of vendor and admin URLs, and the server re-checks the role on every protected action.

---

## 38:00–39:30 — Corporate gifting and trust

**Goal:** Show the B2B path and close on trust.

**Do this:**

1. Open `/corporate-gifting`.
2. Point to the hero, the corporate-ready shelf, `What we handle`, and `How it works`.
3. Scroll to the brief form.
4. Point to the fields: company, name, work email, phone, gifting need, quantity, budget per gift, delivery city, delivery date, branding, message, consent.
5. Do not submit unless you want a live lead in admin.
6. Scroll to the FAQs. Point to bulk quantities, branding, individual employee delivery, GST invoices, lead time, and budget.
7. Open `/about` in a new tab. Point to the story, the values, and the boutique promise. Close the tab.
8. Open `/contact` in a new tab. Point to the support email, the order and returns links, and the response expectation. Close the tab.
9. Open the footer. Point to `About Us`, `Contact`, `Privacy Policy`, `Terms & Conditions`, and `Refund Policy`.
10. Open one legal page, preferably `Privacy Policy`, and point to the plain-language sections.
11. Return to the home page and point to the trust strip at the bottom.

**Say this:**

> Corporate gifting is a separate funnel, not a contact form. The brief captures the gifting need, quantity, budget, delivery city, date, and branding. That is a qualified lead, not a "contact us" email.
>
> The FAQs answer the questions that kill corporate deals: minimums, logos, individual employee delivery, GST invoices, lead time, and budget.
>
> The trust strip and the legal pages are part of the product. Privacy, terms, refunds, and contact are linked in the footer, in plain language.

**They should see:** The corporate page, the brief form, the FAQs, the About and Contact pages, and the legal pages.

**If it goes wrong:** If the corporate page is slow, use the nav link and keep the same points. Do not submit the form just to fill time.

**World-class / security note:** Corporate enquiries are stored separately from customer orders. GST invoicing and branding are handled through the brief. The legal pages are indexable and the unsubscribe page is noindex.

---

## 39:30–40:00 — Close

**Goal:** End with one clear sentence and the next step.

**Say this:**

> That is the customer journey end to end: discovery that doesn't dead-end, a product page that makes the gift personal, a checkout that is simple on the surface and strict underneath, and a diary that brings the customer back.
>
> The next step is the production cutover and a short list of follow-ups: live courier credentials, the public deployment, and the final mobile pass.

Do not take questions that pull you into admin or vendor. If asked, say those are separate surfaces and can be shown in a follow-up.

---

## Feature coverage map

Use this to check that every customer-side feature was at least shown or explained. "Point to" means show the control and explain it; "open" or "click" means interact with it.

| Area | Feature | Where it appears |
|---|---|---|
| Home | Hero, occasion shortcuts, search, festival countdown, banners, discover cards, relationship cards, Gift Finder band, trending products, featured boutiques, diary band | 1:30–4:00 |
| Search | Autocomplete, grouped suggestions, product results, fuzzy fallback, no-result state, related browse links | 4:00–6:30 |
| Browse | Mega menu, categories, category hero, sibling occasions, filters, sort, applied chips, clear all, zero-result recovery | 6:30–10:30 |
| Mall | Floor plan, numbered zones, robin guide, boutique directory | 10:30–12:30 |
| Boutiques | Storefront hero, rating, product grid, pagination | 10:30–12:30 |
| Gifts for | Relationship pages and filters | 1:30–4:00, 6:30–10:30 |
| Shop by type | Product-type directory | 6:30–10:30 |
| Gift Finder | Who, occasion, budget, likes, results, reason lines, shareable URL | 12:30–15:00 |
| Product | Gallery, price, sale, stock, variants, engraving preview, recipient name, gift note, occasion, gift card preview, quantity, add to cart, buy now, delivery checker, vendor, benefits, tabs, specifications, reviews, related products, diary band | 15:00–20:00 |
| Reviews | Rating, review list, write, edit, delete, verified purchase | 15:00–20:00, 29:00–32:30, 35:30–38:00 |
| Cart | Mini basket, fly-to-basket, per-boutique groups, quantity, remove, free-delivery nudge, guest cart merge, checkout steps, assurances, festival note, empty state | 20:00–23:00 |
| Checkout | Address book, add, edit, default, delete, serviceability, ETA, express, gift wrap, wrap styles, wrap preview, gift message, review items, coupon, summary, GST, free delivery, place order, payment handoff, server-authoritative pricing, idempotency | 23:00–29:00 |
| Payments | Razorpay test sheet, signature verification, webhook, confirmation animation | 23:00–29:00, appendix |
| Orders | List, status, progress stepper, per-boutique shipments, AWB, courier, expected delivery, tracking link, return request, cancel request, refund status, review, order summary, address, gift message | 29:00–32:30 |
| Diary | Guest sample at `/diary/preview` (banner, sample person, sign-in-gated saves), real front spread, Today, Month, Ideas, People, Year, Score, Log, add/edit person, photo, interests, budget, favourite, notes, add/edit occasion, recurring, reminders, pause reminders, gift ideas, pick, plan statuses, log gift, timeline, share year | 1:30–4:00, 32:30–35:30 |
| Wishlist | Saved gifts, unavailable section, move to cart, remove, heart on cards, price-drop notification | 35:30–38:00 |
| Notifications | Bell dropdown, in-app list, read state, mark all read, email and push toggles, marketing consent, unsubscribe | 35:30–38:00 |
| Account | Profile, avatar, phone, addresses, reviews, orders, diary, wishlist, notifications, data export, delete account | 35:30–38:00 |
| Auth | Sign-in, sign-up, password reset, update password, guest cart merge, role redirects, Google (not used) | 20:00–23:00, 35:30–38:00 (after sign-out) |
| Corporate | Corporate page, shelf, how it works, brief form, FAQs, GST, branding, bulk, individual delivery | 38:00–39:30 |
| Trust and legal | About, contact, privacy, terms, refunds, trust strip, footer | 38:00–39:30 |
| Security | CSP nonce, security headers, RLS, server role checks, server-authoritative checkout, payment signature, webhook, idempotency, data rights, consent | Throughout, explicit at checkout and account |
| SEO and performance | Query noindex/nofollow, query-free pages indexable, canonical URLs, structured data, sitemap, robots, image optimisation, intent-only prefetch, staleTimes | Throughout, explicit at browse and close |
| Mobile | Bottom tab bar, mobile menu, filter bottom sheet, responsive product and checkout | Optional responsive view; rehearse before showing |
| Accessibility | Keyboard focus, aria labels, live regions, reduced motion | Throughout |

---

## Appendix A — Full-payment path

Use this only if you have rehearsed the Razorpay test instrument.

1. Place the order.
2. On the order page, click `Pay now`.
3. Complete the payment with the test instrument.
4. Wait for the confirmation state. The unwrap celebration should play.
5. Return to `/orders`. The new order should be confirmed, not payment pending.
6. Use the new order for the order section, or keep using the prepared orders.

After the demo, cancel or refund the test order so the customer account stays tidy.

## Appendix B — If you are running long

Cut in this order:

1. Skip the vendor pagination click.
2. Skip the `zzzz` no-result search.
3. Skip the second product page and show only the engraving field on the first product page.
4. Skip the `Share my year` click.
5. Skip the sign-up and reset-password tabs.
6. Skip the corporate form and just point to the page.

Do not cut the zero-result filter recovery, the guest cart merge, the gift wrap preview, or the order tracking. Those are the moments that prove the product.

## Appendix C — If something breaks

| Problem | What to do |
|---|---|
| Home is slow | Keep talking, do not refresh. Remote Supabase is the bottleneck. |
| Search suggestions do not appear | Press Enter. The results page still works. |
| Filter action is slow | Use the direct URL with the same query. |
| Sign-in does not return to checkout | Sign in, then go to `/cart` and click `Proceed to checkout`. |
| Razorpay sheet does not open | Say the handoff is live in production, then move to the order page. Do not refresh repeatedly. |
| Delivery says confirm at checkout | That is the fail-open state. Say the courier credentials are not live locally. |
| Push toggle does not work | Say it depends on browser permission and is not tested on localhost. |
| External tracking link is not live | Use the in-app timeline. The AWB is prepared demo data. |
| A page redirects to sign-in unexpectedly | Sign in again. The session may have expired. |

## Appendix D — Cleanup after the demo

- If you placed an unpaid order, cancel it from admin.
- If you completed a test payment, refund or cancel the test order.
- If you added a review, delete it if you want the demo data to stay exactly as prepared.
- If you clicked `Download my data`, the JSON file is in your downloads and a notification was created. That is expected.
- If you submitted the corporate form, a lead is now in admin. That is expected if you chose to show the success state.
- Close the incognito window so the guest cart and any local pincode are cleared.
