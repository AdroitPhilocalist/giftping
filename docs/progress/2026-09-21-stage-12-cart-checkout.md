# Stage 12 (slice 5) — cart and checkout polish

Visual only: no change to cart, pricing, coupon, delivery-check or order-placement logic (server still recomputes everything).

- **Cart**: "Your basket / Your Cart · N items" header with a Cart → Delivery & gift → Payment step trail (`CheckoutSteps`), boutique cards, a per-boutique **free-delivery progress bar** (`FreeDeliveryNudge`, uses the real `free_delivery_threshold` — delivery is free per boutique shipment once its value reaches it), roomier line items, an order summary with `BuyAssurances` (secure payment, the configured N-day return window, gift wrap/personal note — only claims the site keeps), and a robin empty state with two ways forward.
- **Checkout**: same step trail, numbered section medallions, gift-wrap as a selectable card, message counter (250), summary with "you won't be charged yet", the same assurances. Card radii normalised to the theme token.
- **Not verified in a browser**: `/checkout` needs a signed-in session (I don't type passwords). The cart was verified at desktop and 375px (guest cart with a real product, no horizontal overflow); checkout compiles, lints and builds.
- **Artwork**: `wrap-green` and `wrap-blush` have been delivered but are deliberately NOT used yet — gift wrap is a single per-order fee with no style choice in the schema/vendor flow, so showing swatches would promise a choice we can't fulfil. If the client wants wrap styles, it needs a `gift_wrap_style` on the order, a line on the vendor's order view, and per-style pricing decisions.
