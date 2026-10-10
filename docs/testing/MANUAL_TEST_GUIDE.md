# GiftPing — Manual Testing Guide

A checklist for clicking through everything that's been built so far, in the real browser, as a real user
would. Work through it section by section — each one is a self-contained area, so you don't have to do this
in one sitting. Check boxes as you go; anything that doesn't match "Expected" is a bug worth writing down
(see "Reporting a bug" at the very end).

This guide covers **local development** against the seeded dev database. It does not require a separate
production Supabase project (there isn't one yet — see `PROGRESS.md`'s Stage 13 checklist), but as of
10 Oct the domain and two real integrations are live and usable from local dev too:

- **The site is live for real** at `https://www.giftping.in` — the exact same dev database as localhost, so
  the test accounts below work there too. Testing against the live domain is fine; nothing separates it
  from localhost except the URL (and real Shiprocket/Resend calls going to real external services either way).
- **Shiprocket now has real credentials** (`.env.local`/Vercel). Delivery/pincode checks are no longer a
  fail-open no-op — a real serviceability lookup actually runs. **A real courier booking ("Book courier" in
  the vendor portal) now genuinely calls the live Shiprocket account** and will create a real order there —
  only click through the FULL booking flow (including the final pickup request) if you actually mean to
  book a real test pickup. If you just want to confirm the earlier steps work (pickup-location registration,
  order creation, AWB assignment), stop short of the final step, or ask first.
- **Resend now has a verified domain** (`connect@giftping.in`). Real emails now actually send to whatever
  address you use — use a real inbox you control for anything that should land in an actual mailbox
  (password reset, order confirmation, a marketing-campaign test), and be mindful this counts against the
  real monthly send quota.

---

## 0. Before you start

- [ ] Start the dev server (`npm run dev`) and confirm `http://localhost:3000` loads.
- [ ] Make sure the demo data is seeded: `npm run seed:images && npm run seed:demo` (safe to re-run any
      time — it's idempotent and won't duplicate anything).
- [ ] Use a normal browser (Chrome/Safari/Firefox), not just the preview pane — some things (real file
      pickers, native confirm dialogs, a second logged-in tab) need a real browser.

### Test accounts (all password `TestPass123!`)

| Email | Role | Notes |
|---|---|---|
| `test-customer@giftping.test` | Customer | Has an existing diary, order history, reviews |
| `test-vendor@giftping.test` | Vendor | Owns the boutique **Lumière Keepsakes** |
| `test-admin@giftping.test` | Admin | Full admin access |

**Tip**: You'll want to be signed in as different roles at once sometimes (e.g. admin approves something,
then check it as the vendor). Easiest way: use one normal window for one role and an Incognito/Private
window for another, rather than signing in and out repeatedly.

### Useful known data already in the seed

- **Working coupons**: `WELCOME10` (10% off, capped at ₹250, needs a ₹499+ cart), `FLAT200` (₹200 off a
  ₹1,299+ cart).
- **Coupons that should be *rejected*** (for edge-case testing): `DIWALI25` (expired), `NEWYEAR20` (not
  started yet).
- **Demo vendors**: Lumière Keepsakes, Aurelia Gifts, Lumen & Ash, Saffron & Silk, The Brass Diya, Petal &
  Bloom, Cocoa Atelier, Inkwell & Co, Little Wonders, Vela Jewels — plus GiftPing Originals (in-house, 0%
  commission).
- **Delivery/pincode checks now call the real Shiprocket API** (real credentials are configured). Most
  pincodes should come back serviceable, but if you want to see the old fail-open "unknown ⇒ allowed"
  behavior, try a clearly invalid pincode (e.g. `000000`) rather than assuming every real-looking number
  gets real coverage.
- **Payments**: Razorpay is in **test mode**. Use their test UPI handle `success@razorpay` to simulate a
  successful payment, or `failure@razorpay` to simulate a failed one — no real money moves. If you use a
  test card instead, open the Razorpay checkout modal first; it shows the currently valid test card numbers
  for your account (these change over time, so don't rely on a fixed number from an old note).

### What this guide can't make you test (do these separately, if you want full coverage)

A few things need a human specifically because of how they work — flag these as "still to verify" rather
than assuming they're broken if you don't get to them:
- Completing a real payment inside Razorpay's own checkout iframe (cross-origin, can't be automated)
- **The final step of a real courier booking** — accepting an order and clicking "Book courier" as the
  vendor is now a genuinely real action against the live Shiprocket account (see the note above). This
  environment's own tooling is blocked from clicking that specific button for safety reasons, so the full
  flow (pickup-location registration → real order → AWB → pickup request) still needs a human to click it
  once and confirm the AWB comes back correctly.
- A real web push notification (needs a real HTTPS deployment, not localhost — `https://www.giftping.in`
  now qualifies, so this is testable there even though it isn't locally)
- Native browser dialogs (`confirm()`/`alert()` — e.g. "Delete this review?", "Send to N vendors?") — these
  work fine when you click them yourself, just noting they weren't something I could click-test earlier
- Picking a real file in the OS file picker (avatar photo, product image, diary photo, vendor logo/banner)

---

## 1. Browsing as a guest (not signed in)

- [ ] **Homepage** (`/`): hero photo loads, headline readable, "Explore the Mall" and "Watch Our Story"
      buttons both work, occasion icon row (Birthday/Anniversary/Wedding/Corporate/More) all link correctly,
      scroll down through the featured banners carousel, "Shop by relationship" section, footer.
- [ ] **Header behavior**: at the top of the homepage the header should look like a **glassy tint over the
      photo** (you can still see the picture through it). Scroll down — it should become a **solid green
      pill** with a thin gold edge around it. Scroll back to the top — it should return to the glass look.
- [ ] **Mall** (`/mall`): map/directory loads, hovering a numbered zone previews its image, "Handpicked
      Experiences" cards below show real photos, clicking a zone or card navigates correctly.
- [ ] **Occasions** (`/categories`, the "Occasions" nav item): Birthday, Anniversary, Wedding, Corporate
      Gifting, Housewarming, Thank You, and Festivals should all show **photo cards** (Batch 3 artwork).
      **For Her and For Him deliberately still show the plain icon card** — their artwork has real,
      legible third-party brand logos (Dior, Chanel) visible in it, a trademark risk, so it's intentionally
      suppressed on this page until that artwork is regenerated (this is expected, not a bug).
- [ ] Click into an individual occasion, e.g. `/categories/birthday`: hero photo banner, product grid,
      filters (occasion tag / recipient tag / in-stock only / sort), pagination if there are enough products.
- [ ] **Boutiques** (`/vendors`): listing grid loads with vendor cards. Click into **Lumière Keepsakes**:
      full-bleed banner photo, glass header effect over it (same as homepage), trust-feature cards below
      (should show *generic, truthful* claims, not copy that assumes every boutique is a candle shop).
- [ ] Click into a boutique that has **no uploaded banner** (any of the newer demo vendors) — confirm it
      still looks intentional (either a shared stock shopfront photo or the drawn shopfront illustration),
      not broken or blank.
- [ ] **Product page** (any product): gallery/images, variant selector (if the product has sizes/colors —
      try `signature-gift-box-forest-green`), price updates when you change a variant, personalization field
      if present, reviews section at the bottom shows existing reviews with reviewer initials (e.g. "Priya
      S."), never a full name of a stranger.
- [ ] **Search** (`/search`): search for a real product name/keyword, confirm relevant results; search for
      nonsense (`asdkfjhaskdjfh`) — confirm a friendly "nothing found" state, not an error.
- [ ] **Search suggestions (type-ahead)** — on the homepage search box AND `/search`: type `ham` — within a
      moment a dropdown lists hampers (photo, boutique name, price) with "Ham" in bold; type `luxe mem` — it
      narrows to Luxe Memory Hamper; type `lumen` — a "Boutiques" row appears. Then: ↓/↑ move a highlight
      through the rows, **Enter on a highlighted row opens it**, **Enter with nothing highlighted runs a normal
      search**, **Esc closes the list but keeps your text**, ↓ reopens it, clicking a row opens it, clicking
      elsewhere closes it. Edge cases: type one letter only (no dropdown); type `zzqx` ("Nothing matches…" plus a
      "See all results" row); type `%` or `_` or `'; drop` (no error, no crazy results); paste a very long
      string; open `/search?q=gift` — the box is pre-filled but the dropdown stays closed until you click it.
      On a phone-width window the list should fit the screen width and scroll inside itself if long.
- [ ] **Add to cart as a guest** (not signed in): add a product, see the cart icon count update, a small
      animation should fly from the button to the cart icon. Open `/cart` — item is there.
- [ ] **Wishlist as a guest**: click the heart icon on a product — should either add to a guest wishlist or
      prompt you to sign in (whichever the app does — confirm it doesn't silently fail).
- [ ] **404 page**: go to a nonsense URL like `/this-page-does-not-exist` — confirm a friendly 404, not a
      raw error screen.

---

## 2. Sign-up, sign-in, and account basics

- [ ] **Sign up** with a brand-new email (e.g. `mytestuser+1@example.com`) and a password. Confirm you land
      somewhere sensible afterward (not stuck on a blank page).
- [ ] **Sign out**, then **sign in** with `test-customer@giftping.test` / `TestPass123!`. Confirm the header
      shows you as signed in (account menu, no more "Sign in" link).
- [ ] **Google sign-in button** is present on the sign-in page (you don't need to complete it if you don't
      have a Google account handy — just confirm the button renders and clicking it goes to Google).
- [ ] **Forgot password**: from the sign-in page, request a reset for an email address you actually control
      (not `test-customer@giftping.test`, which isn't real — point a real account's email at your own inbox
      first if you want to try this for real). Resend and Supabase SMTP are both configured now, so a real
      reset email should actually arrive; click the link and confirm it lands on `/update-password` and works.
- [ ] **Wrong password**: try signing in with the right email and a deliberately wrong password — confirm a
      clear error message, not a crash, and confirm you're NOT signed in.
- [ ] Try to visit `/account` or `/vendor/dashboard` or `/admin/dashboard` **while signed out** — confirm
      each one redirects you to sign in rather than showing the page.
- [ ] Sign in as the **customer** account and try to visit `/vendor/dashboard` and `/admin/dashboard`
      directly by typing the URL — confirm you're bounced away, not let in.

---

## 3. Profile management *(recently built — test this thoroughly)*

Sign in as `test-customer@giftping.test`.

- [ ] Go to `/account`, click into **Profile**.
- [ ] Change your name, save — confirm a success message and that the header's account menu now shows the
      new name.
- [ ] Change your phone number to a valid 10-digit Indian mobile number (e.g. `9876543210`) — confirm it
      saves.
- [ ] **Edge case**: try an invalid phone number (too short, contains letters, e.g. `12345`) — confirm a
      clear validation error, not a crash.
- [ ] **Edge case**: clear the phone number entirely and save — confirm it's allowed to be blank (phone is
      optional here).
- [ ] Click "Add a photo" and pick a real image file — confirm it uploads, crops to a square automatically,
      and appears immediately in the header/account menu avatar.
- [ ] Try uploading a very large image (several MB) — confirm it's handled gracefully (resized/compressed),
      not rejected outright unless it's over the stated size limit.
- [ ] **Restore your test data afterward**: change the name/phone back to their original values (or leave a
      note that you changed them) so future testing sessions start from a clean state.

---

## 4. Reviews *(recently built — test this thoroughly)*

Sign in as `test-customer@giftping.test`.

- [ ] Go to `/orders`, open a **delivered** order (one with a "Delivered" status). Confirm a "Write a
      review" button/link appears on each delivered item.
- [ ] Write a review: pick a star rating, add a title and a body of text, submit. Confirm it appears on the
      product's page with your rating.
- [ ] Go to `/account/reviews` — confirm your new review is listed there.
- [ ] **Edit** the review from `/account/reviews` — change the rating and/or text, save, confirm it updates
      both there and on the product page.
- [ ] **Edge case**: try writing a *second* review for the same product/order — since one review per product
      per customer is enforced, confirm it either updates your existing review instead of creating a
      duplicate, or clearly tells you that you've already reviewed it.
- [ ] **Delete** a review from `/account/reviews` — you'll hit a "are you sure?" confirmation dialog; click
      through it for real. Confirm the review disappears from both `/account/reviews` and the product page.
- [ ] Go to a **non-delivered** order (still processing/shipped) — confirm there's *no* "Write a review"
      option yet for those items.
- [ ] As a **different signed-in customer** (or logged out), visit a product with reviews — confirm you can
      read them but there's no edit/delete option on someone else's review.

---

## 5. Addresses, notifications preferences, wishlist, cart

- [ ] `/account/addresses`: add a new address, edit it, mark a different one as default, delete one.
      Confirm the default address is what's pre-selected at checkout.
- [ ] `/account/notifications`: toggle email/notification preferences off and on, confirm it saves. (The old "Offers & new arrivals" row is gone — marketing email now has its own opt-in switch at the top of the page; see the campaigns section below.)
- [ ] `/wishlist`: add a few products to your wishlist from various product pages, confirm they all show up
      here; remove one, confirm it disappears.
- [ ] **Wishlist price-drop alerts** *(new)*: `/account/notifications` now has a "Wishlist price drops" row —
      toggle it off/on and confirm it saves. To see an alert: as a customer, wishlist a product; as its vendor,
      lower the price by 5% or more (e.g. 1,299 → 999) — **note the product goes back to "pending" for admin
      approval, as with any vendor edit**; as admin, approve it. Alerts go out from the daily job (about 9am IST), or an
      admin/dev can trigger the cron route. Then confirm the customer gets ONE in-app notification (and an email if email
      is on) saying "Price drop: <name> is now ₹… (was ₹…, N% off)" linking to `/wishlist`. Edge cases to try:
      a drop under 5% (nothing sent); a price cut then raised back before the job ran (nothing sent); wishlisting the
      product AFTER the cut (nothing sent to that person); a second cut within a week (the same person isn't alerted
      again for that product); several wishlisted items dropping together (ONE combined message, not one per item);
      turning the toggle off (no email/push; the in-app note still appears, same as every other category).
- [ ] **Cart**: add multiple products from **different vendors** to the cart in one session. Change
      quantities, remove one item, confirm totals recalculate correctly each time.
- [ ] Add a product with **variants** (size/color) — confirm you can't add it without picking a variant, and
      that the price updates based on the variant chosen (e.g. "Large" costs more than "Small").
- [ ] Add a product that has a **personalization** field (custom text/monogram) — confirm the text you type
      is saved with the cart item and later visible in the order.
- [ ] **Stock edge case**: if you can find or set a product with very limited stock, try adding more to the
      cart than is in stock — confirm it's capped, not allowed to silently overflow.
- [ ] **Guest cart merge**: while signed out, add an item to the cart. Then sign in. Confirm the guest cart's
      item is now merged into your signed-in cart, not lost.
- [ ] Pick a **gift wrap style** at cart/checkout (if offered) — confirm the choice carries through to the
      final order.

---

## 6. Checkout and payment

- [ ] From the cart, proceed to checkout. Select or add an address.
- [ ] Apply coupon `WELCOME10` on a cart of at least ₹499 — confirm 10% off appears, capped at ₹250.
- [ ] Remove the coupon — confirm the total reverts.
- [ ] Apply `FLAT200` on a cart of at least ₹1,299 — confirm exactly ₹200 comes off.
- [ ] **Edge case**: apply `WELCOME10` on a cart *under* ₹499 — confirm it's rejected with a clear reason.
- [ ] **Edge case**: apply `DIWALI25` (expired) — confirm it's rejected.
- [ ] **Edge case**: apply `NEWYEAR20` (not started yet) — confirm it's rejected.
- [ ] **Edge case**: apply `WELCOME10`, complete an order with it, then try to use `WELCOME10` again on a
      second order as the same customer — since it's limited to one use per customer, confirm the second
      attempt is rejected.
- [ ] Confirm the delivery estimate/serviceability check runs (it should pass for any pincode in dev, see
      note in section 0).
- [ ] Place the order — this should open the **Razorpay checkout modal**. Use the test UPI handle
      `success@razorpay` (or a test card Razorpay's modal shows you) to complete payment.
- [ ] **Expected after a successful payment**: you land on an order-confirmation page (the robin mascot
      should celebrate this specific moment, not just placing the order), the cart is now empty, the order
      appears in `/orders`, and stock for the purchased items has gone down.
- [ ] Try the failure path: place another order and use `failure@razorpay` (or deliberately cancel the
      Razorpay modal) — confirm the order stays as an unpaid draft and you're told the payment didn't go
      through, rather than the order silently appearing as placed.
- [ ] **Multi-vendor cart**: check out with products from two different vendors in the same order — confirm
      the order detail page shows **separate shipments per vendor**, each with its own status.
- [ ] Try to check out with an **empty cart** (e.g. by opening `/checkout` directly with nothing in the
      cart) — confirm you're redirected somewhere sensible, not shown a broken checkout page.

---

## 7. Orders, tracking, and returns

- [ ] `/orders`: confirm your order history lists both the orders you just placed and older seeded ones.
- [ ] Open an order detail page: confirm it shows items, prices, address, payment status, and a shipment
      timeline per vendor.
- [ ] For a **delivered** order, request a **return** on one of the items: pick a reason, submit. Confirm it
      shows as "return requested" somewhere in your order view.
- [ ] Try requesting a return **outside the return window** if you can identify an old enough order, or
      check what happens for an item that's already been returned once — confirm the return option is
      correctly disabled/hidden rather than allowing a duplicate.

---

## 8. Personal Gifting Diary

Sign in as `test-customer@giftping.test` (already has diary data seeded) — also worth trying once with a
brand-new account to see the **first-run** experience.

- [ ] `/diary`: the flip-book home page loads — should look like a book on a desk, not a flat list.
- [ ] Navigate between sections using the tabs, the arrow keys, and (on a touch device or by dragging) swipe.
      Confirm the URL updates with a `?p=` bookmark as you move between spreads.
- [ ] **Add a new person**: name, relationship, a photo (try uploading a real image). Confirm the photo
      appears — and confirm you **cannot** view this photo's underlying file URL directly in a new tab
      without it being a signed, expiring link (this is a deliberate privacy feature, not something to
      "fix").
- [ ] **Add a date** for that person (e.g. a birthday) — confirm it shows up on the year view and on the
      "coming up" section of the diary home.
- [ ] Create a **gift plan** for an upcoming date: move it through Idea → Chosen → Ordered → Wrapped → Given.
      For "Ordered", try linking it to a real product/order you've placed — confirm it recognizes a genuine
      paid order rather than letting you fake it.
- [ ] Visit `/diary/year` and `/diary/review` — confirm they load with real data (a "year at a glance" and a
      "gifting year in review" respectively).
- [ ] Visit `/diary/people` and an individual person's page (`/diary/people/[id]`) — confirm their notes,
      gift history, and "things they love" all display and can be edited.
- [ ] **Privacy check (read-only, no click needed)**: as the admin, confirm there is nowhere in `/admin`
      that shows this customer's diary contents — admins are only ever supposed to see an aggregate count,
      never names or dates. If you find anywhere in the admin UI showing real diary content, that's a real
      privacy bug worth flagging immediately.
- [ ] **Empty-diary state**: if you can test with a brand-new account, confirm the diary's "first run" flow
      (an onboarding-style intro) shows before any people/dates exist, rather than a blank/broken page.

---

## 9. Vendor portal

Sign in as `test-vendor@giftping.test` (owns Lumière Keepsakes).

- [ ] `/vendor/dashboard`: confirm it shows sales figures / recent activity, not a blank page.
- [ ] `/vendor/products`: see the existing product list. **Add a new product** through the full form —
      name, description, price, category, at least one image upload, and (if relevant) a variant group.
      Confirm the new product starts in a **pending** state, not immediately live.
- [ ] Edit an existing product (change the price or description) — confirm it saves. Try **deactivating** a
      product — confirm it disappears from the public shop while staying visible in your own product list.
- [ ] **Bulk import**: prepare a small CSV (2-3 rows) matching the expected column format, upload it via
      `/vendor/products/import`. Confirm you get a **preview** before anything is committed, and that
      committing creates the products as pending drafts. Try uploading the exact same file a second time —
      confirm it's refused as a duplicate rather than creating everything twice.
- [ ] Try a deliberately broken CSV (a missing required column, or a blank row in the middle) — confirm the
      preview shows a clear, row-numbered error rather than crashing or silently skipping the bad row.
- [ ] `/vendor/orders`: confirm you only see **paid** orders containing your own products — never another
      vendor's items, never someone else's unpaid draft order.
- [ ] Accept an order. **Before clicking "Book courier"**, remember this now calls the real, live Shiprocket
      account — it will register a real pickup location (first time only), create a real Shiprocket order,
      and request a real AWB. Only go through with it if you actually intend a real test booking; otherwise
      skip this specific click and just confirm the button and the rest of the fulfilment page render
      correctly. If you do book for real, confirm the AWB/courier name/tracking link appear on the order
      afterward, and that the customer gets a "Your gift is packed" notification.
- [ ] `/vendor/returns`: if a return has been requested on one of your products (see section 7), confirm it
      shows up here for you to act on.
- [ ] `/vendor/payouts`: confirm your settlement ledger loads (even if empty/minimal in dev).
- [ ] `/vendor/settings`: update your business description, upload a new **logo** and **banner** image
      (confirm both show up correctly on your public storefront afterward), and check your bank details
      section shows only the last 4 digits of any account number you've entered, never the full number.

---

## 10. Admin suite

Sign in as `test-admin@giftping.test`.

- [ ] `/admin/dashboard`: confirm it loads with real numbers/alerts, not placeholders.
- [ ] `/admin/vendors`: find a **pending** vendor application (or register a brand-new one first via
      `/vendor/register` in an incognito window, then come back here) and **approve** it. Confirm it then
      appears live on `/vendors`.
- [ ] **Reject** a different pending vendor/product with a reason — confirm the reason is recorded and the
      vendor can see why (e.g. in their own portal or via a notification).
- [ ] **Suspend** an approved vendor (e.g. Lumière Keepsakes) — confirm their storefront becomes unreachable
      or clearly marked, and that their existing products stop showing on public pages. **Reinstate** them
      afterward and confirm everything comes back.
- [ ] **Message a vendor**: use the "Message" action on a single vendor — write a subject and body, send.
      Sign in as that vendor and confirm the message shows up in their `/notifications` inbox.
- [ ] **Broadcast a message to all vendors**: use "Message all vendors" at the top of `/admin/vendors` — this
      will hit a "Send to N vendors?" confirmation dialog; click through it for real. Confirm the toast
      shows the right count sent, and spot-check that at least one vendor actually received it.
- [ ] `/admin/products`: approve or reject a pending product (from your own vendor-portal test earlier).
- [ ] `/admin/orders`: open an order, **cancel** it, and confirm a refund is triggered if it was paid.
      Confirm stock is restored for the cancelled items.
- [ ] `/admin/returns`: approve or decide on a return request from section 7 — confirm a refund is issued
      and reflected in the customer's view.
- [ ] `/admin/coupons`: create a brand-new coupon (any code you like), confirm it works at checkout
      afterward. Check the redemption count updates after someone uses one of the seeded coupons.
- [ ] `/admin/settlements`: create a settlement for eligible delivered items, mark it as paid. Try to void a
      settlement that's already been marked paid — confirm it's refused (a paid settlement should never be
      voidable).
- [ ] `/admin/banners`: create a new homepage banner scheduled to start **tomorrow** — confirm it does *not*
      show on the live homepage yet. Create one scheduled for **right now** — confirm it does show. Confirm
      an admin previewing a banner doesn't accidentally show it to ordinary customers early.
- [ ] `/admin/themes`: preview a festival theme — confirm the whole site re-skins for you (and only you, as
      the previewing admin — check in an incognito/customer window that the theme did *not* change for
      everyone else), with a "Stop previewing" strip visible. Schedule a theme for a future date, confirm it
      doesn't activate early.
- [ ] `/admin/users`: find a test user, try the **"download my data"** export — confirm it downloads a file
      with that user's real data (orders, diary entries if any, addresses) and nothing belonging to another
      user. If you test DPDP erasure, **use a disposable test account you don't need afterward** — this is
      meant to be closer to irreversible, so don't run it against your main `test-customer` account.

---

### Personalisation, wrap preview and the gift finder *(new — Sprint 2; test on a real desktop AND a real phone)*

- [ ] **Vendor setup**: as a vendor, open one of your products with a photo → "Personalised text on the photo (optional)". Tick it; name the field, set a max length, pick a lettering style, decide if it's required. **Drag the box** to where the text should go, drag the round handle to resize (it must stop at the photo's edge without shoving the box), and try the arrow keys and "Fine-tune with sliders". Type a long name in "Try a name" — it should shrink to fit and warn if it exceeds your limit. Save → the product goes back "In review" like any edit. Reopen the product: your setup is exactly as you left it. **On a phone, try dragging with your finger.**
- [ ] **Shopper**: once approved, open the product → a field with your label and "0/N". Type a name → it appears **on the photo** in your style, resizing to fit; start typing while viewing another photo → it jumps to the main photo; open Zoom → the text is in the same place. The photo frame stays square at every window size (resize the window to check the text never moves relative to the product).
- [ ] **Rules**: leave a required field empty and press Add to cart → an inline message, the field is focused, nothing is added. Type more than the limit / `<b>x</b>` / an emoji → refused with a clear message. Names in Hindi, Tamil etc. are accepted (the preview may use a plain fallback font; the text itself is kept exactly).
- [ ] **It travels**: after adding, the cart line, checkout summary and the order page show `Engraving: “…”`. As the vendor, the order in your portal shows a highlighted **Engrave: “…”** line, and the new-order email lists it in bold under the product.
- [ ] **Wrap preview**: at checkout tick "Add gift wrapping" → below the picker is a large preview of the chosen wrap with a handwritten card tucked in. Type a gift message and pick other wraps — it should switch smoothly, and the card should read "Dear <first name of the selected address>," plus your message.
- [ ] **Gift finder** (`/gift-finder`, also the homepage band "Not sure what to give?" and the footer): answer the four questions — choosing an answer moves on by itself; Back works; the last step lets you pick up to three interests (the rest grey out) or none. You get a shelf of products with reasons under each and a "Best match" badge; nothing over your budget ever appears. "Change my answers" reopens with your choices; "Start over" resets. Copy the results URL into a private window — the same gifts appear. Try "A friend / Just because / any budget / no interests" (you still get popular picks), and a budget where little fits.
- [ ] **Edge cases**: hand-edit the URL to rubbish (`?who=zzz`, `?budget=-1`) → a normal page, never an error. Turn JavaScript off → all four questions show on one page and the button still works.

### The basket *(new — Sprint 1; best tested on a real desktop AND a real phone)*

- [ ] **Header icon**: the cart icon in the header (and the Cart tab on a phone) is now a little woven basket, with the count badge.
- [ ] **Add to cart, desktop with a mouse**: on a product page click *Add to cart* → the gift box flies to the basket icon, the icon bounces, and about half a second later a **mini-basket opens under the icon** already showing the item you just added ("Added to your basket", "Updating your basket…"), then fills in your full cart. **No toast** appears on desktop. It closes itself a few seconds after loading, unless you move the mouse over it.
- [ ] **Hover**: hover the basket icon any time → the mini-basket opens with your photos, names, quantities, prices, the free-delivery ribbon and **View basket / Checkout** buttons. Move away or press **Esc** → it closes. Clicking the icon itself still goes to the full cart page. With an empty cart it says so and links to the mall.
- [ ] **Phone / touch**: tapping the basket icon or the Cart tab goes straight to the cart page; adding to cart shows the normal "Added" toast with a *View cart* button (no hover panel).
- [ ] **Cart page basket** (`/cart`): the basket at the top shows your **real product photos** peeking over its rim (newest on the right), a small number badge on any item with quantity above 1, and "+N" when more than five items. On arriving, the photos drop in. Change a quantity or add something → the basket jiggles; remove things → it re-arranges. Empty cart → the empty basket with the robin.
- [ ] **Free-delivery ribbon** (cart page per boutique, and in the mini-basket): it fills as the boutique's subtotal grows, with a bow at its tip; once past the free-delivery amount it reads "Free delivery unlocked" and the bow ties with a little flourish. Test by adjusting quantities around the threshold (₹999 by default).
- [ ] **Order "unwrap"**: complete a real test payment → on the order page a gift box pops in, the lid lifts off and flies away, the robin hops up, sparks burst, and the caption "Payment confirmed — thank you for your order!" appears, then it fades after ~4 seconds. The page underneath is never blocked. (The diary's "mark gift as given" keeps its quicker robin-and-sparks pop.)
- [ ] **Reduce motion**: with your device set to "reduce motion", none of the above animates; the unwrap scene is skipped and only a screen-reader announcement is made.
- [ ] **Slow connection**: throttle to Slow 3G and add to cart — the mini-basket still opens immediately with the new item and says "Updating your basket…" until the rest arrives; it never closes before it has shown something useful.

### Admin SEO tools *(new)*

- [ ] **Admin → SEO** (`/admin/seo`): six "Main pages" editors (Homepage, Mall, Occasions, Boutiques, About, Contact), a "Where text is missing" panel, and a "Handled automatically" list.
- [ ] **Edit a page**: on Contact, type a custom title and description — the Google-style preview updates as you type and the counters read "Good length" / "May be cut off" / "Too long". Save is disabled until something changes. A title over 70 characters is refused.
- [ ] **It reaches the live page**: after Save, open `/contact` → View Source (or hover the browser tab): the `<title>` and `<meta name="description">` are yours. Paste the page link into a chat app or Facebook's sharing debugger to see the share card.
- [ ] **Hide from search**: tick "Hide this page from search engines", Save → `/contact` now has `<meta name="robots" content="noindex">` and disappears from `/sitemap.xml`. Untick → it returns.
- [ ] **Reset to default** restores the built-in wording and the page shows it again.
- [ ] **Occasion pages**: in Admin → Categories, give "Birthday" a Meta title and Meta description → `/categories/birthday` uses them (they used to be ignored). Clear them → it falls back to "Birthday — GiftPing".
- [ ] **Filtered occasion pages** (e.g. `/categories/birthday?sort=price_asc`) are marked noindex, with the plain page as the canonical address.
- [ ] **`/robots.txt`** disallows admin, vendor portal (`/vendor/`), cart, checkout, accounts, diary; it must NOT disallow `/vendors/…` boutique pages or `/products/…`. **`/sitemap.xml`** lists products, boutiques, occasions and the main pages, and never a hidden product or a suspended boutique (suspend one in Admin → Vendors and confirm its page drops out).
- [ ] **Non-production**: a Vercel *preview* deployment's `/robots.txt` should read `Disallow: /` (only the real production site is indexable).

### Marketing email campaigns & consent *(new — test this thoroughly, it has legal weight)*

- [ ] **Sign-up checkbox**: `/sign-up` shows an **unticked** "Email me offers, new arrivals and gifting ideas…" box with the explanation under it. Create an
      account **without** ticking it, confirm the email, then open `/account/notifications`: the "Offers & new arrivals by email" switch must be **off**.
- [ ] **Ticking it**: create another account **with** the box ticked. Before clicking the confirmation email the switch must still read off/not subscribed; after
      confirming and signing in it must be **on**, with "You turned this on on <date>". (Consent is only recorded once the email is confirmed.)
- [ ] **Settings switch**: turn it on, then off, then on — each click saves immediately (a toast confirms), the date line updates, no page reload needed.
- [ ] **Admin → Campaigns** (`/admin/campaigns`): the page shows how many customers have opted in (counts only — no addresses anywhere), the sending limits, and a red
      "Sending is switched off" banner **only** if `MARKETING_UNSUBSCRIBE_SECRET` is missing.
- [ ] **Create a campaign**: New campaign → fill name, subject, message. Try: button text without a link (refused); a link of `javascript:alert(1)` or `http://…` (refused);
      a subject containing a line break (refused); a message over 5,000 characters (refused). A valid draft opens its page with an email **preview**.
- [ ] **Preview**: shows "Hi <name>,", your paragraphs (a blank line = new paragraph), the button, and a footer with the reason, an Unsubscribe link and a preferences link.
      Type `<b>bold</b>` or `<script>` in the message — it must appear as literal text, never as formatting.
- [ ] **Test email**: "Send me a test" delivers one email to the admin's own address with "[TEST]" in the subject. Resend's domain is now verified, so this is a **real email** — check the admin's actual inbox (and spam folder the first time).
- [ ] **A real campaign now really sends**: with a verified Resend domain, starting a campaign for real sends actual email to whoever is opted in — make sure only accounts you control (or are happy to email) are opted in before clicking "Start" outside of careful, deliberate testing.
- [ ] **Starting with nobody opted in** is refused with a clear message and the campaign stays a draft.
- [ ] **Start a real campaign** (with a few opted-in test accounts): the confirm box states how many people and how long it will take at the current limit. After "Start",
      the page shows queued/sent/failed/skipped counts. With the free-tier default (50/day) a bigger audience is sent over several days; "Send next batch now" sends more immediately
      only while today's limit has room.
- [ ] **Unsubscribe mid-campaign**: while a campaign is mid-send, unsubscribe one recipient (settings switch off). That person shows as **skipped** and never receives it.
- [ ] **Unsubscribe from the email**: click the link in a received campaign email → a confirm page ("Yes, unsubscribe me") → click it → success page. Just *opening* the link must **not** unsubscribe.
      In Gmail the header "Unsubscribe" button should also work. The same link used twice still shows success.
- [ ] **Pause / resume / cancel**: pausing stops further sending; resuming continues; cancelling marks everyone not yet emailed as skipped.
- [ ] **Limits**: change "Per day" in Sending limits (try a number bigger than "Per month" — refused); it saves, and the "room left now" figure follows after a reload.
- [ ] **Data export**: as an opted-in customer, download your data (Account → export): it contains `marketing_emails` with your consent history and any campaigns you were sent.

## 11. Notifications

- [ ] As a customer, trigger a few different notification-worthy events (place an order, get a vendor
      message if you're testing as a vendor, have your review... etc.) and check the notification **bell**
      in the header updates its unread count, and the dropdown/inbox shows each one with sensible styling.
- [ ] Mark a notification as read (or read them all) — confirm the unread count drops accordingly.
- [ ] Email now sends for real (Resend's domain is verified) regardless of whether you're on localhost or
      `www.giftping.in` — check the recipient's actual inbox if you want to confirm it, not just the in-app
      bell. Web push still needs a real HTTPS origin, so it won't fire from localhost — test it on
      `www.giftping.in` instead if you want to confirm a real push notification, not locally. Either way, the
      *in-app* notification should always appear regardless of whether email/push actually went out.

---

## 12. Visual / cross-cutting checks (recent work — worth a careful look)

- [ ] **Header contrast**: visit `/mall`, `/account/profile`, and `/diary` — the header should be a clearly
      legible **solid green pill**, never a washed-out, barely-visible strip.
- [ ] **Header glass effect**: visit `/` and a vendor storefront page — the header should show a **subtle
      tint with the photo visible through it** at the top of the page, switching to the solid pill once you
      scroll a little.
- [ ] **Gold edge**: look closely at the header pill on desktop — there should be a thin warm gold/copper
      gradient ring around it, and a thin gold line along the bottom of the header on mobile widths.
- [ ] **Diary button**: a drawn leather diary on a cream, gold-ringed pill sits at the right of the header
      on EVERY page and width. On a wide window (1440px+) at rest it shows a caption ("Never forget a date /
      My Diary"); when you scroll, or on a narrower window or phone, only the book chip remains. It must never
      push past the header's rounded edge. "Diaries" is no longer a text link in the nav.
- [ ] **Resize the browser window** narrower (phone width) on the homepage, a product page, cart, checkout,
      and the diary — confirm nothing overlaps, clips awkwardly, or requires horizontal scrolling.
- [ ] If your OS has a "reduce motion" accessibility setting, turn it on and reload the homepage — the robin
      cursor and cart-fly animation should not appear at all (this is intentional, not a missing feature).

---

## 13. Sprint 3 — the mall as a place

1. **Mall map** (`/mall`, desktop): hover numbers 2, 7, 5 — a robin flies there and the card under the map shows the place, a live count, a quote, three thumbnails and "Step inside". Move the mouse off the map: the robin stays. "Take a Tour" walks it through all nine places. **Phone:** first tap on a number shows the card; second tap goes in.
2. **Shop-door transition** (use a normal browser window): on `/vendors` click a boutique — its shopfront picture should grow into the boutique's banner; browser Back should shrink it. Same from `/categories` into an occasion. If it just changes page, tell me which browser. (With "reduce motion" on, it should never animate.)
3. **Waving robin:** `/sign-in`, `/sign-up`, `/reset-password` each show it above the form.
4. **Festival mode:** `/admin/themes` → preview "Diwali". Home shows a maroon look, a countdown ribbon ("N days to Diwali — order by…"), rising lamps; the cart shows a one-line note; checkout, sign-in and the portals show no lamps. Stop the preview. Diwali is dated `2026-11-08` with a 4-day order cutoff — **it's now only weeks away, worth actually scheduling it for real via "Schedule a theme" rather than just previewing it, once the date/cutoff are confirmed.**
5. **Shop-window cards:** on `/vendors` and `/categories` (desktop mouse), cards lean toward the cursor and a warm light follows it. On a phone nothing tilts.

## 14. Diary polish — countdown ribbons, wax seal, tape-peel

1. **Countdown ribbon:** open `/diary` and look at the "Next moments" tickets, then open a person with an upcoming date — the ribbon under each date should
   look more filled the sooner it is, with a small bow riding its tip.
2. **Today + confetti:** add (or edit) a date to today's date — the ribbon should be fully filled and a small burst of paper confetti should play once
   around it, on the ticket, the date card and the plan header.
3. **Wax seal:** on a person's page, start a plan and step it all the way to "Given" — a wax seal should stamp down next to "Given with love" right then.
   Refresh the page: the seal should be gone (just the checkmark text remains) — that is correct, not a bug.
4. **Tape-peel:** add a new person — their photo should visibly drop in and its tape should peel down into place, not just appear. Refresh: it should sit
   there normally, not replay.

## 15. Christmas festival theme *(new — 10 Oct; no dedicated art yet, just colours/countdown/ambience)*

1. `/admin/themes` → preview "Christmas". The whole site should re-skin to a deep pine-green and holly-berry-red look (replacing the usual forest-green/copper), on a cooler frost-white canvas instead of the usual warm cream.
2. **Countdown ribbon** on the homepage: should read "N days to Christmas — order by 20 Dec" (Christmas is `2026-12-25`, cutoff 5 days before). Confirm the day-count is right for today's date, and that it links to "Shop Christmas gifts" → `/categories/festivals`.
3. **Snow ambience**: small white dots should drift down slowly behind the homepage hero and other non-money pages — same places the Diwali lamps/other festival ambience appear, never on checkout/cart/orders/admin/vendor portal/sign-in.
4. **Contrast check**: read the header nav text, the "Explore the Mall"/"Watch Our Story" buttons, and the countdown ribbon's text on top of its pine-green bar — everything should stay clearly legible, not washed out.
5. Stop the preview — confirm the site returns to its normal look for you, and check in an incognito/customer window that it was never changed for anyone else while you were only previewing.
6. **Confirm the Dec 25 date and the 5-day cutoff with the client before scheduling this for real** — same rule as Diwali, and the cutoff in particular is just an assumption (December courier congestion) that needs an operations call, not a given.
7. **No art yet**: the hero photo, mall map, and four homepage cards should all still show the regular native pictures while Christmas is active — this is expected (a brief for Christmas-dressed versions exists in `docs/design/asset-prompts.md` Batch 6, not yet generated), not a bug.

## 16. Delivery speed options — Standard vs Express *(new — 10 Oct; real Shiprocket data, test against a real route)*

This one genuinely needs the real Shiprocket credentials (configured) and will call the real API — not everything
here will work the same way on every route, because it depends entirely on what real couriers actually service it.

1. Add a product from a vendor whose warehouse is in Jaipur (e.g. Lumière Keepsakes) to your cart.
2. At checkout, pick (or add) a delivery address in **Delhi (pincode 110001)** — confirmed to offer a real Standard/Express
   split at the time this was built (Standard ≈3 days/₹93.72, Express ≈2 days/₹112.22 — the exact numbers can drift as
   Shiprocket's own rates change, that's expected). A single-courier route (try Mumbai 400001, Bangalore 560001, or
   Chennai 600001) should show **no** Express option at all — that's correct, not a missing feature.
3. Where an Express option exists: a Standard/Express radio pair appears under that vendor's delivery line, with real
   day counts and a surcharge (+₹99 by default). Selecting Express should immediately bump the Delivery line and the
   Total in the order summary by exactly the surcharge amount — nothing else should change.
4. Switch to a different saved address — the Express selection should reset (a different pincode might not offer the
   same upgrade, or any upgrade at all).
5. Place the order with Express selected. On the next screen, the total charged should include the surcharge.
6. **As the vendor** (`/vendor/orders`), the order should show "Customer paid for Express delivery — please accept and
   dispatch promptly."
7. **As the customer**, once the order has a real shipment (vendor has booked a courier), the order page should show a
   small "Express" badge next to that vendor's shipment.
8. **Multi-vendor cart**: add items from two different vendors, one with a real Express option and one without — confirm
   only the eligible vendor shows the toggle, and the surcharge only applies to the vendor actually upgraded.
9. **Edge case**: on a cart whose subtotal already qualifies for free standard delivery, Express should still cost the
   surcharge (not be free) — free delivery waives the ordinary fee, not the speed upgrade.

## 17. Return pickup booking *(new — 10 Oct; real Shiprocket write, be deliberate about the actual click)*

An **admin**-only action — `/vendor/returns` stays read-only, GiftPing books the pickup, not the boutique.

1. `/admin/returns?status=approved` — any approved return with no pickup booked yet shows a **Book pickup**
   button next to "Issue the refund →". (The seed data already has a couple of these — GP-100145 and GP-100142 —
   no need to create a new return request just to see the button.)
2. **Before clicking it**, know that this calls the real, live Shiprocket API — it creates a genuine return order
   and requests an actual courier pickup from the customer's real address. Only go through with the actual click
   if you mean a real test booking.
3. If you do click it: confirm it returns an AWB, the button is replaced with "Pickup booked · courier · AWB …",
   the customer's order page shows "a courier from X is collecting it (AWB …)" instead of the generic "we'll
   arrange the pickup," and the vendor's `/vendor/returns` page shows "Pickup booked … it's on its way back to
   you."
4. **Edge case**: click "Book pickup" a second time on the same return — confirm it's refused ("A return pickup
   is already booked for this item"), not a duplicate booking.

## Reporting a bug

For anything that doesn't match "Expected," note:
1. **URL** you were on
2. **Which account/role** you were signed in as
3. **Exact steps** you took
4. **What you expected** vs **what actually happened**
5. A screenshot if it's visual

Bring these back and I'll dig into each one, fix what's broken, and explain anything that turns out to be
expected behavior rather than a bug.
