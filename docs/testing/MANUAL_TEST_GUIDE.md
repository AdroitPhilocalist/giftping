# GiftPing — Manual Testing Guide (Step-by-Step Edition)

This guide assumes **zero prior knowledge** of the app. Every test is written as: exact steps to follow, then
exactly what you should see if it's working, then exactly what would tell you it's broken.

**How each test is written:**
- **Steps** — do these in order, exactly as written.
- **✅ Correct if** — this is what "it works" looks like. If you see this, check the box and move on.
- **❌ Something's wrong if** — this is what a real bug looks like. If you see this, write it down (see
  "Reporting a bug" at the very end) and move on to the next test — don't get stuck on one item.
- **ℹ️ Note** — context that isn't itself a pass/fail check, just useful to know.

Work through the numbered sections in order if you want full coverage, or jump to whichever section you care
about — each one stands alone. Take breaks between sections; this isn't meant for one sitting.

---

## 0. Before you start

### 0.1 — Confirm you're testing the right place

**Steps:**
1. Open a normal browser window (Chrome, Safari, or Firefox — not a special "testing" browser).
2. Type `https://www.giftping.in` into the address bar and press Enter.
3. Wait for the page to finish loading.

**✅ Correct if:** You see a large photo of a warmly lit mall with the heading "A World of Gifts. A World of
Emotions." within a few seconds.

**❌ Something's wrong if:** The page stays blank, shows a browser error page, or takes longer than ~10
seconds to show anything.

ℹ️ **Note:** You're testing the real, live website — not something running on your own computer. Everything
you do (orders, reviews, messages) is real data in the real database, so don't be surprised to see your own
test activity later.

### 0.2 — Your three test logins

You'll sign in as different people depending on which section you're testing. All three use the same
password.

| Email | Password | Who this is | What they can see |
|---|---|---|---|
| `test-customer@giftping.test` | `TestPass123!` | A regular shopper | Has an existing diary, past orders, and reviews already |
| `test-vendor@giftping.test` | `TestPass123!` | A boutique owner | Owns the boutique **Lumière Keepsakes** |
| `test-admin@giftping.test` | `TestPass123!` | Site administrator | Can see and manage everything |

**How to sign in (steps you'll repeat often):**
1. Click the person icon in the top-right of the header, or go directly to `https://www.giftping.in/sign-in`.
2. Click into the **Email** field, type one of the emails above.
3. Click into the **Password** field, type `TestPass123!`.
4. Click the **Sign in** button.
5. Wait for the page to redirect.

**✅ Correct if:** You land back on a page with your account menu visible in the top-right (your name/initial
in a circle), not a "Sign in" link anymore.

**❌ Something's wrong if:** You get an error message, stay on the sign-in page with no explanation, or the
page hangs.

ℹ️ **Tip:** If a test needs two different roles at once (e.g. "admin approves something, then check it as the
vendor"), it's much easier to use one normal browser window for one role and a **Private/Incognito window**
for the other, rather than signing out and back in repeatedly. To open one: Chrome/Edge = Ctrl/Cmd+Shift+N,
Safari = Cmd+Shift+N, Firefox = Ctrl/Cmd+Shift+P.

### 0.3 — Useful test data already set up for you

You don't need to create these — they already exist, ready to use:

| Item | Value | What it's for |
|---|---|---|
| Working coupon | `WELCOME10` | 10% off, capped at ₹250, needs a cart of ₹499 or more |
| Working coupon | `FLAT200` | Exactly ₹200 off, needs a cart of ₹1,299 or more |
| Coupon that should fail | `DIWALI25` | Already expired — testing that it's correctly rejected |
| Coupon that should fail | `NEWYEAR20` | Not started yet — testing that it's correctly rejected |
| Vendor with a product-level Standard/Express delivery split | Lumière Keepsakes (Jaipur) | See test 16 |
| Approved returns with no pickup booked yet | Orders `GP-100145`, `GP-100142` | See test 17 |

ℹ️ **Payments are in test mode** — nothing real is ever charged. When Razorpay's payment screen opens during
checkout, use the UPI ID `success@razorpay` to simulate a successful payment, or `failure@razorpay` to
simulate a declined one. If a test card is needed instead, Razorpay's own checkout screen will show you which
test card numbers are currently valid — don't use a number from an old note, these change.

### 0.4 — Things this guide can't make you test by yourself

A handful of things genuinely need a human doing them for the reason listed — if you don't get to these,
they're "not yet verified," not "broken":
- Actually completing a payment inside the Razorpay popup (it's a secure iframe from a different site).
- A real courier pickup (see tests 9.7 and 17 — these call a real external company and should only be done
  deliberately).
- Picking a real photo from your computer's file picker (avatar, product image, diary photo, vendor logo).

---

## 1. Browsing as a guest (not signed in)

Do this entire section **signed out**. If you're currently signed in from a previous test, click your
account menu (top-right) → **Sign Out** first.

### 1.1 — Homepage loads correctly

**Steps:**
1. Go to `https://www.giftping.in`.
2. Look at the big photo and headline at the top.
3. Click the **"Explore the Mall"** button.
4. Click your browser's **Back** button to return to the homepage.
5. Click the **"Watch Our Story"** button.
6. Go back to the homepage again.
7. Scroll down slowly through the whole page.

**✅ Correct if:**
- Step 3: you land on a page titled something like "The Mall Directory".
- Step 5: you land on an "About" page.
- Step 7: as you scroll, you pass a row of occasion icons (Birthday, Anniversary, Wedding, Corporate, More —
  each one clickable), a carousel of banner images, a "Shop by relationship" section with photo cards, and
  finally a footer with links at the very bottom.

**❌ Something's wrong if:** Either button does nothing or leads to a broken/blank page, or scrolling reveals
a visibly broken layout (overlapping text, a huge empty gap, an image that never loads).

### 1.2 — Header changes as you scroll

**Steps:**
1. Go to `https://www.giftping.in` and make sure you're at the very top of the page.
2. Look closely at the header bar (the dark green bar at the top with the logo and menu).
3. Slowly scroll down about halfway through the first screen.
4. Keep scrolling down further.
5. Scroll back up to the very top.

**✅ Correct if:** At the top (step 2), the header looks like a **tinted glass pane** — you can faintly see
the mall photo through it. While scrolling (step 3-4), it changes into a **solid, opaque dark green pill**
shape with a thin gold/copper ring around its edge. Scrolling back to the top (step 5) returns it to the
glassy look.

**❌ Something's wrong if:** The header looks the same (always solid, or always transparent) regardless of
scroll position, or the text inside it becomes unreadable at any point (e.g. dark text on a dark background).

### 1.3 — The Mall page

**Steps:**
1. Click **"Explore Mall"** in the header navigation (or go to `/mall`).
2. Hover your mouse over a few of the numbered circles on the illustrated map (don't click yet).
3. Click on one of the numbered circles.
4. Go back to `/mall` and scroll down to the "Handpicked Experiences" cards below the map.
5. Click one of those cards.

**✅ Correct if:**
- Step 2: hovering shows a preview (an image or highlight) for that spot on the map.
- Step 3: clicking takes you to a real page about that place (e.g. a boutique or occasion page).
- Step 4: the cards show real photos, not broken image icons.
- Step 5: clicking a card navigates somewhere sensible, not a dead link.

**❌ Something's wrong if:** Hovering does nothing, clicking a number goes nowhere or 404s, or any card shows
a broken image.

### 1.4 — Occasions page (photo cards vs plain cards)

**Steps:**
1. Click **"Occasions"** in the header navigation (or go to `/categories`).
2. Look at each card in the grid: Birthday, Anniversary, Wedding, Corporate Gifting, Housewarming, Thank You,
   Festivals, For Her, For Him.

**✅ Correct if:** Birthday, Anniversary, Wedding, Corporate Gifting, Housewarming, Thank You, and Festivals
all show a **full photo** as their card background. **For Her and For Him show a plain card with just an icon
in a circle, no photo** — this is intentional (their photo artwork shows real luxury-brand logos, a trademark
issue, so it's deliberately hidden here), not a bug.

**❌ Something's wrong if:** Any of the first seven categories (Birthday through Festivals) shows a plain
icon card instead of a photo, or if For Her/For Him unexpectedly show a photo with visible brand names on it.

### 1.5 — An individual occasion page

**Steps:**
1. From `/categories`, click into **Birthday**.
2. Look at the top of the page (should be a banner photo), then the grid of products below it.
3. Try the filters on the page (occasion tag, recipient tag, "in stock only", sort order) — change one and
   see the grid update.
4. If there are enough products to need more than one page, click to page 2.

**✅ Correct if:** A banner photo loads at the top, products appear in a grid below, and changing a filter
actually changes which products show (the count/list updates).

**❌ Something's wrong if:** The page is blank, filters don't change anything when clicked, or pagination is
broken (page 2 shows the same products as page 1, or errors).

### 1.6 — Boutiques listing and an individual boutique

**Steps:**
1. Click **"Boutiques"** in the header (or go to `/vendors`).
2. Look at the grid of boutique cards.
3. Click into **Lumière Keepsakes**.
4. Scroll down past the banner photo to the "why shop here" section.
5. Go back to `/vendors` and click into a **different, newer-looking** boutique (one that might not have
   uploaded its own banner photo).

**✅ Correct if:**
- Step 3: you land on a page with a full-width banner photo at the top and the header shows the same glassy
  tint effect as the homepage.
- Step 4: the "why shop here" cards show **generic, truthful claims** (e.g. "Verified Boutique," "Thoughtfully
  packaged") — not specific marketing copy that only makes sense for one particular shop (like "candles" or
  "hand-poured" showing up on a boutique that doesn't sell candles).
- Step 5: even without its own banner, the page still looks intentional — either a shared stock photo or a
  simple drawn illustration, never a blank gap or a broken image icon.

**❌ Something's wrong if:** The banner is missing/broken on Lumière Keepsakes specifically, the "why shop
here" text obviously describes the wrong kind of product for that boutique, or the no-banner boutique's page
looks visibly broken rather than just simpler.

### 1.7 — A product page

**Steps:**
1. From any boutique or category page, click into a product that has **size or color options** — try
   searching for "Signature Gift Box Forest Green" if you're not sure which one has options.
2. Look at the photo gallery — click through a few thumbnails if there are multiple photos.
3. If there's a size/color selector, pick a different option and watch the price.
4. Scroll down to the reviews section at the bottom (if the product has any reviews).

**✅ Correct if:** Photos switch when you click thumbnails, picking a different variant (e.g. "Large" instead
of "Small") changes the displayed price if that variant costs more, and any reviews show a name like "Priya
S." (first name + last initial only) — never a stranger's full name.

**❌ Something's wrong if:** Clicking thumbnails doesn't change the main photo, the price never updates when
you change variants, or a review shows someone's complete full name.

### 1.8 — Search

**Steps:**
1. Click the search icon in the header (or go to `/search`).
2. Type the name of a real product (e.g. "hamper") and press Enter.
3. Clear the search box, type nonsense like `asdkfjhaskdjfh`, and press Enter.

**✅ Correct if:** Step 2 shows relevant products. Step 3 shows a friendly "nothing found" message, not a
blank page or an error.

**❌ Something's wrong if:** A real product search returns nothing relevant, or a nonsense search crashes the
page or shows a raw error message.

### 1.9 — Search-as-you-type (the dropdown suggestions)

Do this both on the homepage's search box AND on the `/search` page's search box.

**Steps:**
1. Click into the search box (don't press Enter yet).
2. Type `ham` slowly, one letter doesn't count — wait a moment after typing the 3rd letter.
3. Clear the box, type `luxe mem`.
4. Clear the box, type `lumen`.
5. With a dropdown open, press the **Down arrow** key a few times, then **Enter**.
6. Open the dropdown again (type something), then press **Enter** without pressing any arrow key first.
7. Open the dropdown again, press **Esc**.
8. Type a single letter only, e.g. `h`.
9. Type `zzqx` (gibberish that won't match anything).
10. Type `%`, then clear it and type `'; drop table` — just to confirm nothing breaks.
11. Shrink your browser window to phone width (or use your phone) and repeat step 2.

**✅ Correct if:**
- Step 2: a dropdown appears showing hamper products, each with a photo, boutique name, and price, with
  "Ham" shown in bold within the product name.
- Step 3: the dropdown narrows specifically to "Luxe Memory Hamper".
- Step 4: a "Boutiques" row/section appears in the dropdown (matching "Lumen & Ash").
- Step 5: the highlighted row opens when you press Enter.
- Step 6: pressing Enter with nothing highlighted runs a normal full search instead.
- Step 7: the dropdown closes but your typed text stays in the box.
- Step 8: no dropdown appears for a single character.
- Step 9: the dropdown shows a "Nothing matches…" message plus a "See all results" option.
- Step 10: no error, no crash, no strange results — just handled gracefully.
- Step 11: the dropdown fits within the screen width and scrolls inside itself if it's long, without pushing
  the page sideways.

**❌ Something's wrong if:** Any step above produces a JavaScript error, a frozen page, a dropdown that
overflows off the edge of the screen, or search that returns completely unrelated results.

### 1.10 — Add to cart as a guest

**Steps:**
1. While signed out, go to any product page.
2. Click **"Add to cart"**.
3. Look at the cart icon in the header.
4. Click the cart icon (or go to `/cart`).

**✅ Correct if:** Step 2-3: a small animation plays (a gift box flying toward the cart icon) and the cart
icon's count badge increases by one. Step 4: the item you added is there.

**❌ Something's wrong if:** Nothing visibly happens when you click "Add to cart", the count doesn't update,
or the cart page doesn't show the item.

### 1.11 — Wishlist as a guest

**Steps:**
1. While signed out, go to any product page.
2. Click the heart/wishlist icon.

**✅ Correct if:** Either the item is saved to a guest wishlist, OR you're prompted to sign in — either
behavior is acceptable, as long as something visibly happens.

**❌ Something's wrong if:** Clicking the heart does nothing at all with no feedback.

### 1.12 — 404 page

**Steps:**
1. Type a nonsense URL into the address bar, e.g. `https://www.giftping.in/this-page-does-not-exist`.
2. Press Enter.

**✅ Correct if:** You see a friendly, on-brand "page not found" message with a way back to the site (e.g. a
"Back to the entrance" link).

**❌ Something's wrong if:** You see a raw browser error page, a blank white screen, or the site's normal
homepage content with no indication anything was wrong.

---

## 2. Sign-up, sign-in, and account basics

### 2.1 — Sign up with a new account

**Steps:**
1. Go to `/sign-up`.
2. Type a brand-new email you haven't used before, e.g. `mytestuser+1@example.com`.
3. Type a password.
4. Click the **Sign up** button.

**✅ Correct if:** You land somewhere sensible afterward (a confirmation message, or signed in) — not a blank
page or a frozen screen.

**❌ Something's wrong if:** The page errors out, or you're left on a blank page with no feedback at all.

### 2.2 — Sign out, then sign back in

**Steps:**
1. If signed in, click your account menu (top-right) → **Sign Out**.
2. Go to `/sign-in`.
3. Sign in as `test-customer@giftping.test` / `TestPass123!` (see 0.2 for the full steps).

**✅ Correct if:** After signing out, the header shows a "Sign in" link instead of your account menu. After
signing back in, your account menu reappears.

**❌ Something's wrong if:** Signing out doesn't actually sign you out (account menu still shows), or signing
back in fails.

### 2.3 — Google sign-in button is present

**Steps:**
1. Go to `/sign-in`.
2. Look for a "Sign in with Google" button.
3. (Optional, only if you have a Google account handy) click it.

**✅ Correct if:** The button is visible and clicking it takes you to an actual Google sign-in page. You don't
need to complete the Google sign-in for this test — just confirm it goes to Google.

**❌ Something's wrong if:** There's no Google button at all, or clicking it goes nowhere/errors.

### 2.4 — Forgot password (real email)

ℹ️ **Note:** `test-customer@giftping.test` is not a real inbox — don't use it for this test. If you want to
test this for real, use an account whose email address is one you actually control.

**Steps:**
1. Go to `/sign-in`, click **"Forgot password?"**.
2. Type an email address you actually control.
3. Submit the form.
4. Check that inbox (and its spam folder).
5. Click the link in the email you receive.
6. Set a new password.

**✅ Correct if:** A real email arrives within a couple of minutes, clicking its link takes you to an
"Update password" page, and setting a new password works and lets you sign in with it afterward.

**❌ Something's wrong if:** No email ever arrives (checked spam too), the link in the email is broken, or
setting a new password fails.

### 2.5 — Wrong password is rejected

**Steps:**
1. Go to `/sign-in`.
2. Type a real email (e.g. `test-customer@giftping.test`).
3. Type a deliberately wrong password, e.g. `wrongpassword123`.
4. Click **Sign in**.

**✅ Correct if:** A clear error message appears (e.g. "Invalid email or password") and you remain signed
out — your account menu does NOT appear.

**❌ Something's wrong if:** The page crashes, or — much more seriously — you somehow get signed in anyway.

### 2.6 — Protected pages redirect signed-out visitors

**Steps:**
1. Make sure you're signed out.
2. Type `/account` directly into the address bar and press Enter.
3. Try `/vendor/dashboard`.
4. Try `/admin/dashboard`.

**✅ Correct if:** All three redirect you to the sign-in page rather than showing the actual page content.

**❌ Something's wrong if:** Any of these pages show real content while you're signed out.

### 2.7 — A customer can't access vendor/admin areas

**Steps:**
1. Sign in as `test-customer@giftping.test`.
2. Type `/vendor/dashboard` directly into the address bar.
3. Type `/admin/dashboard` directly into the address bar.

**✅ Correct if:** Both attempts bounce you away (e.g. redirected to the homepage) rather than showing the
vendor or admin page.

**❌ Something's wrong if:** A regular customer account can see vendor or admin pages — this would be a real
security problem, flag it immediately.

---

## 3. Profile management

Sign in as `test-customer@giftping.test` for this whole section.

### 3.1 — Change your name

**Steps:**
1. Go to `/account`, click into **Profile**.
2. Clear the name field and type a new test name, e.g. "Test Customer Updated".
3. Click **Save**.
4. Look at your account menu (top-right).

**✅ Correct if:** A success message appears, and the account menu now shows your new name.

**❌ Something's wrong if:** Saving fails, or the account menu still shows the old name after saving.

### 3.2 — Change your phone number (valid)

**Steps:**
1. On the Profile page, clear the phone field.
2. Type a valid 10-digit Indian mobile number, e.g. `9876543210`.
3. Click **Save**.

**✅ Correct if:** It saves without error.

**❌ Something's wrong if:** A valid-looking number is rejected.

### 3.3 — Invalid phone number is rejected

**Steps:**
1. Clear the phone field.
2. Type something invalid, e.g. `12345` (too short) or `abc1234567` (contains letters).
3. Click **Save**.

**✅ Correct if:** A clear validation error appears, explaining what's wrong, and nothing is saved.

**❌ Something's wrong if:** The invalid number is accepted and saved, or the page crashes instead of showing
a normal error.

### 3.4 — Blank phone number is allowed

**Steps:**
1. Clear the phone field completely (leave it empty).
2. Click **Save**.

**✅ Correct if:** It saves successfully — phone number is optional.

**❌ Something's wrong if:** You're blocked from saving with an empty phone field.

### 3.5 — Upload a profile photo

**Steps:**
1. Click **"Add a photo"** (or similar) on the Profile page.
2. Pick a real image file from your computer (any normal photo, JPG or PNG).
3. Wait for it to upload.

**✅ Correct if:** The photo uploads, gets automatically cropped to a square, and appears right away in both
the profile page and your account menu avatar.

**❌ Something's wrong if:** The upload fails, hangs forever, or the photo doesn't appear afterward.

### 3.6 — Upload a very large photo

**Steps:**
1. Find or prepare a large image file (several MB — most modern phone photos qualify).
2. Try uploading it the same way as 3.5.

**✅ Correct if:** It's handled gracefully — either resized/compressed automatically and it works, or you get
a clear message about a size limit if it's over the cap.

**❌ Something's wrong if:** The upload hangs indefinitely with no feedback, or the page crashes.

### 3.7 — Restore your test data

**Steps:**
1. Change your name and phone number back to whatever they were before you started (or just note down what
   you changed, so a future testing session knows).

ℹ️ This keeps the shared test account clean for the next person (or the next time you test).

---

## 4. Reviews

Sign in as `test-customer@giftping.test` for this whole section.

### 4.1 — Write a review on a delivered order

**Steps:**
1. Go to `/orders`.
2. Open an order whose status says **"Delivered"**.
3. Look for a "Write a review" button/link next to each item.
4. Click it, pick a star rating, type a title and some body text.
5. Submit.
6. Go to that product's page.

**✅ Correct if:** The "Write a review" option is visible on delivered items, submitting works, and your
review now appears on the product's page with your star rating.

**❌ Something's wrong if:** No "Write a review" option appears on a delivered item, submitting fails, or the
review doesn't show up on the product page afterward.

### 4.2 — Your review appears in your account

**Steps:**
1. Go to `/account/reviews`.

**✅ Correct if:** The review you just wrote (4.1) is listed here.

**❌ Something's wrong if:** It's missing.

### 4.3 — Edit a review

**Steps:**
1. From `/account/reviews`, click to edit the review you wrote.
2. Change the star rating and/or the text.
3. Save.
4. Check both `/account/reviews` and the product's page.

**✅ Correct if:** The change is reflected in both places.

**❌ Something's wrong if:** The edit doesn't save, or only updates in one of the two places.

### 4.4 — Can't review the same product twice

**Steps:**
1. Try to write a **second** review for the same product/order you already reviewed.

**✅ Correct if:** Either it updates your existing review instead of creating a duplicate, or it clearly tells
you that you've already reviewed this item.

**❌ Something's wrong if:** Two separate reviews from you appear on the same product.

### 4.5 — Delete a review

**Steps:**
1. From `/account/reviews`, click to delete a review.
2. A confirmation dialog should appear ("Are you sure?") — click through it to actually confirm.
3. Check both `/account/reviews` and the product's page.

**✅ Correct if:** The review is gone from both places after confirming.

**❌ Something's wrong if:** It's still there after deleting, or the confirmation dialog doesn't appear at
all (meaning a careless click could delete something by accident).

### 4.6 — No review option on non-delivered orders

**Steps:**
1. Go to `/orders`, open an order that's still processing or shipped (not yet "Delivered").
2. Look for a "Write a review" option on its items.

**✅ Correct if:** There is no "Write a review" option on items that haven't been delivered yet.

**❌ Something's wrong if:** You can write a review for something that hasn't arrived.

### 4.7 — You can read, but not edit, someone else's review

**Steps:**
1. While signed out (or signed in as a different customer), visit a product page that has reviews from
   `test-customer`.
2. Look at an existing review.

**✅ Correct if:** You can read the review text and rating, but there's no edit or delete button on it.

**❌ Something's wrong if:** You can see an edit/delete option on a review that isn't yours.

---

## 5. Addresses, notification preferences, wishlist, cart

Sign in as `test-customer@giftping.test` for this whole section.

### 5.1 — Manage addresses

**Steps:**
1. Go to `/account/addresses`.
2. Click **"Add a new address"**, fill in the form, save.
3. Click **Edit** on an existing address, change something, save.
4. If you have more than one address, click **"Make default"** on a different one.
5. Delete an address you don't need.
6. Go through checkout (see section 6) far enough to see which address is pre-selected.

**✅ Correct if:** Adding, editing, setting-default, and deleting all work, and whichever address is marked
"Default" is the one pre-selected at checkout.

**❌ Something's wrong if:** Any of these actions fails silently, or the wrong address is pre-selected at
checkout.

### 5.2 — Notification preferences save

**Steps:**
1. Go to `/account/notifications`.
2. Toggle an email/notification preference off, then back on.

**✅ Correct if:** Each toggle saves (usually a toast/confirmation appears) and the switch visibly reflects
its new state.

**❌ Something's wrong if:** Toggling does nothing, or the switch reverts to its old state after a page
reload even though you changed it.

### 5.3 — Wishlist

**Steps:**
1. Visit 2-3 different product pages, clicking the heart/wishlist icon on each.
2. Go to `/wishlist`.
3. Click to remove one item.

**✅ Correct if:** All the products you hearted appear on the wishlist page, and removing one makes it
disappear from the list.

**❌ Something's wrong if:** A hearted product is missing from the wishlist, or removing doesn't work.

### 5.4 — Wishlist price-drop alerts (needs two roles)

This test needs you to act as **two different accounts**: the customer who wishlists something, and the
vendor who changes its price. Use a normal window for one and a private/incognito window for the other.

**Steps:**
1. **As customer**: wishlist a specific product (note its name and current price).
2. **As that product's vendor**: go to `/vendor/products`, edit that exact product, and lower its price by
   **5% or more** (e.g. ₹1,299 → ₹999). Save.
3. **As admin**: go to `/admin/products`, find that product (it will be back in "pending" status because any
   vendor edit sends a product back for review), and approve it.
4. Wait for the daily alert job to run (around 9am IST), or ask a developer to trigger the cron route
   manually for testing.
5. **As the original customer**: check your notification bell and (if email notifications are on) your inbox.

**✅ Correct if:** You get exactly ONE notification saying something like "Price drop: <product> is now ₹…
(was ₹…, N% off)" that links to `/wishlist`.

**❌ Something's wrong if:** No notification arrives at all, or you get duplicate notifications for the same
drop.

**Edge cases to also try (optional, more thorough):**
- A price drop **under 5%** → nothing should be sent.
- Cutting the price then raising it back before the daily job runs → nothing should be sent.
- Wishlisting the product **after** the price was already cut → that person shouldn't get an alert for a drop
  that happened before they wishlisted it.
- A second price cut on the same product within a week of the first alert → the same person shouldn't be
  alerted again that quickly.
- Several wishlisted items dropping together → you should get ONE combined message, not one per item.
- Turning the "Wishlist price drops" toggle off beforehand → no email/push, but the in-app bell notification
  should still appear (same as every other notification category).

### 5.5 — Cart with multiple vendors

**Steps:**
1. Add a product from one boutique to your cart.
2. Add a product from a **different** boutique to your cart.
3. Go to `/cart`.
4. Change a quantity on one item.
5. Remove a different item.

**✅ Correct if:** Both vendors' items appear, and the total recalculates correctly after every quantity
change and removal.

**❌ Something's wrong if:** The total is wrong after any change, or an item from one vendor disappears when
you interact with the other vendor's item.

### 5.6 — Products with variants require a selection

**Steps:**
1. Go to a product that has size or color options (e.g. "Signature Gift Box — Forest Green").
2. Try clicking "Add to cart" **without** picking a size/color first.
3. Now pick a variant (e.g. "Large") and add to cart.
4. Pick a different, cheaper variant (e.g. "Small") on a fresh visit and compare the price shown.

**✅ Correct if:** Step 2 is blocked with a clear message asking you to pick an option first. Step 4: a
pricier variant shows a higher price than a cheaper one.

**❌ Something's wrong if:** You can add the product without picking a variant, or the price never changes
between variants that are supposed to cost different amounts.

### 5.7 — Personalized products carry their text through

**Steps:**
1. Go to a product with a personalization field (e.g. a name plate or engraved item).
2. Type a short custom text into the field.
3. Add to cart.
4. Go to `/cart` and look at that line item.

**✅ Correct if:** The exact text you typed is visible on the cart line.

**❌ Something's wrong if:** The text is missing, truncated unexpectedly, or shows something different from
what you typed.

### 5.8 — Stock limits are enforced

**Steps:**
1. Find (or ask a developer to set up) a product with very limited stock, e.g. 2 units left.
2. Try adding more than that to your cart (e.g. try to set the quantity to 5).

**✅ Correct if:** The quantity is capped at what's actually in stock, with a message explaining why.

**❌ Something's wrong if:** You can add more units than are actually in stock.

### 5.9 — Guest cart merges into your account on sign-in

**Steps:**
1. Sign out completely.
2. Add an item to your cart while signed out.
3. Sign in as `test-customer@giftping.test`.
4. Check `/cart`.

**✅ Correct if:** The item you added as a guest is now in your signed-in cart — it wasn't lost.

**❌ Something's wrong if:** The guest cart item disappears after signing in.

### 5.10 — Gift wrap style selection

**Steps:**
1. Add an item to your cart.
2. Go to cart or checkout and look for a gift-wrap option.
3. Pick a specific wrap style/color.
4. Complete the order (see section 6).
5. Check the finished order's details.

**✅ Correct if:** The wrap style you picked is reflected in the final order.

**❌ Something's wrong if:** Your choice doesn't carry through to the placed order.

---

## 6. Checkout and payment

### 6.1 — Apply a valid percentage coupon

**Steps:**
1. Build a cart worth at least ₹499.
2. Go to checkout.
3. Enter coupon code `WELCOME10`.
4. Apply it.

**✅ Correct if:** 10% comes off, but never more than ₹250 total (the cap).

**❌ Something's wrong if:** The discount is wrong, or applying the coupon fails/errors.

### 6.2 — Remove a coupon

**Steps:**
1. With `WELCOME10` applied (from 6.1), click to remove it.

**✅ Correct if:** The total goes back to the full price.

**❌ Something's wrong if:** The discount stays applied after removal, or the total is wrong afterward.

### 6.3 — Apply a valid fixed-amount coupon

**Steps:**
1. Build a cart worth at least ₹1,299.
2. Apply coupon `FLAT200`.

**✅ Correct if:** Exactly ₹200 comes off the total — no more, no less.

**❌ Something's wrong if:** The discount amount is wrong.

### 6.4 — Coupon below minimum order is rejected

**Steps:**
1. Build a cart **under** ₹499.
2. Try to apply `WELCOME10`.

**✅ Correct if:** It's rejected with a clear message explaining the minimum order requirement.

**❌ Something's wrong if:** It applies anyway, or fails with a confusing/blank error.

### 6.5 — Expired coupon is rejected

**Steps:**
1. Try to apply `DIWALI25`.

**✅ Correct if:** It's rejected with a message indicating it's expired or no longer valid.

**❌ Something's wrong if:** It applies successfully.

### 6.6 — Not-yet-started coupon is rejected

**Steps:**
1. Try to apply `NEWYEAR20`.

**✅ Correct if:** It's rejected.

**❌ Something's wrong if:** It applies successfully.

### 6.7 — One coupon use per customer

**Steps:**
1. Successfully complete an order using `WELCOME10` (follow 6.9 below to actually complete it).
2. Build a new cart worth ₹499+.
3. Try to apply `WELCOME10` again as the same customer.

**✅ Correct if:** The second attempt is rejected (already used by this customer).

**❌ Something's wrong if:** It applies a second time for the same customer.

### 6.8 — Delivery check runs during checkout

**Steps:**
1. At checkout, select or enter a delivery address.
2. Watch for a delivery estimate or serviceability message to appear.

**✅ Correct if:** Some kind of delivery confirmation/estimate appears — it shouldn't just hang with no
feedback.

**❌ Something's wrong if:** Nothing happens, or it hangs indefinitely with no estimate or error shown.

### 6.9 — Complete a successful payment

**Steps:**
1. With items in your cart and an address selected, click to place the order / continue to payment.
2. The Razorpay payment popup should open.
3. Choose UPI as the payment method.
4. Enter the test UPI ID `success@razorpay`.
5. Complete the simulated payment.

**✅ Correct if:**
- You land on an order confirmation page.
- A celebration animation plays (the robin mascot, a gift box opening) — specifically tied to this payment
  moment, not just to placing the order.
- Your cart is now empty.
- The new order appears in `/orders`.
- The stock count for what you bought has gone down by the quantity you ordered.

**❌ Something's wrong if:** Any of the above doesn't happen — especially if the order isn't recorded as paid,
or the cart still has the items in it afterward.

### 6.10 — A failed/cancelled payment doesn't create a paid order

**Steps:**
1. Build a new cart and go to checkout again.
2. Open the Razorpay popup.
3. Either use the UPI ID `failure@razorpay`, or just close/cancel the popup without paying.

**✅ Correct if:** You're told the payment didn't go through, and the order stays as an unpaid draft — it
should NOT show up as a confirmed/paid order.

**❌ Something's wrong if:** The order appears to succeed anyway, or you're left on a confusing blank page
with no explanation.

### 6.11 — Multi-vendor order shows separate shipments

**Steps:**
1. Build a cart with products from **two different boutiques**.
2. Complete checkout successfully (6.9).
3. Open the finished order's detail page.

**✅ Correct if:** The order shows **separate shipment sections**, one per vendor, each with its own status.

**❌ Something's wrong if:** The order shows only one combined shipment, or one vendor's items are missing
from the order detail.

### 6.12 — Can't check out with an empty cart

**Steps:**
1. Make sure your cart is empty (remove everything if needed).
2. Type `/checkout` directly into the address bar.

**✅ Correct if:** You're redirected somewhere sensible (e.g. back to the cart or shop) rather than shown a
broken, empty checkout page.

**❌ Something's wrong if:** You see a broken or confusing empty checkout page.

---

## 7. Orders, tracking, and returns

Sign in as `test-customer@giftping.test`.

### 7.1 — Order history

**Steps:**
1. Go to `/orders`.

**✅ Correct if:** You see both any orders you just placed and older orders that were already in the test
account.

**❌ Something's wrong if:** A recently placed order is missing from the list.

### 7.2 — Order detail page

**Steps:**
1. Click into any order from `/orders`.

**✅ Correct if:** You see the items, prices, delivery address, payment status, and a shipment timeline for
each vendor involved.

**❌ Something's wrong if:** Any of that information is missing or wrong.

### 7.3 — Request a return on a delivered item

**Steps:**
1. Open a **delivered** order.
2. Find the "Request a return" option on one of its items.
3. Pick a reason from the list, add a note if there's a field for one.
4. Submit.

**✅ Correct if:** The item now shows as "return requested" somewhere in your order view.

**❌ Something's wrong if:** The return option is missing on a delivered item, or submitting fails.

### 7.4 — Can't request a duplicate or out-of-window return

**Steps:**
1. On the item you just requested a return for (7.3), check whether the "Request a return" option is still
   available.
2. If you can find or create an old enough delivered order (outside the return window, e.g. more than 7
   days), check whether it still offers a return option.

**✅ Correct if:** An item with an already-open return request doesn't show the return option again, and an
order outside the return window doesn't offer it either.

**❌ Something's wrong if:** You can submit a second return request for the same item, or request a return
on something past its window.

---

## 8. Personal Gifting Diary

Sign in as `test-customer@giftping.test` (already has diary data seeded). If you can, also try these steps
once with a brand-new account to see the empty "first-run" experience.

### 8.1 — The diary home page loads as a flip-book

**Steps:**
1. Go to `/diary`.

**✅ Correct if:** It looks like an open book lying on a desk — not a plain list or table.

**❌ Something's wrong if:** It looks like a generic webpage with no book styling.

### 8.2 — Navigating between sections

**Steps:**
1. On `/diary`, click the section tabs to move between spreads.
2. Try the left/right arrow keys on your keyboard.
3. If on a touchscreen, try swiping left/right.
4. Look at the URL in the address bar as you move between sections.

**✅ Correct if:** All three navigation methods work, and the URL updates with a `?p=` parameter reflecting
which page/spread you're on.

**❌ Something's wrong if:** Navigation doesn't work via one of these methods, or the URL never changes.

### 8.3 — Add a new person to your diary

**Steps:**
1. Find the "Add a person" option.
2. Fill in a name and relationship.
3. Upload a real photo.
4. Save.
5. Right-click the uploaded photo and try to open its image URL directly in a new tab.

**✅ Correct if:** The person is added with their photo visible in the diary. Step 5: the direct image URL
should either refuse to load, or only work briefly (a signed, expiring link) — you should NOT be able to view
it freely forever. This is a deliberate privacy feature, not a bug.

**❌ Something's wrong if:** The person doesn't save, the photo doesn't appear, or the photo's direct URL
works indefinitely with no expiry (a real privacy problem worth flagging).

### 8.4 — Add a date for that person

**Steps:**
1. On the person you just added, add a date (e.g. their birthday).
2. Go to `/diary/year`.
3. Go back to the diary home and look at the "coming up" section.

**✅ Correct if:** The date you added shows up on both the year view and the diary home's upcoming list.

**❌ Something's wrong if:** The date is missing from either place.

### 8.5 — Create and move a gift plan

**Steps:**
1. On an upcoming date, start a gift plan.
2. Move it through each stage: Idea → Chosen → Ordered → Wrapped → Given.
3. When you reach "Ordered," try linking it to a product/order you've actually placed.
4. Also try linking it to something you haven't actually bought.

**✅ Correct if:** Each stage transition works, and the "Ordered" link correctly recognizes a genuine paid
order — it should NOT let you fake a link to an order that doesn't exist or isn't yours.

**❌ Something's wrong if:** You can mark something "Ordered" without a real, verified order behind it.

### 8.6 — Year and review pages load real data

**Steps:**
1. Go to `/diary/year`.
2. Go to `/diary/review`.

**✅ Correct if:** Both pages load with actual data from your diary (a "year at a glance" view and a "gifting
year in review" summary respectively) — not placeholder/empty content when you have real data.

**❌ Something's wrong if:** Either page is blank despite having real diary entries.

### 8.7 — Individual person pages

**Steps:**
1. Go to `/diary/people`.
2. Click into one person's individual page.
3. Try editing their notes or "things they love" section.

**✅ Correct if:** The list loads, the individual page shows their gift history and notes, and edits save.

**❌ Something's wrong if:** Any of this is missing or editing fails.

### 8.8 — Diary privacy from admin (read-only check)

**Steps:**
1. Sign in as `test-admin@giftping.test`.
2. Browse through the entire `/admin` section.
3. Look specifically for anywhere that might show a customer's diary contents (names, dates, notes).

**✅ Correct if:** Admins can see, at most, an aggregate count (e.g. "has a diary with 5 entries") — never any
actual names, dates, or notes from a customer's diary.

**❌ Something's wrong if:** You find ANY place in the admin UI showing real diary content — this is a
**serious privacy bug**, flag it immediately, don't just note it for later.

### 8.9 — Empty-diary first-run experience

**Steps:**
1. Using a brand-new account with no diary entries yet, go to `/diary`.

**✅ Correct if:** You see a friendly onboarding/welcome flow introducing the diary, not a blank or broken
page.

**❌ Something's wrong if:** The page is blank or looks broken with zero entries.

---

## 9. Vendor portal

Sign in as `test-vendor@giftping.test` (owns Lumière Keepsakes) for this whole section.

### 9.1 — Vendor dashboard

**Steps:**
1. Go to `/vendor/dashboard`.

**✅ Correct if:** You see real sales figures and/or recent activity.

**❌ Something's wrong if:** The page is blank or shows only placeholder zeros with no real data.

### 9.2 — Add a new product

**Steps:**
1. Go to `/vendor/products`.
2. Click to add a new product.
3. Fill in name, description, price, category.
4. Upload at least one image.
5. If relevant, add a variant group (size/color options).
6. Save.

**✅ Correct if:** The product is created and shows a **"pending"** status — it should NOT be immediately
live on the public site.

**❌ Something's wrong if:** The product goes live immediately without admin approval, or saving fails.

### 9.3 — Edit and deactivate a product

**Steps:**
1. Edit an existing product's price or description, save.
2. Find the "deactivate" option on a product, use it.
3. Check the public shop (e.g. that product's category page) to see if it's still listed.
4. Check your own `/vendor/products` list.

**✅ Correct if:** The edit saves correctly. After deactivating, the product disappears from the public shop
but **stays visible in your own product list** (so you can reactivate it later).

**❌ Something's wrong if:** A deactivated product still shows publicly, or it also disappears from your own
list.

### 9.4 — Bulk CSV import (valid file)

**Steps:**
1. Prepare a small CSV file with 2-3 rows matching the expected column format (there should be a
   template/example available on the import page).
2. Go to `/vendor/products/import`.
3. Upload the CSV.
4. Review the preview shown before committing.
5. Confirm/commit the import.
6. Check `/vendor/products` for the new items.

**✅ Correct if:** You see a preview before anything is actually created, and after committing, the products
appear as pending drafts.

**❌ Something's wrong if:** Products are created without ever showing a preview, or the preview doesn't
match what actually gets created.

### 9.5 — Re-uploading the same CSV is refused

**Steps:**
1. Upload the **exact same file** from 9.4 again.

**✅ Correct if:** It's refused as a duplicate, rather than creating everything a second time.

**❌ Something's wrong if:** The same products get created twice.

### 9.6 — A broken CSV shows a clear error

**Steps:**
1. Prepare a deliberately broken CSV — remove a required column, or leave a blank row in the middle.
2. Try uploading it.

**✅ Correct if:** The preview shows a clear, row-numbered error message, rather than crashing or silently
skipping the bad row.

**❌ Something's wrong if:** It crashes, or silently imports a broken/incomplete product with no warning.

### 9.7 — Orders list only shows your own paid orders

**Steps:**
1. Go to `/vendor/orders`.
2. Check that every order shown contains at least one of your own products.
3. Confirm you don't see any unpaid draft orders, or orders containing only other vendors' items.

**✅ Correct if:** Only paid orders containing your own products appear.

**❌ Something's wrong if:** You can see another vendor's order, or an unpaid draft order — this would be a
real data-leak bug.

### 9.8 — Accepting an order and booking a courier (real external action — be deliberate)

⚠️ **Before you do step 3 below**, understand: clicking "Book courier" calls the **real, live Shiprocket
account**. It will register a real pickup location (the first time only), create a real order in Shiprocket's
system, and request a real courier AWB (airway bill). This is not a simulation.

**Steps:**
1. Go to `/vendor/orders`, find an order ready to accept, click **Accept**.
2. Confirm the order moves to an "accepted" state.
3. **Decide first**: do you actually want to book a real test courier pickup right now? If not, stop here —
   you've confirmed accepting works, which is enough for most testing purposes.
4. If you do want to go further: click **"Book courier"**, filling in any package details asked for.
5. Wait for it to complete.

**✅ Correct if:** Accepting works cleanly (step 1-2). If you proceed to step 4-5: an AWB number, courier
name, and tracking link appear on the order afterward, and the customer receives a "Your gift is packed"
notification.

**❌ Something's wrong if:** Accepting fails, or (if you booked for real) the booking errors out without a
clear message, or no AWB/tracking info appears despite the booking appearing to succeed.

### 9.9 — Returns visible to the vendor

**Steps:**
1. If a return has been requested on one of your products (see test 7.3), go to `/vendor/returns`.

**✅ Correct if:** The return request is visible here.

**❌ Something's wrong if:** A real return request on your product is missing from this page.

### 9.10 — Payouts/settlements page loads

**Steps:**
1. Go to `/vendor/payouts`.

**✅ Correct if:** Your settlement ledger loads, even if it's empty or minimal.

**❌ Something's wrong if:** The page errors or is blank with no indication why.

### 9.11 — Vendor settings: logo, banner, bank details

**Steps:**
1. Go to `/vendor/settings`.
2. Update your business description, save.
3. Upload a new logo image.
4. Upload a new banner image.
5. Visit your own public storefront page to confirm both show up.
6. Scroll to the bank details section and look at any saved account number.

**✅ Correct if:** The description, logo, and banner all save and show correctly on your public page. The
bank account number field shows only the **last 4 digits** — never the full number.

**❌ Something's wrong if:** Logo/banner don't update on the public page, or the full bank account number is
visible anywhere in the UI.

---

## 10. Admin suite

Sign in as `test-admin@giftping.test` for this whole section.

### 10.1 — Admin dashboard

**Steps:**
1. Go to `/admin/dashboard`.

**✅ Correct if:** Real numbers and alerts load, not placeholder zeros.

**❌ Something's wrong if:** The page is blank or shows obviously fake/static data.

### 10.2 — Approve a pending vendor

**Steps:**
1. Go to `/admin/vendors`.
2. Find a **pending** application. If there isn't one, open a private/incognito window, go to
   `/vendor/register`, and submit a brand-new vendor application first.
3. Back in the admin window, approve that application.
4. Check `/vendors` (the public boutique listing) for the newly approved vendor.

**✅ Correct if:** The vendor appears live on the public `/vendors` page after approval.

**❌ Something's wrong if:** Approving doesn't make them appear publicly.

### 10.3 — Reject a pending vendor/product with a reason

**Steps:**
1. Find a different pending vendor or product application.
2. Reject it, typing a reason.
3. Check that the vendor can see the reason — either in their own portal or via a notification (sign in as
   that vendor, or check their notifications if you have access).

**✅ Correct if:** The reason is recorded and visible to the vendor.

**❌ Something's wrong if:** No reason is saved, or the vendor has no way to see why they were rejected.

### 10.4 — Suspend and reinstate a vendor

**Steps:**
1. Go to `/admin/vendors`, find **Lumière Keepsakes** (or another approved vendor), suspend them.
2. Check their public storefront page.
3. Check whether their products still show on category/search pages.
4. Reinstate them.
5. Re-check their storefront and products.

**✅ Correct if:** While suspended, their storefront becomes unreachable or is clearly marked, and their
products stop appearing publicly. After reinstating, everything comes back to normal.

**❌ Something's wrong if:** A suspended vendor's storefront or products remain fully visible, or reinstating
doesn't restore them properly.

### 10.5 — Message a single vendor

**Steps:**
1. On `/admin/vendors`, find the **"Message"** action for one vendor.
2. Write a subject and body, send.
3. Sign in as that vendor (or switch to their window).
4. Check `/notifications`.

**✅ Correct if:** The message appears in that vendor's notification inbox.

**❌ Something's wrong if:** It doesn't arrive.

### 10.6 — Broadcast a message to all vendors

**Steps:**
1. On `/admin/vendors`, find **"Message all vendors"** at the top.
2. Write a message.
3. Send — a confirmation dialog ("Send to N vendors?") should appear; click through it for real.
4. Check the toast/confirmation message.
5. Sign in as at least one vendor and confirm they received it.

**✅ Correct if:** The confirmation dialog shows the correct count, the toast after sending matches, and the
vendor you spot-checked actually received it.

**❌ Something's wrong if:** The count is wrong, or the vendor you checked never got the message.

### 10.7 — Approve/reject a pending product

**Steps:**
1. Go to `/admin/products`.
2. Find the product you created in test 9.2 (or any pending product).
3. Approve or reject it.
4. Check the public site for it.

**✅ Correct if:** Approving makes it live publicly; rejecting keeps it off the public site.

**❌ Something's wrong if:** The product's public visibility doesn't match the decision you made.

### 10.8 — Cancel an order and confirm refund + restock

**Steps:**
1. Go to `/admin/orders`.
2. Open a paid order, click **Cancel**.
3. Check whether a refund was triggered (if it was paid).
4. Check the stock count for the cancelled item(s).

**✅ Correct if:** A refund is triggered for a paid order, and stock is restored for the cancelled items.

**❌ Something's wrong if:** No refund happens on a cancelled paid order, or stock isn't restored.

### 10.9 — Decide a return request

**Steps:**
1. Go to `/admin/returns`.
2. Find a pending return request (e.g. from test 7.3).
3. Approve or reject it with a note.
4. If approved, issue the refund.
5. Check the customer's order view.

**✅ Correct if:** The decision is recorded, and if approved + refunded, the customer sees the refund
reflected in their order.

**❌ Something's wrong if:** The refund doesn't show up for the customer, or the decision doesn't save.

### 10.10 — Create a coupon

**Steps:**
1. Go to `/admin/coupons`.
2. Create a brand-new coupon with any code you like.
3. Go test it at checkout (apply it on a qualifying cart).
4. Come back and check the redemption count after using one of the seeded coupons (`WELCOME10` or
   `FLAT200`).

**✅ Correct if:** The new coupon works at checkout, and redemption counts update after use.

**❌ Something's wrong if:** The new coupon doesn't work, or the count never updates.

### 10.11 — Create and void a settlement

**Steps:**
1. Go to `/admin/settlements`.
2. Create a settlement for a vendor with eligible delivered items.
3. Mark it as paid.
4. Try to **void** that same settlement now that it's marked paid.

**✅ Correct if:** Creating and marking-paid both work. Trying to void an already-paid settlement is
**refused** — a paid settlement should never be voidable.

**❌ Something's wrong if:** You're able to void a settlement that's already been marked paid — this is a
real financial-integrity bug.

### 10.12 — Scheduled banners

**Steps:**
1. Go to `/admin/banners`.
2. Create a new homepage banner scheduled to start **tomorrow**.
3. Check the live homepage — it should NOT show yet.
4. Create a second banner scheduled to start **right now**.
5. Check the live homepage again.

**✅ Correct if:** The tomorrow-scheduled banner does not show yet; the right-now banner does show.

**❌ Something's wrong if:** A future-scheduled banner shows up early, or a live one fails to appear.

### 10.13 — Theme preview is private to the admin

**Steps:**
1. Go to `/admin/themes`, click to preview a festival theme (e.g. Diwali).
2. Confirm the whole site re-skins for you, with a "Stop previewing" strip visible.
3. Open a private/incognito window (or a different browser) as a signed-out customer and check the homepage.
4. Back in the admin window, schedule a theme for a **future date**.
5. Check the live site.

**✅ Correct if:** The preview only changes the look for you, the previewing admin — the incognito/customer
view stays normal. A future-scheduled theme doesn't activate early.

**❌ Something's wrong if:** Previewing a theme changes it for every visitor, or a future-scheduled theme
activates immediately.

### 10.14 — Data export ("download my data")

**Steps:**
1. Go to `/admin/users`, find a test user.
2. Use the **"download my data"** export feature.
3. Open the downloaded file.

**✅ Correct if:** It contains that specific user's real data (orders, diary entries if any, addresses) and
nothing belonging to any other user.

**❌ Something's wrong if:** The export is empty, errors, or contains another user's data.

⚠️ **If you also want to test DPDP erasure** (permanent account deletion): use a disposable test account you
created yourself and don't need afterward. This is meant to be close to irreversible — **do not** run it
against the shared `test-customer` account.

---

## 10a. Personalization, wrap preview, and the gift finder

Test on both a real desktop and a real phone if you can.

### 10a.1 — Vendor sets up personalization on a product

**Steps:**
1. As `test-vendor@giftping.test`, open one of your products that has a photo.
2. Find **"Personalised text on the photo (optional)"**, tick it on.
3. Name the field, set a max character length, pick a lettering style, decide if it's required.
4. **Drag** the text box to where the text should appear on the photo.
5. Drag the round resize handle — it should stop at the photo's edge, never push the box off.
6. Try the arrow keys to nudge the box position.
7. Try "Fine-tune with sliders" if available.
8. Type a long name into "Try a name" preview field.
9. Save.
10. Reopen the product.
11. On a phone, try dragging the text box with your finger.

**✅ Correct if:** The box drags and resizes correctly and stays within bounds, a too-long name shrinks to fit
and/or warns you, saving sends the product back to "In review," and reopening shows your exact setup
unchanged. Touch dragging works on a phone.

**❌ Something's wrong if:** The box can be dragged off the photo, resizing breaks the layout, or your setup
doesn't persist after reopening.

### 10a.2 — Shopper sees live personalization preview

**Steps:**
1. Once the product (from 10a.1) is approved, open its public product page as a shopper.
2. Find the personalization field (should show your label and a character counter like "0/N").
3. Type a name.
4. While it's showing on one photo, switch to a different photo in the gallery, then back.
5. Open the zoom/lightbox view if available.
6. Resize your browser window and watch the text position.

**✅ Correct if:** Typed text appears live on the photo in the chosen style, resizing to fit. It jumps back to
the main photo if you were on another image. The zoomed view shows text in the same relative position. The
photo frame stays square at every window size so the text never visibly shifts relative to the product.

**❌ Something's wrong if:** Text doesn't appear on the photo, jumps to the wrong position, or the frame shape
changes between window sizes (causing the text to drift).

### 10a.3 — Personalization validation rules

**Steps:**
1. Leave a **required** personalization field empty and click "Add to cart".
2. Type text **longer than the allowed limit**.
3. Type `<b>x</b>` or an emoji into the field.
4. Type a name in Hindi, Tamil, or another non-Latin script.

**✅ Correct if:** Step 1 is blocked with an inline message and the field gets focus — nothing is added to
cart. Steps 2-3 are refused with a clear message. Step 4 is accepted (the text itself is kept exactly, even
if the on-screen preview font doesn't render the script perfectly).

**❌ Something's wrong if:** A required empty field lets you add to cart anyway, or over-limit/HTML text is
silently accepted.

### 10a.4 — Personalization travels through the whole order

**Steps:**
1. Add a personalized item to cart (with real custom text).
2. Go through checkout and complete payment.
3. Check the cart line, the checkout summary, and the final order page.
4. As the vendor, check the order in your portal.
5. Check the new-order email (if you can access the vendor's inbox).

**✅ Correct if:** All of these consistently show `Engraving: "<your text>"` — in the order page as plain
text, and in the vendor's portal/email as a visually highlighted line.

**❌ Something's wrong if:** The text is missing or different at any stage of this chain.

### 10a.5 — Gift wrap preview at checkout

**Steps:**
1. At checkout, tick "Add gift wrapping".
2. Look for a wrap preview below the style picker.
3. Type a gift message.
4. Try a couple of different wrap styles.

**✅ Correct if:** A large preview shows the chosen wrap with a handwritten-style card tucked in. Switching
styles updates smoothly, and the card text reads "Dear `<first name of the delivery address>`," followed by
your message.

**❌ Something's wrong if:** No preview appears, or the recipient's name/message is wrong or missing.

### 10a.6 — Gift finder quiz

**Steps:**
1. Go to `/gift-finder` (also reachable from the homepage "Not sure what to give?" band and the footer).
2. Answer each of the four questions — notice whether picking an answer auto-advances you.
3. Click **Back** at some point to confirm it works.
4. On the last step, select up to three interests — check that picking three greys out the rest.
5. Submit and view the results shelf.
6. Click **"Change my answers"**.
7. Click **"Start over"**.
8. Copy the results page URL and open it in a private/incognito window.
9. Try the quiz again choosing "A friend," "Just because," no specific budget, and no interests.
10. Try a very small budget to see what happens when little fits.

**✅ Correct if:** Each step works as described; results show products with reasons and a "Best match" badge
on at least one; nothing shown ever exceeds your stated budget; the copied URL in a private window shows the
exact same results; a no-preferences quiz still shows popular picks rather than an empty page.

**❌ Something's wrong if:** The budget cap is violated, the shared URL doesn't reproduce the same results, or
a "no preferences" answer set produces an empty results page.

### 10a.7 — Gift finder edge cases

**Steps:**
1. Manually edit the results URL to something invalid, e.g. `?who=zzz` or `?budget=-1`.
2. Turn off JavaScript in your browser (or use a tool that simulates this) and load `/gift-finder`.

**✅ Correct if:** An invalid URL shows a normal page, never a raw error. With JavaScript off, all four
questions appear on one page and the submit button still works (it's a real HTML form underneath).

**❌ Something's wrong if:** A bad URL crashes the page, or the quiz is completely unusable without
JavaScript.

---

## 10b. The basket (cart UI)

Test on both desktop and phone.

### 10b.1 — Desktop add-to-cart animation

**Steps:**
1. On a desktop browser with a mouse, go to a product page.
2. Click **"Add to cart"**.
3. Watch closely what happens over the next few seconds.
4. Move your mouse away and wait.

**✅ Correct if:** A gift box animation flies from the button to the basket icon, the icon bounces, and about
half a second later a **mini-basket panel opens** under the icon showing the item you just added ("Added to
your basket"), then fills in with your full cart contents. **No toast notification appears on desktop.** The
panel closes itself automatically a few seconds after it finishes loading, as long as your mouse isn't over
it.

**❌ Something's wrong if:** No animation plays, the mini-basket never opens, or a toast notification
incorrectly appears on desktop.

### 10b.2 — Hovering the basket icon

**Steps:**
1. Hover your mouse over the basket icon in the header (don't click).
2. Look at what appears.
3. Move your mouse away, or press **Esc**.
4. Click directly on the basket icon itself.
5. With an empty cart, repeat step 1.

**✅ Correct if:** Hovering opens the mini-basket showing photos, names, quantities, prices, a free-delivery
ribbon, and "View basket"/"Checkout" buttons. Moving away or Esc closes it. Clicking the icon itself still
goes to the full `/cart` page. With an empty cart, it says so and links to the mall.

**❌ Something's wrong if:** Hovering does nothing, or clicking the icon doesn't go to the cart page.

### 10b.3 — Phone/touch behavior

**Steps:**
1. On a phone (or a narrow/touch-emulated browser window), tap the basket icon or Cart tab.
2. Add an item to cart.

**✅ Correct if:** Tapping the icon goes straight to the cart page (no hover panel on touch). Adding to cart
shows a normal "Added" toast with a "View cart" button instead of the mini-basket.

**❌ Something's wrong if:** A hover-style panel incorrectly appears on a touch device, or no feedback appears
at all when adding to cart.

### 10b.4 — Cart page basket visuals

**Steps:**
1. Go to `/cart` with several items (ideally from more than one vendor, with at least one quantity above 1).
2. Note the basket graphic at the top.
3. Change a quantity.
4. Remove an item.
5. Remove everything to empty the cart.

**✅ Correct if:** Real product photos appear tucked into the basket (newest on the right), a number badge
shows on any item with quantity above 1, and "+N" appears if there are more than five items. Photos visibly
"drop in" on arrival. The basket jiggles when a quantity grows, and re-arranges when something's removed. An
empty cart shows an empty basket graphic with the robin mascot.

**❌ Something's wrong if:** Photos are missing or generic (not the real product photos), or the empty state
looks broken rather than intentional.

### 10b.5 — Free-delivery ribbon

**Steps:**
1. On `/cart` (or in the mini-basket), find the free-delivery progress ribbon for one vendor.
2. Add/remove items to move that vendor's subtotal around the free-delivery threshold (₹999 by default).
3. Cross the threshold.

**✅ Correct if:** The ribbon visibly fills as the subtotal grows, with a bow riding its tip. Once past the
threshold, it reads "Free delivery unlocked" and the bow ties with a small flourish animation.

**❌ Something's wrong if:** The ribbon doesn't update, or the "unlocked" state never triggers even once
you're clearly over the threshold.

### 10b.6 — Order confirmation "unwrap" animation

**Steps:**
1. Complete a real test payment (see test 6.9).
2. Watch the order confirmation page closely for the first several seconds.

**✅ Correct if:** A gift box animation plays: the box appears, the lid lifts off and flies away, the robin
hops up, a small spark/confetti burst happens, and a caption reads "Payment confirmed — thank you for your
order!" — then it fades out after about 4 seconds. The page underneath should never be blocked or
unclickable during this.

**❌ Something's wrong if:** The animation doesn't play, blocks interaction with the page, or never fades out.

### 10b.7 — Reduced motion is respected

**Steps:**
1. Turn on your operating system's "Reduce Motion" accessibility setting (macOS: System Settings →
   Accessibility → Display; Windows: Settings → Accessibility → Visual effects).
2. Reload the homepage and repeat the add-to-cart test (10b.1) and the order confirmation test (10b.6).

**✅ Correct if:** None of the animations play. The order confirmation is skipped straight to its end state,
with just a screen-reader announcement instead of the visual sequence.

**❌ Something's wrong if:** Animations still play despite "Reduce Motion" being on.

### 10b.8 — Slow connection behavior

**Steps:**
1. Open your browser's developer tools, find the network throttling option, set it to "Slow 3G".
2. Add an item to cart.

**✅ Correct if:** The mini-basket still opens immediately showing the item you just added, with an "Updating
your basket…" message, until the rest of the data finishes loading. It should never close itself before
showing something useful.

**❌ Something's wrong if:** The panel stays blank/frozen, or closes before any useful content appears.

---

## 10c. Admin SEO tools

### 10c.1 — SEO editor page layout

**Steps:**
1. Sign in as admin, go to `/admin/seo`.

**✅ Correct if:** You see six "Main pages" editors (Homepage, Mall, Occasions, Boutiques, About, Contact), a
"Where text is missing" panel, and a "Handled automatically" list.

**❌ Something's wrong if:** Any of these sections is missing or broken.

### 10c.2 — Edit a page's title/description

**Steps:**
1. On the **Contact** page editor, type a custom title and description.
2. Watch the Google-style preview as you type.
3. Keep typing until you exceed 70 characters in the title.
4. Shorten it back under 70.
5. Click Save.

**✅ Correct if:** The preview updates live as you type, with counters reading "Good length" / "May be cut
off" / "Too long" appropriately. Save is disabled until you've actually changed something. A title over 70
characters is refused.

**❌ Something's wrong if:** The preview doesn't update, or an over-length title is accepted.

### 10c.3 — Changes reach the real page

**Steps:**
1. After saving (10c.2), open `/contact` in a new tab.
2. View the page source, or hover the browser tab to see the tooltip title.
3. Optionally, paste the page's link into a chat app or Facebook's Sharing Debugger tool to see the preview
   card.

**✅ Correct if:** The `<title>` and meta description shown match exactly what you just saved.

**❌ Something's wrong if:** The live page still shows the old title/description.

### 10c.4 — Hide a page from search engines

**Steps:**
1. On the Contact page editor, tick **"Hide this page from search engines"**, save.
2. View source on `/contact` — look for a `robots` meta tag.
3. Check `/sitemap.xml` for whether `/contact` is still listed.
4. Untick the box, save again.
5. Re-check both.

**✅ Correct if:** After hiding, the page has `<meta name="robots" content="noindex">` and is removed from the
sitemap. After unhiding, both return to normal.

**❌ Something's wrong if:** The noindex tag doesn't appear, or the page stays in the sitemap while hidden.

### 10c.5 — Reset to default

**Steps:**
1. On any edited page, click **"Reset to default"**.

**✅ Correct if:** It reverts to the original built-in wording, and the live page reflects that.

**❌ Something's wrong if:** Resetting doesn't actually restore the default.

### 10c.6 — Category meta fields

**Steps:**
1. Go to Admin → Categories, edit **Birthday**.
2. Set a custom meta title and meta description, save.
3. Check `/categories/birthday`'s page source.
4. Clear those fields and save again.
5. Re-check the page.

**✅ Correct if:** The custom values show up on the live page. Clearing them falls back to something sensible
like "Birthday — GiftPing".

**❌ Something's wrong if:** Custom category meta fields are saved but never actually show on the live page.

### 10c.7 — Filtered pages are noindex

**Steps:**
1. Visit `/categories/birthday?sort=price_asc` (any filter/sort combination).
2. View page source, look for the robots meta tag and the canonical link.

**✅ Correct if:** This filtered URL has `noindex` and its canonical link points to the plain, unfiltered
`/categories/birthday` URL.

**❌ Something's wrong if:** The filtered URL is indexable, or has no canonical tag.

### 10c.8 — robots.txt and sitemap.xml correctness

**Steps:**
1. Visit `/robots.txt`.
2. Visit `/sitemap.xml`.
3. Suspend a vendor (via `/admin/vendors`, see test 10.4), then re-check the sitemap.

**✅ Correct if:** `robots.txt` disallows admin, vendor portal (`/vendor/`), cart, checkout, accounts, and
diary — but does **NOT** disallow `/vendors/…` (plural, the public boutique pages) or `/products/…`.
`sitemap.xml` lists products, boutiques, occasions, and main pages, and a suspended vendor's page drops out of
it.

**❌ Something's wrong if:** `robots.txt` accidentally blocks the public `/vendors/` pages (a classic
prefix-matching mistake), or a suspended vendor's page remains in the sitemap.

---

## 10d. Marketing email campaigns & consent

This section has real legal weight (consent compliance) — worth testing thoroughly, not skimming.

### 10d.1 — Sign-up checkbox defaults to unticked

**Steps:**
1. Go to `/sign-up`.
2. Look at the marketing-email checkbox ("Email me offers, new arrivals and gifting ideas…").
3. Create an account **without** ticking it.
4. Confirm the email.
5. Go to `/account/notifications`.

**✅ Correct if:** The box starts unticked by default, and after signing up without ticking it, the "Offers &
new arrivals by email" switch is **off**.

**❌ Something's wrong if:** The box is pre-ticked, or the switch ends up "on" despite not ticking it.

### 10d.2 — Ticking the box at sign-up

**Steps:**
1. Create a second new account, this time **ticking** the marketing checkbox.
2. Before clicking the email confirmation link, check `/account/notifications`.
3. Click the confirmation link, sign in.
4. Check `/account/notifications` again.

**✅ Correct if:** Before confirming, the switch still reads off/not subscribed — consent is only recorded
once the email is confirmed. After confirming, it reads **on**, with a line like "You turned this on on
`<date>`".

**❌ Something's wrong if:** Consent is recorded before email confirmation, or never turns on even after
confirming.

### 10d.3 — The settings switch itself

**Steps:**
1. On `/account/notifications`, toggle the marketing email switch off, then on, then off again.

**✅ Correct if:** Each click saves immediately (a toast confirms it), the date line updates each time, and no
page reload is needed.

**❌ Something's wrong if:** Toggling doesn't save, or requires a page reload to take effect.

### 10d.4 — Admin campaigns overview

**Steps:**
1. Go to `/admin/campaigns`.

**✅ Correct if:** It shows how many customers have opted in (as a count only — no email addresses listed),
current sending limits, and a red "Sending is switched off" banner **only if** the unsubscribe secret
environment variable is missing (should not normally be the case in production).

**❌ Something's wrong if:** Individual customer email addresses are shown here (a privacy issue), or the
counts are obviously wrong.

### 10d.5 — Creating a campaign (validation)

**Steps:**
1. Click "New campaign".
2. Try a button with text but no link — try to save.
3. Try a link of `javascript:alert(1)` — try to save.
4. Try a link of `http://...` (not https) — try to save.
5. Try a subject containing a line break.
6. Try a message over 5,000 characters.
7. Now fill everything in validly and save.

**✅ Correct if:** Steps 2-6 are all refused with clear error messages. Step 7 succeeds and opens the
campaign's page with an email preview.

**❌ Something's wrong if:** Any of the invalid inputs (especially the `javascript:` link — a real security
concern) is accepted.

### 10d.6 — Campaign preview is safe

**Steps:**
1. On a draft campaign, look at the preview.
2. Edit the message to include `<b>bold</b>` or `<script>alert(1)</script>`.
3. Check the preview again.

**✅ Correct if:** The preview shows "Hi `<name>`,", your paragraphs (blank line = new paragraph), the button,
and a footer with reason/unsubscribe/preferences links. The HTML/script text you typed appears as **literal
visible text**, never interpreted as real formatting or executed as a script.

**❌ Something's wrong if:** Your `<script>` or `<b>` tags actually render/execute instead of showing as plain
text — this would be a real security vulnerability (XSS), flag it immediately.

### 10d.7 — Send a test email

**Steps:**
1. On a draft campaign, click "Send me a test".
2. Check the admin account's real inbox (and spam folder).

**✅ Correct if:** A real email arrives with "[TEST]" in the subject line.

**❌ Something's wrong if:** No email arrives.

### 10d.8 — Can't start with nobody opted in

**Steps:**
1. On a campaign, if your test accounts have nobody opted in to marketing email, try clicking **Start**.

**✅ Correct if:** It's refused with a clear message, and the campaign stays a draft.

**❌ Something's wrong if:** It attempts to send to an empty audience without any warning.

### 10d.9 — Start a real campaign

⚠️ This sends real email. Make sure only accounts you control (or are happy to email) are opted in before
doing this.

**Steps:**
1. Make sure a few test accounts you control are opted in to marketing email.
2. Create and start a campaign.
3. Read the confirmation box carefully before confirming — it should state how many people and roughly how
   long sending will take.
4. Confirm.
5. Watch the queued/sent/failed/skipped counts update.

**✅ Correct if:** The confirmation accurately previews scope, and after starting, the counts update visibly.
With the default free-tier limit (50/day), a larger audience spreads over several days — "Send next batch
now" only sends more while today's limit has room left.

**❌ Something's wrong if:** It sends to people you didn't expect, or the counts never update.

### 10d.10 — Unsubscribe mid-campaign

**Steps:**
1. While a campaign is mid-send (from 10d.9), unsubscribe one recipient (turn their switch off).
2. Check that person's status in the campaign.

**✅ Correct if:** That person shows as **skipped** and never receives the email.

**❌ Something's wrong if:** They receive it anyway after unsubscribing.

### 10d.11 — Unsubscribe from the email itself

**Steps:**
1. Open a real campaign email you received.
2. Click the unsubscribe link — it should go to a confirmation page, not unsubscribe you immediately.
3. On that confirmation page, click "Yes, unsubscribe me".
4. Visit the same unsubscribe link a second time.
5. If using Gmail, also try its built-in header "Unsubscribe" button.

**✅ Correct if:** Simply opening the link does NOT unsubscribe you — only clicking the explicit confirm
button does. Using the link twice still shows a success page both times (no error on the second visit).
Gmail's own unsubscribe button also works.

**❌ Something's wrong if:** Merely opening the link unsubscribes you without confirmation (a real compliance
issue, since link-scanners/email previews could trigger this accidentally).

### 10d.12 — Pause, resume, cancel

**Steps:**
1. Start a campaign, then pause it mid-send.
2. Confirm no further emails go out while paused.
3. Resume it.
4. Start another campaign and cancel it instead.

**✅ Correct if:** Pausing stops sending; resuming continues; cancelling marks everyone not yet emailed as
skipped.

**❌ Something's wrong if:** A paused campaign keeps sending, or cancelling doesn't stop it.

### 10d.13 — Sending limits

**Steps:**
1. In admin campaign settings, find "Sending limits" (per day / per month).
2. Try setting "Per day" to a number **larger** than "Per month".
3. Set a valid, sensible value instead and save.
4. Reload the page and check the "room left now" figure.

**✅ Correct if:** An invalid combination (daily limit exceeding monthly limit) is refused. A valid save
works, and the "room left" figure is accurate after a reload.

**❌ Something's wrong if:** An illogical limit combination is accepted.

### 10d.14 — Data export includes marketing history

**Steps:**
1. As an opted-in customer, download your data export (Account → export, or similar).
2. Open the file and look for a marketing-related section.

**✅ Correct if:** It contains your consent history and any campaigns you were sent.

**❌ Something's wrong if:** This section is missing entirely.

---

## 11. Notifications

### 11.1 — In-app notification bell

**Steps:**
1. Sign in as a customer.
2. Trigger some kind of notification-worthy event — place an order, or (as a vendor) receive an admin
   message, or get a review reply.
3. Look at the notification bell icon in the header.
4. Click it to open the dropdown/inbox.

**✅ Correct if:** The bell's unread count updates, and the dropdown shows each notification with sensible
styling (not raw unformatted text).

**❌ Something's wrong if:** The count doesn't update, or the dropdown is empty/broken despite a real event
happening.

### 11.2 — Marking notifications read

**Steps:**
1. With unread notifications present, click one (or use a "mark all read" option if available).

**✅ Correct if:** The unread count drops accordingly.

**❌ Something's wrong if:** The count doesn't change after marking as read.

### 11.3 — Real email delivery

**Steps:**
1. Trigger an event that should send an email (e.g. place a real order, or get a price-drop alert).
2. Check the real inbox of the account you used.

**✅ Correct if:** A real email arrives, whether you're testing from localhost or `www.giftping.in` — email
sending works the same either way now.

**❌ Something's wrong if:** No email ever arrives for an event that should trigger one.

### 11.4 — Real web push notification

ℹ️ This only works on the live site (`www.giftping.in`), not localhost — web push requires a real HTTPS
origin.

**Steps:**
1. On `https://www.giftping.in`, sign in and opt into push notifications if prompted.
2. Trigger a notification-worthy event.
3. Check for an actual browser/OS-level push notification, outside the browser tab.

**✅ Correct if:** A real push notification appears. Either way, the **in-app** bell notification should
always appear too, regardless of whether push succeeded.

**❌ Something's wrong if:** The in-app notification is missing (push failing silently is more tolerable,
since it depends on browser/OS permissions outside the app's control).

---

## 12. Visual / cross-cutting checks

### 12.1 — Header contrast on plain-background pages

**Steps:**
1. Visit `/mall`, then `/account/profile`, then `/diary`.
2. Look at the header on each.

**✅ Correct if:** The header is a clearly legible, **solid green pill** on all three — never a washed-out,
barely-visible strip blending into the background.

**❌ Something's wrong if:** The header text is hard to read against its background on any of these pages.

### 12.2 — Header glass effect on photo pages

**Steps:**
1. Visit the homepage `/` and a vendor storefront page.
2. Look at the header at the very top of the page.
3. Scroll down slightly.

**✅ Correct if:** At the top, the header shows a subtle tint with the photo behind it still visible through
it. After scrolling, it switches to the solid pill.

**❌ Something's wrong if:** The glass effect never appears, or the photo is completely obscured instead of
tinted.

### 12.3 — Gold edge detail

**Steps:**
1. On desktop, look closely at the header pill's border.
2. On a phone-width window, look at the bottom edge of the header.

**✅ Correct if:** Desktop shows a thin warm gold/copper gradient ring around the pill. Mobile shows a thin
gold line along the header's bottom edge.

**❌ Something's wrong if:** Neither detail is visible (a plain flat border instead).

### 12.4 — Diary button in the header

**Steps:**
1. On a wide browser window (1440px or wider), look at the right side of the header.
2. Narrow the window, or scroll down.

**✅ Correct if:** A drawn leather diary icon on a cream, gold-ringed pill sits at the right of the header on
every page. At rest on a wide window, it shows a caption like "My Diary". Scrolling or narrowing the window
leaves just the book icon chip, with no caption. It never visually overflows past the header's rounded edge.
"Diaries" should NOT appear as a separate plain text link in the navigation anymore.

**❌ Something's wrong if:** The button overflows the header's edge, or a redundant "Diaries" text link still
exists in the nav.

### 12.5 — Responsive layout at phone width

**Steps:**
1. Resize your browser window to a narrow, phone-like width (or use your phone).
2. Visit the homepage, a product page, the cart, checkout, and the diary.

**✅ Correct if:** Nothing overlaps, clips awkwardly, or requires horizontal scrolling on any of these pages.

**❌ Something's wrong if:** Any page breaks visually at phone width.

### 12.6 — Reduced motion disables decorative animation

**Steps:**
1. Turn on your OS's "Reduce Motion" setting (see test 10b.7 for how).
2. Reload the homepage and move your mouse around.

**✅ Correct if:** The custom robin cursor and the cart-fly animation do not appear at all — this is
intentional, not a missing feature.

**❌ Something's wrong if:** These animations still play despite the setting being on.

---

## 13. The mall as a place

### 13.1 — Interactive mall map

**Steps:**
1. On a desktop, go to `/mall`, hover over map markers numbered 2, 7, and 5 one at a time.
2. Move your mouse completely off the map.
3. Click **"Take a Tour"**.
4. On a phone, tap a number once, then tap it again.

**✅ Correct if:** Hovering makes a robin fly to that spot and shows a card below the map (place name, a live
count, a quote, three thumbnails, "Step inside"). Moving the mouse away leaves the robin where it last was
(it doesn't snap back). "Take a Tour" walks through all nine places automatically. On a phone, the first tap
shows the card, the second tap navigates in.

**❌ Something's wrong if:** Hovering does nothing, the tour doesn't work, or the two-tap phone behavior
doesn't work (e.g. one tap immediately navigates away).

### 13.2 — Shop-door page transition

**Steps:**
1. In a normal (not private/incognito, and not a background browser tab) browser window, go to `/vendors`.
2. Click into a boutique.
3. Click your browser's **Back** button.
4. Repeat from `/categories` into an occasion page.

**✅ Correct if:** The boutique's shopfront picture visibly grows into the full banner as you navigate in,
and shrinks back on Back — a smooth morph, not an abrupt page flash. (Note which browser you're using if it
just flashes instead — some browsers support this better than others.) With "Reduce Motion" on, it should
never animate, just change instantly.

**❌ Something's wrong if:** Every browser you try just flashes with no transition at all (not just one).

### 13.3 — Waving robin on auth pages

**Steps:**
1. Visit `/sign-in`, `/sign-up`, and `/reset-password`.

**✅ Correct if:** Each page shows the robin mascot waving above the form.

**❌ Something's wrong if:** The robin is missing on any of these three pages.

### 13.4 — Festival mode (Diwali)

**Steps:**
1. Sign in as admin, go to `/admin/themes`, preview **Diwali**.
2. Look at the homepage.
3. Look at the countdown ribbon text.
4. Check the cart page.
5. Check checkout, sign-in, and the vendor/admin portals.
6. Stop the preview.

**✅ Correct if:** The homepage shows a maroon color scheme, a countdown ribbon reading something like "N days
to Diwali — order by `<date>`", and rising lamp decorations. The cart shows a one-line festival note.
Checkout, sign-in, and both portals show **no** lamp decorations (festival flourishes are kept away from
money/account pages on purpose). Stopping the preview returns everything to normal.

**❌ Something's wrong if:** Festival decorations leak into checkout or the portals, or the countdown math
looks wrong for today's date.

ℹ️ **Diwali is dated 8 Nov 2026 with a 4-day order cutoff.** Since this is close, it's worth actually
scheduling it for real via "Schedule a theme" (not just previewing) once the date and cutoff are confirmed
with the client — see the questionnaire.

### 13.5 — Shop-window card tilt

**Steps:**
1. On a desktop with a mouse, go to `/vendors` or `/categories`, move your mouse over a card without
   clicking.
2. Repeat on a phone.

**✅ Correct if:** On desktop, cards lean slightly toward the cursor with a warm light following it. On a
phone, nothing tilts (no mouse to follow).

**❌ Something's wrong if:** The tilt effect is missing on desktop.

---

## 14. Diary polish — ribbons, wax seal, tape-peel

### 14.1 — Countdown ribbon fills as a date nears

**Steps:**
1. Open `/diary`, look at the "Next moments" tickets.
2. Open a person who has an upcoming date.

**✅ Correct if:** The ribbon under each date looks more filled the sooner that date is, with a small bow
riding its tip.

**❌ Something's wrong if:** The ribbon fill doesn't correlate with how soon the date is.

### 14.2 — Today's date triggers confetti

**Steps:**
1. Add or edit a date so it falls on **today's date**.
2. Look at the ticket, the date card, and the plan header for that date.

**✅ Correct if:** The ribbon shows fully filled, and a small paper confetti burst plays once around it, on
all three of those places.

**❌ Something's wrong if:** No confetti plays for a date that's today.

### 14.3 — Wax seal on "Given"

**Steps:**
1. On a person's page, start a gift plan and step it all the way through to **"Given"**.
2. Watch what happens right at that moment.
3. Refresh the page.

**✅ Correct if:** A wax seal visibly stamps down next to "Given with love" the moment you mark it given.
After refreshing, the seal animation is gone — just the checkmark text remains. **This is correct, not a
bug** — the seal is a one-time moment animation, not a persistent visual.

**❌ Something's wrong if:** The seal animation never plays at all, even the first time.

### 14.4 — Tape-peel on a new person

**Steps:**
1. Add a new person to your diary.
2. Watch their photo as it appears.
3. Refresh the page.

**✅ Correct if:** The photo visibly drops in and a strip of tape peels down into place over it — not just an
instant appearance. After refreshing, it just sits there normally without replaying the animation.

**❌ Something's wrong if:** The animation never plays even the first time the person is added.

---

## 15. Christmas festival theme

ℹ️ No dedicated artwork exists yet for this theme — it currently works purely through color/countdown/ambience
changes. Seeing the regular native photos while this theme is active is expected, not a bug.

### 15.1 — Preview the Christmas theme

**Steps:**
1. Sign in as admin, go to `/admin/themes`, preview **Christmas**.
2. Look at the whole site's color scheme.

**✅ Correct if:** The site re-skins to a deep pine-green and holly-berry-red look (replacing the usual
forest-green/copper), on a cooler frost-white canvas instead of the usual warm cream.

**❌ Something's wrong if:** The colors don't visibly change, or look broken/clashing.

### 15.2 — Countdown ribbon math

**Steps:**
1. With the Christmas preview active, look at the homepage countdown ribbon.
2. Check today's date against Christmas (25 Dec 2026).
3. Click the "Shop Christmas gifts" link/button.

**✅ Correct if:** The ribbon reads "N days to Christmas — order by 20 Dec" where N correctly reflects the
number of days from today to 25 Dec. Clicking the link takes you to `/categories/festivals`.

**❌ Something's wrong if:** The day count is wrong, or the link goes nowhere/404s.

### 15.3 — Snow ambience

**Steps:**
1. With Christmas active, look at the homepage hero area and other ordinary browsing pages.
2. Check checkout, cart, orders, admin, vendor portal, and sign-in pages.

**✅ Correct if:** Small white dots drift down slowly on ordinary browsing pages, but **never** on
checkout/cart/orders/admin/vendor portal/sign-in.

**❌ Something's wrong if:** Snow appears on a money/account page, or never appears anywhere at all.

### 15.4 — Contrast check

**Steps:**
1. With Christmas active, read the header navigation text.
2. Read the "Explore the Mall"/"Watch Our Story" button text.
3. Read the countdown ribbon's text against its pine-green background.

**✅ Correct if:** All of this text stays clearly legible — good contrast against its background.

**❌ Something's wrong if:** Any text becomes hard to read (e.g. dark text on dark background).

### 15.5 — Stopping the preview

**Steps:**
1. Stop the Christmas preview.
2. Check your own view returns to normal.
3. Open a private/incognito window as a signed-out visitor and check the homepage.

**✅ Correct if:** Your own view returns to normal, and the incognito visitor never saw the Christmas theme at
all (confirming the preview was private to you).

**❌ Something's wrong if:** A regular visitor saw the Christmas theme while you were only previewing it.

ℹ️ **Before scheduling this theme live** (not just previewing), confirm the Dec 25 date and 5-day order
cutoff with the client — the cutoff in particular is just an assumption about December courier congestion.
See the client questionnaire.

---

## 16. Delivery speed options — Standard vs Express

ℹ️ This test calls the **real Shiprocket API**. Results will vary by the actual route — not every pincode
will show the same thing, because it depends on which real couriers currently service it.

### 16.1 — See a real Standard/Express split

**Steps:**
1. Sign in as a customer, add a product from **Lumière Keepsakes** (warehouse in Jaipur) to your cart.
2. Go to checkout.
3. Add or select a delivery address in **Delhi, pincode 110001** (confirmed to show a real split at the time
   this was built).
4. Look at the delivery section for that vendor's line.

**✅ Correct if:** A Standard/Express radio pair appears with real day counts and a surcharge (around +₹99,
though the exact number is admin-configurable). The exact day counts/prices may have drifted since this was
written (Shiprocket's own rates change) — that's expected, not a bug, as long as *something* sensible appears.

**❌ Something's wrong if:** No delivery speed options appear at all for this specific route, or the numbers
shown look obviously broken (e.g. negative days, ₹0 surcharge).

### 16.2 — Single-courier routes show no Express option

**Steps:**
1. Try a different delivery address with pincode **400001 (Mumbai)**, **560001 (Bangalore)**, or **600001
   (Chennai)**.

**✅ Correct if:** No Express option appears — this is correct, not a missing feature, when only one courier
services that specific route.

**❌ Something's wrong if:** An Express option appears with clearly fake/duplicate data on a single-courier
route.

### 16.3 — Selecting Express updates the total correctly

**Steps:**
1. On the Delhi address (16.1) where Express is available, note the current Delivery line and Total in the
   order summary.
2. Click to select **Express**.
3. Compare the new Delivery line and Total.

**✅ Correct if:** The Delivery line and Total both increase by **exactly** the surcharge amount shown —
nothing else about the order changes.

**❌ Something's wrong if:** The total changes by the wrong amount, or other line items are affected.

### 16.4 — Changing address resets the Express selection

**Steps:**
1. With Express selected (16.3), switch to a **different** saved address.
2. Check the delivery options again.

**✅ Correct if:** The Express selection resets — a different pincode might not offer the same upgrade (or
any upgrade at all), so it shouldn't carry over blindly.

**❌ Something's wrong if:** Express stays selected and charged even after switching to an address where it
was never actually confirmed available.

### 16.5 — Placing an order with Express

**Steps:**
1. With Express selected on a valid route, complete checkout and payment (see test 6.9).
2. Check the final charged amount.

**✅ Correct if:** The total charged includes the Express surcharge.

**❌ Something's wrong if:** The surcharge is dropped at the final payment step.

### 16.6 — Vendor sees the Express flag

**Steps:**
1. As the vendor (`test-vendor@giftping.test`), go to `/vendor/orders`.
2. Find the order from 16.5.

**✅ Correct if:** The order shows a message like "Customer paid for Express delivery — please accept and
dispatch promptly."

**❌ Something's wrong if:** No indication of the Express selection appears to the vendor.

### 16.7 — Customer sees the Express badge once shipped

**Steps:**
1. Once the vendor has booked a real courier for this order (see test 9.8 — only if you've decided to do a
   real booking), check the customer's order detail page.

**✅ Correct if:** A small "Express" badge appears next to that vendor's shipment section.

**❌ Something's wrong if:** The badge is missing despite Express having been selected and paid for.

### 16.8 — Multi-vendor cart with mixed eligibility

**Steps:**
1. Build a cart with items from two different vendors — one on a route with a real Express option, one
   without.
2. Go to checkout.

**✅ Correct if:** Only the eligible vendor's line shows the Standard/Express toggle; the surcharge only
applies to whichever vendor you actually upgrade.

**❌ Something's wrong if:** Both vendors show the toggle, or the surcharge applies to the wrong vendor's
line.

### 16.9 — Express still costs extra even with free standard delivery

**Steps:**
1. Build a cart whose subtotal already qualifies for free standard delivery (above the free-delivery
   threshold for that vendor).
2. Select Express on that vendor's line.

**✅ Correct if:** Express still costs the surcharge — free delivery only waives the ordinary flat fee, not
the speed upgrade.

**❌ Something's wrong if:** Express becomes free too once the order qualifies for free standard delivery.

---

## 17. Return pickup booking

ℹ️ This is an **admin-only** action — `/vendor/returns` stays read-only on purpose; GiftPing books the pickup
centrally, not the individual boutique.

### 17.1 — Finding a bookable return

**Steps:**
1. Sign in as admin, go to `/admin/returns?status=approved`.
2. Look at orders `GP-100145` and `GP-100142` (already in the seed data) — or any other approved return with
   no pickup booked yet.

**✅ Correct if:** Each approved return with no pickup yet shows a **"Book pickup"** button next to "Issue the
refund →".

**❌ Something's wrong if:** The button is missing on an approved, not-yet-booked return.

### 17.2 — Before clicking "Book pickup" — understand what it does

⚠️ **This calls the real, live Shiprocket API.** Clicking it creates a genuine return order in Shiprocket's
system and requests an actual courier pickup from the customer's real address. This is not a simulation —
decide deliberately whether you actually want to do this right now.

**Steps:**
1. Decide: do you want to book a real test pickup right now, or just confirm the button exists and is wired
   up (test 17.1 already confirms that much)?
2. If you're confident you want to proceed, continue to 17.3. If not, stop here — you've covered the safe
   part of this test.

### 17.3 — Actually booking a pickup (only if you decided to)

**Steps:**
1. Click **"Book pickup"** on one of the approved returns.
2. Wait for it to complete.
3. Check the button/status on that return afterward.
4. Check the customer's order page.
5. Check the vendor's `/vendor/returns` page.

**✅ Correct if:** It returns a real AWB (airway bill number). The button is replaced with something like
"Pickup booked · `<courier>` · AWB `<number>`". The customer's order page now reads something like "a courier
from `<name>` is collecting it (AWB `<number>`)" instead of the generic "we'll arrange the pickup." The
vendor's returns page shows "Pickup booked … it's on its way back to you."

**❌ Something's wrong if:** The booking errors out without a clear message, or succeeds but the AWB/status
doesn't show up in one of the three places listed above.

### 17.4 — Can't double-book the same return

**Steps:**
1. On the same return you just booked a pickup for (17.3), try clicking "Book pickup" again (if the button
   is still somehow clickable) or look at its current state.

**✅ Correct if:** It's refused with a message like "A return pickup is already booked for this item" — not a
second, duplicate booking.

**❌ Something's wrong if:** A second real booking is created for the same return.

---

## 18. Brand & SEO polish

These are quick visual checks, not full workflows.

### 18.1 — Browser tab icon

**Steps:**
1. On any page of the site, look at the actual browser tab icon (not the page content — the small icon in
   the tab itself).
2. Bookmark the page, or (on a phone) try "Add to Home Screen".

**✅ Correct if:** You see the real GiftPing mark — a forest-green "Gp" monogram with a robin perched on top
— not a generic/placeholder icon. The same mark should appear on the bookmark or home-screen shortcut.

**❌ Something's wrong if:** A generic icon (e.g. a blank page icon, or an unrelated default icon) appears
instead.

### 18.2 — Product page title

**Steps:**
1. Open any product page.
2. Look at the browser tab's title text, or hover over a bookmark/history entry for it.

**✅ Correct if:** It reads `"<Product Name> — GiftPing"` — both the product name AND the brand suffix.

**❌ Something's wrong if:** It shows only the bare product name with no "— GiftPing" suffix.

### 18.3 — Google's real rich-results check (optional)

**Steps:**
1. Copy a real product page URL (e.g. `https://www.giftping.in/products/luxe-memory-hamper`).
2. Go to [search.google.com/test/rich-results](https://search.google.com/test/rich-results) (no sign-in
   needed).
3. Paste the URL and run the test.

**✅ Correct if:** It reports **4 valid items**: Product snippet, Merchant listing, Breadcrumbs, and Review
snippet, with no errors.

**❌ Something's wrong if:** Any of these four is missing or shows an error (not just a "non-critical issue"
notice, which is normal).

### 18.4 — What NOT to click-test

ℹ️ The actual Google **search result snippet** (showing `https://` instead of `http://`, the real logo
instead of a placeholder) updates on Google's own schedule, not something this app controls directly. Expect
it to look right within a week or two of these fixes going live — it's not something you can verify by
clicking anything in the app itself.

---

## Reporting a bug

For anything that doesn't match "✅ Correct if," write down:
1. **Which test number** you were on (e.g. "Test 6.9").
2. **URL** you were on.
3. **Which account/role** you were signed in as.
4. **Exact steps** you took, in order.
5. **What you expected** (quote the "✅ Correct if" line) **vs. what actually happened**.
6. A screenshot if it's something visual.

Bring these back and I'll dig into each one, fix what's broken, and explain anything that turns out to be
expected behavior rather than a bug.
