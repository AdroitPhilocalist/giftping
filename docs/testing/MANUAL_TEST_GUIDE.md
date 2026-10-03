# GiftPing — Manual Testing Guide

A checklist for clicking through everything that's been built so far, in the real browser, as a real user
would. Work through it section by section — each one is a self-contained area, so you don't have to do this
in one sitting. Check boxes as you go; anything that doesn't match "Expected" is a bug worth writing down
(see "Reporting a bug" at the very end).

This guide covers **local development** against the seeded dev database. It does not require the domain,
production Supabase project, or live payment/courier credentials.

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
- **Delivery/pincode checks fail open in dev** (no real Shiprocket credentials are configured locally), so
  any 6-digit pincode should be accepted as serviceable — you won't be able to test a real "can't deliver
  here" rejection locally.
- **Payments**: Razorpay is in **test mode**. Use their test UPI handle `success@razorpay` to simulate a
  successful payment, or `failure@razorpay` to simulate a failed one — no real money moves. If you use a
  test card instead, open the Razorpay checkout modal first; it shows the currently valid test card numbers
  for your account (these change over time, so don't rely on a fixed number from an old note).

### What this guide can't make you test (do these separately, if you want full coverage)

A few things need a human specifically because of how they work — flag these as "still to verify" rather
than assuming they're broken if you don't get to them:
- Completing a real payment inside Razorpay's own checkout iframe (cross-origin, can't be automated)
- A real courier booking at Shiprocket (would need real API credentials)
- Sending a real email (would need a configured Resend domain) or a real web push notification (needs a
  real HTTPS deployment, not localhost)
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
- [ ] **Occasions** (`/categories`, the "Occasions" nav item): Birthday, Anniversary, Wedding, and Corporate
      Gifting should show **photo cards**; For Her, For Him, Housewarming, Thank You, Festivals should show
      the plain icon card (this is expected — see "Known limitations" in the asset-generation conversation,
      not a bug).
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
- [ ] **Forgot password**: from the sign-in page, request a reset for a real test account's email. (You may
      not receive a real email locally unless Resend is configured — that's expected; just confirm the form
      submits without an error.)
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
- [ ] Accept and try to dispatch an order (courier booking will likely fail without real Shiprocket
      credentials — that's expected locally; confirm you get a clear error rather than a silent hang or a
      confusing crash).
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
- [ ] **Test email**: "Send me a test" delivers one email to the admin's own address with "[TEST]" in the subject (needs a working Resend domain — see the compliance doc).
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
- [ ] Email and web push are unlikely to fire for real in local dev (no configured email domain, no HTTPS
      origin for push) — don't treat a missing real email/push as a bug locally; just confirm the *in-app*
      notification always appears regardless.

---

## 12. Visual / cross-cutting checks (recent work — worth a careful look)

- [ ] **Header contrast**: visit `/mall`, `/account/profile`, and `/diary` — the header should be a clearly
      legible **solid green pill**, never a washed-out, barely-visible strip.
- [ ] **Header glass effect**: visit `/` and a vendor storefront page — the header should show a **subtle
      tint with the photo visible through it** at the top of the page, switching to the solid pill once you
      scroll a little.
- [ ] **Gold edge**: look closely at the header pill on desktop — there should be a thin warm gold/copper
      gradient ring around it, and a thin gold line along the bottom of the header on mobile widths.
- [ ] **"My Diary" pill**: on a normal laptop-width browser window, this button should be **hidden**
      entirely (that's correct — it only shows on very wide screens, and always hides once you scroll/the
      header shrinks). You can still reach the diary via the "Diaries" link in the main nav or the account
      menu at any width.
- [ ] **Resize the browser window** narrower (phone width) on the homepage, a product page, cart, checkout,
      and the diary — confirm nothing overlaps, clips awkwardly, or requires horizontal scrolling.
- [ ] If your OS has a "reduce motion" accessibility setting, turn it on and reload the homepage — the robin
      cursor and cart-fly animation should not appear at all (this is intentional, not a missing feature).

---

## Reporting a bug

For anything that doesn't match "Expected," note:
1. **URL** you were on
2. **Which account/role** you were signed in as
3. **Exact steps** you took
4. **What you expected** vs **what actually happened**
5. A screenshot if it's visual

Bring these back and I'll dig into each one, fix what's broken, and explain anything that turns out to be
expected behavior rather than a bug.
