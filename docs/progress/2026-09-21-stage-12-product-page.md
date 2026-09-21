# Stage 12 (slice 3) — the product page, and the client's first real artwork

## What changed
- **Gallery** (`components/shop/ProductGallery.tsx`): thumbnails down the side (along the bottom on phones), previous/next, photo counter, keyboard arrows, swipe, and a full-screen zoom (Radix dialog). One photo → no thumbnail column; no photo → drawn gift box.
- **Buy box** (`ProductBuyBox.tsx`): discount chip computed from the real sale price, "inclusive of all taxes", stock warning, a "Personalise your gift" panel (occasion chips with icons, 150-character counter), quantity stepper, Add to cart / Buy now, and the delivery checker. Cart behaviour is unchanged (same Server Action, same stock rules).
- **Delivery checker** (`DeliveryChecker.tsx`, `lib/shop/delivery-actions.ts`, `delivery-estimate.ts`): a real serviceability check through `checkDelivery()` for the product's boutique. Rate-limited, validates the pincode, never reveals the warehouse pincode, remembers the last pincode in this browser only. Unknown ⇒ "We'll confirm at checkout" (fails open, like checkout). A date is shown only when the courier gives a sane day count.
- **Page** (`app/(shop)/products/[slug]/page.tsx`): breadcrumb, real-data badges, "Sold by" boutique card, benefits strip, tabs (About / Delivery & returns / Reviews) with panels rendered on the server, related products, the diary invitation band. Page title/description from the product (`generateMetadata`).

## Honesty rules followed (worth keeping)
No invented numbers (no "50K happy customers", no fake countdown or "only N people viewing"). Delivery charge, free-delivery threshold, gift-wrap price and the return window are read from `platform_settings`; gift wrap is shown only when the product allows it. Per-product wrapping tiles from the reference were NOT built — gift wrap exists only as an order-level option, so tiles would promise something checkout can't do.

## The client's artwork, first batch
`npm run images:sync` converted the delivered hero (desktop + mobile), mall map and four card images. Wired automatically by `lib/content/imagery.ts`; the code-drawn placeholders remain as fallbacks.
- `HomeHero`: works when only the mobile hero exists (phone picture + drawn atrium on desktop) and with both (a `<picture>`).
- Mall directory: hotspot positions (`IMAGE_POSITIONS`) re-measured against the real 1312×1199 map; the map's own cream backdrop is dissolved into the page with `.soft-edges` (a mask), and the centre column was widened.
- Fixed next/image warnings ("fill" inside a static parent) for the hero `<picture>` and card images.

## Verified
tsc, eslint, vitest (227), `next build` clean. Browser: PDP at desktop and 375px (no horizontal overflow), sticky gallery, delivery check round trip (Shiprocket not configured locally ⇒ "we'll confirm at checkout"), real hero on desktop and mobile, /mall hotspots on the real map. Scroll-reveal animations could not be observed in the test pane (hidden-tab throttling) — worth a look in a real browser.

## Still to do in Stage 12
Order tracking page, diary desk, cart/checkout polish, static pages (About/Contact/Privacy/Terms/Refunds — legal text needs the client), "My orders" list, theme scheduling + admin preview, swap remaining artwork (robin, logo, wraps, relationships) as delivered.
