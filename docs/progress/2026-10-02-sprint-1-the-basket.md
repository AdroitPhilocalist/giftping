# Sprint 1 — "The Basket" (ideas A1, A2, A5, A6)

From `docs/ideas/DELIGHT_AND_FEATURE_IDEAS.md`. The client's idea: the cart should feel like a real basket the shopper is putting gifts into, not a plain list.

## What changed for the shopper
- **A1 — the basket holds your real items.** The basket on `/cart` draws each product's own photo as a small card tucked over the woven rim (newest on the right), with a quantity badge when it's more than one, "+N" past five items, and a stand-in gift box for a product with no photo. Photos drop in when the page opens; adding something drops the new one in and the whole basket jiggles.
- **A2 — mini-basket in the header.** The header cart icon (and the phone tab-bar icon) is now a woven basket. With a mouse on a desktop screen, hovering it — and automatically for a few seconds after *Add to cart* — opens a small basket under it: photos, names, quantities, prices, the free-delivery ribbon, View basket / Checkout. Touch devices and keyboard users get the plain link; the product page keeps its "Added" toast there.
- **A6 — free-delivery ribbon.** The old progress bar is a gift ribbon filling up with a bow at its tip; when delivery unlocks the bow "ties". Used per boutique on the cart page and as one summary line in the mini-basket (the boutique closest to unlocking).
- **A5 — the "unwrap".** After a confirmed payment a gift box pops in, the lid lifts off, the celebrating robin hops up, sparks burst and a caption appears; it dims the page gently and never blocks it. The diary's "gift given" keeps the older quick pop. Under reduced motion the scene is skipped and only the screen-reader announcement is made.

## Design decisions
- **Pure logic, tested** (`lib/shop/basket.ts`, 23 tests): which items show and where (newest kept when there are too many), the free-delivery nudge (boutique closest to unlocking; never "100%" while something is missing), the mini-basket payload (no personalisation text or other cart detail can leak into it), the provisional "just added" basket, and stable per-line keys.
- **On-demand data, not every page.** The mini-basket reads `GET /api/cart/mini` only when opened (the header still only fetches a cheap count). It is the visitor's own cart (session or the httpOnly guest cookie), rate-limited, never cached.
- **Instant feedback regardless of latency.** In this dev setup the call takes ~1.4–2 s (remote database); production should be much faster but that is unproven. So the add event now carries the added item (name, photo, price) and the panel shows it immediately, with "Updating your basket…" until the real cart arrives. The provisional line and the real one share a **display key** (product slug + occurrence), so the photo does not drop in twice. The auto-close countdown starts only after the real data has loaded, and only genuine pointer *movement* over the panel keeps it open — a pointer merely sitting where the panel appeared (under the Add button) must not.
- **Photos via `/_next/image?w=128`.** An SVG `<image>` can't use `next/image`; the optimiser URL serves ~3–4 KB tiles instead of the 800px renditions.
- **Portal** for the panel, so no header clipping or stacking context can cut it off.
- **State without effects:** `LiveBasket` detects added items by comparing keys during render (React's "adjust state when props change" pattern); the jiggle restarts via a class toggle + reflow (plain DOM, like the cart-icon bounce).
- **Animation on an inner element**, never the one carrying a placement `transform` (the CSS gotcha in CLAUDE.md). All colours are theme tokens; the global reduced-motion rule collapses every duration.
- **Wording unchanged.** An accidental half-rename (tab/label "Basket" vs the rest "Cart") was reverted; whether the site should say "Basket" everywhere is a client decision.
- **`BasketArt` split** into `BasketWeaveDefs`/`BasketHandle`/`BasketBody` so photos sit between the back and front layers; `BasketArt` itself renders exactly as before (the empty-cart state).

## Verified (running app, real database; test cart cleared afterwards)
Add→fly→panel sequence and timings (panel ~0.65 s after click; no toast on desktop); provisional item shown at once, real totals replace it with no second drop; auto-close 4.5 s after load; hover path with real data and ribbon; cart page with four real items (all four images 200 from the optimiser, ~3–4 KB); live re-layout as items were removed (4→1) and the ribbon going unlocked → 90% "Add ₹100 more" → 100% when quantity was raised, with jiggle, quantity badge and bow-tie all firing; empty state; phone layout (basket, new icons, ribbon); the unwrap scene driven through the real window event on a real order page and inspected at 2.4 s (box, risen robin, lid gone, caption). 431/431 tests, tsc, eslint, build.

## Not verified
A real phone (speed, touch feel); a real payment triggering the unwrap (the same `gp:payment-confirmed` event `PayNowButton` fires was dispatched); the reduced-motion path (coded, not exercised); production latency of `/api/cart/mini`; a screen reader on the mini-basket (it is a non-modal `role="dialog"`; the icon link remains the accessible route to the full cart).

## Not done from the sprint
**A8** (wishlist heart burst + "move to basket") — small, still available in the ideas menu.
