# Return shipment / reverse-pickup booking — 10 Oct

## Why now

Gap #6 from the 1 Oct spec assessment: approving a return never actually booked a pickup — `decideReturn()` just
told the customer "we'll arrange the pickup" and the refund flow processed independently of any courier ever
being involved. Blocked on the same root cause as the delivery-speed-options gap (#5): no real Shiprocket account
to build and test a real booking call against. Real credentials now exist.

## Design: admin-initiated, not vendor-initiated

`/vendor/returns` is deliberately read-only today ("You don't need to do anything here — it's so you can see what
was requested"). GiftPing (the platform) owns the customer relationship for returns, the same way admin — not the
vendor — already owns cancellations and refunds. So the new "Book pickup" action lives in `/admin/returns`, not
the vendor portal, mirroring that existing division of responsibility rather than introducing a new one.

## What it does

`lib/admin/return-dispatch.ts`'s `bookReturnPickup()` is the same resumable-saga shape as the forward
`bookShipment()` in `lib/vendor/dispatch.ts`: claim a `shipments` row (`is_return = true`) first, save each
Shiprocket id the moment it exists, a retry skips whatever's already done, and a total failure before anything
was created releases the claim.

- **Pickup** = the customer's own delivery address for that order (where the courier collects FROM).
- **Drop-off** = the vendor's registered warehouse (where it's delivered TO) — the exact reverse of how a forward
  shipment works.
- Uses a new `createShiprocketReturnOrder()` (`/orders/create/return`), built from Shiprocket's documented
  pickup/shipping field pattern — the same shape already confirmed real for the forward `/orders/create/adhoc`
  endpoint in this codebase, but this specific endpoint's exact field names have **not** been confirmed against a
  real response (see "Not verified" below).
- AWB assignment and the pickup request reuse the exact same `assignAwb()`/`generatePickup()` calls a forward
  shipment uses — these are generic Shiprocket shipment operations once a shipment exists, forward or reverse.
- Notifies the customer (pickup scheduled, with AWB/courier/tracking once available) and the vendor (informational
  only, matching how every other vendor-side return notification already works).

## A real gap found and fixed while building this

The Stage 8 shipment uniqueness guards (`shipments_one_live_per_vendor_order`, `shipments_awb_unique`) only ever
covered **forward** shipments (`is_return = false`) — nothing stopped two return-pickup rows being claimed for the
same order+vendor concurrently, and a return AWB wasn't protected by the global AWB-uniqueness index at all.
Migration `20261010160000_return_shipment_indexes.sql` extends both to cover return shipments too, same pattern as
the forward guards.

## Display

- `/admin/returns`: an approved return with no pickup booked yet shows a **Book pickup** button next to "Issue the
  refund →"; once booked, shows the AWB/courier instead.
- `/vendor/returns` (still read-only): shows "Pickup booked … it's on its way back to you" once GiftPing has
  booked one — the one piece of return-pickup status the vendor actually needs to know, without giving them an
  action to take.
- The customer's own order page (`app/(shop)/orders/[id]/page.tsx`): "Return approved — we'll arrange the pickup"
  becomes "Return approved — a courier from X is collecting it (AWB Y)" once real.

## Verified

tsc/eslint/vitest (523/523, 2 new assertions)/build all clean. Live-verified the UI path for real: signed in as
`test-admin@giftping.test`, confirmed `/admin/returns?status=approved` shows a working **Book pickup** button next
to both real approved returns already in the seed data (GP-100145 and GP-100142) — the exact data that proves the
query, the join, and the button's render condition are all correct.

## Not verified — deliberately stopped short, by your own choice

**The actual "Book pickup" click was never made.** Same category of action as the forward "Book courier" click
from the 9 Oct Shiprocket session — a real click would call Shiprocket's live `/orders/create/return` endpoint,
creating a genuine return order and requesting a real courier pickup from a real address. Asked first; you chose
to verify the UI leads up to it correctly and stop there. This means:

- `createShiprocketReturnOrder()`'s exact field names are unverified against a real Shiprocket response (built
  from the documented pattern, not a captured one, unlike every other Shiprocket call in this codebase).
- The fallback behaviour inside `bookReturnPickup()` (claim release on failure, the warning on a failed pickup
  request) has never run against a real failure from the live API.
- The vendor-side and customer-side "pickup booked" displays were written and tsc/lint-clean but never actually
  rendered with real data, since no real booking was made to produce it.

Doing the real click is a one-button test whenever you're ready: `/admin/returns?status=approved` → "Book pickup"
on either GP-100145 or GP-100142.
