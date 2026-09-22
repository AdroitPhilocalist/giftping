# Stage 12 (slice 9) — the robin as a mascot, and the cart as a basket

Client brief (relayed by the developer): the robin should feel like a character woven through the site,
not just decorative art — with real moments for it during checkout/payment, and the cart should feel like
an actual gift basket the shopper is filling, not a plain list. Built the requested examples plus a few
more, kept every one gated behind `prefers-reduced-motion` and reversible.

## Built

- **The robin as the cursor** (`components/motion/RobinCursor.tsx`). Replaces the system pointer with the
  client's own `robin-perched` artwork (falls back to a small drawn silhouette if that art is ever
  missing), facing the direction of travel, growing slightly over anything clickable so it keeps the
  affordance a normal `cursor: pointer` gives. Only activates when JS confirms a fine pointer (never on
  touch) and the visitor hasn't asked for reduced motion; text fields always keep the native caret cursor.
  One line in `app/layout.tsx` — trivial to remove if the client tries it live and doesn't like it.
- **"Add to cart" → the robin plants it in the basket** (`components/motion/CartFlyLayer.tsx`). A small
  gift arcs from wherever the Add to Cart button was clicked to the cart icon (the one that's actually
  visible — bottom tab bar on phones, header icon on desktop), then the cart icon gives a little bounce.
  Triggered by `ProductBuyBox.tsx` with a plain `window` event, since the button and the cart icon are on
  opposite sides of the component tree and a full context wiring wasn't worth it for a one-shot visual
  effect React itself never needs to know happened.
- **Payment confirmed → the robin celebrates** (`components/orders/OrderCelebration.tsx`). The client's own
  example, built at the exact moment it means something: not when a draft order is placed (it still needs
  paying), but when `PayNowButton.tsx`'s Razorpay callback actually confirms the payment. The robin (on-gift
  pose) pops up with a small burst of the site's own copper diamond ornament — the same shape as
  `OrnamentDivider`, not generic confetti — and fades itself out after ~2.5s.
- **The cart is a basket, not a list** (`components/art/BasketArt.tsx`, `app/(shop)/cart/page.tsx`). A
  woven basket drawn in code (theme tokens throughout, reuses the existing `GiftBoxShape` for the gifts
  peeking over the rim, exactly like `AtriumScene` already does for the homepage hero). Sits beside the
  page heading when the basket has something in it; in the empty state the robin peeks over an empty one
  ("Nothing planted in it yet…"). The item cards themselves now sit on a faint woven-crosshatch background
  (`.basket-weave` in `globals.css`, the same trick as the diary's `.paper` ruled-lines background) instead
  of a flat card.

## Considered, not built (kept for later — noted so nothing looks forgotten)

- **Literal drag-and-drop "planting" a gift into the basket** — the client's own phrasing suggested this,
  but a real drag interaction is a much bigger, riskier build (touch support, accessibility, a fallback for
  keyboard users) for a purely decorative payoff the fly-animation already delivers more simply. Worth
  revisiting only if the client specifically asks for the literal drag gesture after seeing the current
  version.
- **A robin that flies along the scroll bar / page progress on long pages** — tasteful idea, genuinely
  extra scope, not built.
- **The notification bell gets a robin-peek when something new arrives** — small, cheap, on-brand; skipped
  this round only to keep this slice shippable and well-tested rather than open-ended.
- **The same fly-to-icon treatment for "Add to wishlist"** — the mechanism (`CartFlyLayer`'s event pattern)
  would work unchanged for a `WishlistFlyLayer`; not built because the client's examples were about cart
  and payment specifically.

## Verified

tsc, eslint, vitest (254, unchanged — none of this touched tested logic), `next build`. Browser, fresh tab,
zero console errors: cursor activation confirmed via DOM inspection (`pointer:fine` true, reduced-motion
false in the test browser → cursor correctly attached, real `robin-perched.webp` art, position tracks the
mouse) — a literal screenshot of a mouse-following element is inherently awkward to capture with scripted
automation, so please move your own mouse over the live site to see it. The cart-fly event, the cart-icon
bounce and its cleanup, and the basket-themed cart (empty and filled) were all confirmed visually. The
payment-confirmation celebration was confirmed visually via a temporary local page that dispatched the same
event `PayNowButton` fires on a real successful payment (removed after) — a real end-to-end payment wasn't
available to trigger it directly.
