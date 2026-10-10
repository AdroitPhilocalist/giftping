# Delivery speed options (Standard vs Express) — 10 Oct

## Why now

Gap #5 from the 1 Oct spec assessment (`docs/progress/2026-10-01-spec-gap-analysis.md`): the spec calls for Standard
vs Express delivery, but the project never had real Shiprocket credentials to build it against real differentiated
courier data — building it earlier would have meant either a made-up flat surcharge with no real speed difference
behind it, or guessing at API shapes against a mock. Real Shiprocket credentials now exist (see the 9 Oct Shiprocket
testing session) and the account genuinely returns multiple couriers with different rates and delivery times on many
real routes, confirmed live against the production Shiprocket API before writing any code (Delhi from the Jaipur
warehouse: 5 couriers, ₹93.72/3-day cheapest vs ₹112.22/2-day fastest; several single-courier routes correctly show
no upgrade at all).

## What "Standard" and "Express" actually mean

Shiprocket's serviceability response lists every courier it would consider for a route, each with its own
`estimated_delivery_days` and `rate`. Rather than inventing a surcharge disconnected from reality:

- **Standard** = the **cheapest** available courier's own ETA (the ordinary default — ordinary cost, whatever that courier's own speed happens to be).
- **Express** = the **fastest** available courier's ETA — offered as a real, selectable upgrade **only** when it's
  a genuinely different, strictly faster courier than Standard. A single-courier route, or a route where the
  cheapest already happens to be the fastest, shows no upgrade at all (there's nothing honest to sell).
- With no rate data at all (shouldn't happen on a real account, but defensively handled), the result degrades to
  the original single-tier behavior rather than guessing which courier is "cheap."

`lib/integrations/shiprocket-serviceability.ts` does this derivation; its own tests are pinned to real captured
shapes, extended to cover both the multi-courier and single-courier cases.

## What changed, end to end

- **Delivery check** (`lib/commerce/delivery.ts`, `serviceability_cache`): now caches and returns `standardEtdDays`/
  `expressEtdDays`/`expressCourierId` alongside the existing single `etdDays` (left untouched — the product-page
  delivery checker's existing promise is unaffected by any of this).
- **Checkout UI** (`components/shop/CheckoutForm.tsx`): a vendor whose route has a real Express option shows a
  Standard/Express radio pair with the real day counts and the surcharge; picking Express updates the displayed
  total instantly (the exact same "client previews, server re-verifies" pattern the gift-wrap fee already used —
  nothing here is ever trusted as a price). Switching address resets the selection (a different pincode might not
  offer the same upgrade).
- **Pricing** (`lib/commerce/totals.ts`): a new `expressSurcharge` setting (admin-editable later — seeded via
  migration at ₹99, same as `delivery_charge`/`gift_wrap_charge` already are: no generic settings-editor UI exists
  yet for any of these, a pre-existing gap, not a new one). Express costs the surcharge **even on an otherwise-free
  shipment** — a free-delivery threshold waives the ordinary fee, not the premium for going faster.
- **Server-side re-validation** (`lib/commerce/checkout-actions.ts`): the client's requested Express vendor ids are
  never trusted directly — `placeOrderAction` re-runs `checkDelivery()` fresh and only honours a vendor the FRESH
  check confirms genuinely has an Express option right now; anything else silently falls back to Standard.
- **Persistence**: a new `orders.delivery_speed jsonb` column (migration `20261010150000_delivery_speed_options.sql`)
  stores `{ "<vendorId>": { speed, courierId, etdDays } }` for every vendor shipment in the order. `place_order()`
  (the atomic SQL function) accepts and stores it; the express surcharge was already folded into `delivery_charge`
  before the call, so the existing `TOTALS_MISMATCH` consistency check needed no changes at all.
- **Booking** (`lib/vendor/dispatch.ts`, `assignAwb()`): if the customer paid for Express, the vendor's courier
  assignment call passes that preferred `courier_id` to Shiprocket. The preference was captured at checkout and may
  no longer be assignable by the time a vendor actually dispatches (days later) — a rejection falls back to
  Shiprocket's own auto-pick rather than blocking the booking, and the vendor sees a plain-language note if that
  happened.
- **Display**: the vendor's `/vendor/orders` list flags "Customer paid for Express delivery — please accept and
  dispatch promptly"; the customer's own order page shows an "Express" badge next to that vendor's shipment.
  `lib/db/vendor-portal.ts` deliberately never forwards the raw `delivery_speed` blob to a vendor's own page — only
  a single boolean for THAT vendor — since the column holds every vendor's choice on a multi-vendor order and RLS
  is row-level, not column-level (the same rule `vendor_private`/`order_item_financials` were split out for).

## Verified live, for real, against the real Shiprocket account

Signed in as `test-customer@giftping.test`, added a real address in Delhi (110001, a route independently confirmed
multi-courier beforehand), added a Lumière Keepsakes product (warehouse: Jaipur) to a cart that also had a
GiftPing Originals item. Checkout correctly showed "Standard — 3 days" / "Express — 2 days (+₹99)" for Lumière
Keepsakes only (GiftPing Originals' route has no real upgrade); selecting Express moved delivery from ₹79 → ₹178
and the total up by exactly ₹99. Placed the order for real (GP-100185) and queried the database directly:
`delivery_speed` held `{"<lumière-id>": {speed: "express", courierId: 6, etdDays: 2}, "<giftping-originals-id>":
{speed: "standard", courierId: null}}` and `delivery_charge` was exactly 178.00 — matching the UI exactly, with
genuinely real courier data behind every number. Cleaned up the test order and address afterward. 523/523 tests
(7 new), tsc/eslint/build all clean.

## Not verified

- **Actually booking a courier with the Express preference honoured** — same limitation noted in the 9 Oct
  Shiprocket session: a real "Book courier" click is refused by this environment's own safety classifier as a real
  outward-facing action. The `assignAwb(shipmentId, preferredCourierId)` code path and its fallback-on-rejection
  were written and type-checked carefully, but never exercised against the live API with a real shipment.
- The vendor-portal "Express" note and the customer order-page badge were written and tsc/lint-clean, but the order
  used to verify the checkout flow was an unpaid draft (payment can't be completed in this environment's Razorpay
  iframe) — the badges render from the same `delivery_speed` data confirmed correct in the database, but weren't
  visually confirmed on a live page (the shipment-tracking section only renders once an order has a real shipment,
  which needs a paid, dispatched order).
- The admin-editable settings UI for `express_delivery_surcharge` doesn't exist — same as `delivery_charge` and
  `gift_wrap_charge`, which have never had one either. Changing it today means a new migration row or a direct
  `platform_settings` update, not an admin screen.
