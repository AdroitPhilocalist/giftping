# Stage 8 — Delivery (Shiprocket)

Date: 2026-09-19

## Status: built and verified against a local mock — NOT yet against real Shiprocket

Shiprocket credentials were not available (`SHIPROCKET_*` still empty in `.env.local`). Everything was built and tested end-to-end against
a throw-away mock server that mimics the documented endpoints, driven through the real UI (customer checkout, vendor portal, customer order
page) and signed/tokened requests to the real webhook route. **Not observed with a real account**: real response shapes, pickup-location
onboarding rules (Shiprocket may require phone/OTP verification of a new pickup address), courier auto-selection, the real tracking webhook's
payload and its exact status strings. Request/response field names were written from Shiprocket's public docs — do "First real test" below.

## What was built

- **Serviceability at checkout** (`lib/commerce/delivery.ts`): for each vendor, pickup pincode (vendor warehouse) → delivery pincode via Shiprocket,
  cached 24h in `serviceability_cache`. Shows a per-vendor ETA on the address step, **blocks** checkout when a vendor definitely can't deliver, and the
  same check runs server-side in `placeOrderAction` (verified by invoking the handler with the button force-enabled — the server refused, no order created).
  **Deliberate design choice: the delivery *charge* stays the Stage 6 flat-per-vendor-shipment with a free threshold**; Shiprocket only gates + ETAs.
  Live per-courier rates would make totals wobble and add an API call to every render. Revisit if courier cost outruns the delivery charge.
  It **fails open**: not configured / no warehouse pincode / API down ⇒ "unknown" ⇒ allowed (an undeliverable order surfaces at dispatch instead).
  Only a definite "no courier serves this route" blocks.
- **Vendor order management** (`/vendor/orders`): paid orders only (Stage 7 RLS), showing that vendor's items, the ship-to address, gift wrap/card
  instructions and their earnings. **Accept** → **Book courier** (weight prefilled from product weights, editable package dims) →
  courier + AWB + tracking link shown. Server actions re-derive the vendor from the session; every query is scoped to that vendor.
- **Booking saga** (`lib/vendor/dispatch.ts`): claim a `shipments` row (partial unique index: one live shipment per vendor per order) → register the
  vendor's warehouse as a Shiprocket pickup location once (`vendor_private.shiprocket_pickup_location`) → create the Shiprocket order → assign AWB →
  request pickup (best effort, warns if it fails). **Resumable**: ids are saved as soon as received; a retry after an AWB failure did NOT create a second
  Shiprocket order (mock saw create ×1, assign ×2); a failure before anything was created frees the claim (no orphan row).
- **Token handling**: JWT cached in `integration_tokens` (shared across serverless instances), single-flight login per instance, and a 401 reuses a
  token another request already refreshed before logging in again. Verified: one login for parallel lookups; an expired token → one 401, one login, success.
- **Tracking webhook** `POST /api/webhooks/courier-tracking` (path avoids "shiprocket"/"kartrocket"/"sr"/"kr", which Shiprocket's webhook settings reject):
  authenticates the `x-api-key` header in constant time (unset secret validates nothing), parses defensively (`shiprocket-webhook.ts`), claims a dedupe key in
  `webhook_events`, and applies the update via **`apply_shipment_update()`** — atomic, idempotent (timeline events dedupe) and **monotonic** (couriers send events
  late/out of order: a status only moves forward; delivered/cancelled are terminal; RTO sticks). Also syncs `order_items.fulfilment_status` and notifies the customer
  on picked up / out for delivery / delivered / returning (once, even under concurrent deliveries).
- **Customer tracking** on `/orders/[id]`: per-vendor "Awaiting the vendor → Being packed → Courier booked → … → Delivered", courier + AWB + link, ETA, and a scan
  timeline (`shipment_events`, newest first; scans after the delivery scan are hidden).
- **Multi-vendor order status fixed** (`recompute_order_status`): the Stage 1 trigger only counted vendors that already had a shipment row, so once vendor A
  shipped and B hadn't booked, the whole order read "shipped". A vendor with no live shipment now counts as pending → `partially_shipped` / `partially_delivered`
  until every vendor completes. Verified with a two-vendor order end to end.

## Verification

- Checkout: Kochi → per-vendor ETA ("about 3 days"); Delhi (mock: unserviceable) → both vendors flagged, button disabled, **server refuses** with a clear message; cache written.
- Vendor (browser): sees only their own item + earnings (₹3,869.10 = ₹4,299 − 10%); Accept → Book courier → "Courier booked · Delhivery Surface · AWB …"; the mock received the
  pickup location, the order (buyer name/address/phone/email, item tax + HSN, IST order date, package dims) and the AWB + pickup requests on a single login.
- Failure paths: AWB assignment failure → clear message, row kept with its Shiprocket id, retry resumed without re-creating; create failure → row released.
- Webhook (32 assertions): no/wrong/empty token → 401; test-ping (no AWB) → ignored; unknown AWB → 200 no-op; IN TRANSIT → order `partially_shipped` (other vendor unbooked);
  late older PICKED UP doesn't regress but is recorded; replay = duplicate; 6 concurrent identical deliveries → exactly one applied and one notification; DELIVERED sets
  `delivered_at`, terminal against later IN TRANSIT/RTO; items → delivered; order `partially_delivered` → `delivered` when the second vendor delivers; notifications;
  RLS: customer can read own timeline, anon can't read shipments/events or call `apply_shipment_update`, customer can't write events/shipments.
- With no config, the webhook rejects everything (401). `lint`, `tsc`, 69 unit tests, `npm run build` clean. Test data reset; `.env.local` restored (Razorpay + Shiprocket empty).

## First real test (needs the developer)

1. Shiprocket account (Lite / pay-as-you-go plan per the cost constraint). Create a dedicated **API user** (Settings → API → Configure → Create an API User);
   put its email/password in `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD`.
2. Settings → API → Webhooks: URL `https://<public-host>/api/webhooks/courier-tracking` (tunnel for local dev), token = the same value as `SHIPROCKET_WEBHOOK_SECRET`.
3. Give a test vendor a warehouse address + a 10-digit **support phone** (needed to register the pickup location), pay for an order, Accept → Book courier.
   Watch for: pickup-location verification requirements, the AWB assignment response, and a real tracking webhook.
4. Compare a real webhook body with `parseTrackingPayload` (`lib/integrations/shiprocket-webhook.ts`) and the real status strings with `shiprocket-status.ts` —
   unmapped statuses are recorded on the timeline but leave the shipment status alone (safe, but you'd want them mapped).

## Deferred / hand-offs

- Live courier rate quotes / choosing a courier by price, COD (prepaid-only for now), returns & reverse pickup (`shipments.is_return` exists), NDR handling,
  label/manifest PDF download for vendors, bulk dispatch — not built.
- Vendor "cancel shipment" and customer order cancellation → Stage 11.
- Vendor settlement (paying vendors) still manual — payout data is in `order_item_financials`; a settlement job should run after `delivered_at` + return window (Stage 11).
- Vendor profile should collect a support phone at registration (needed for the pickup location); today the booking asks the vendor to add one if missing.
- Serviceability cache ignores weight (rarely matters for parcels); very heavy items could differ.
- Shiprocket transaction cost is per shipment (courier freight, recovered via the delivery charge) — not part of the fixed API budget, as noted in CLAUDE.md.
