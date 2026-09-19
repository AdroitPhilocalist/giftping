# Stage 6 — Checkout (pre-payment)

Date: 2026-09-19

## What was built

- **Address book**: `/account/addresses` and the picker inside checkout (add / edit / delete / set default, up to 10, India-only,
  state list, 6-digit pincode, 10-digit mobile normalised from `+91 …` / `0…` formats).
- **`/checkout`** (auth-gated): delivery address → gift options (gift wrap fee + card message) → review items grouped by vendor,
  coupon box, live order summary. "Continue to payment" creates the order and lands on **`/orders/[id]`** (RLS-scoped order page;
  shows "Awaiting payment" until Stage 7).
- **Server-authoritative pricing.** `lib/commerce/checkout.ts` rebuilds every price, stock check, GST rate, commission rate, coupon
  rule and delivery setting from the database at request time. The request carries only: address id, gift wrap flag, gift message,
  idempotency key. `cart_items.unit_price_snapshot` is never read.
- **`place_order()`** (SQL, service_role-only, one transaction): idempotency → lock the shopper → supersede their unpaid drafts (returning
  coupon uses) → stock re-check under `FOR SHARE` → race-safe coupon consumption → insert order / items / financials → cross-check that
  lines sum to the subtotal and `subtotal − discount + delivery + wrap = total`, else `TOTALS_MISMATCH` and everything rolls back.
- **`resolve_coupon()`** (SQL, service_role-only): validity window, usage cap, per-user cap. Scope (vendor/category), minimum-order and
  the maths live in pure, tested TS (`lib/commerce/totals.ts`). The user's own unpaid drafts don't count against limits.

## Money rules (decided here, documented in `totals.ts`)

- **Listed prices are GST-inclusive.** GST is extracted (`net × r/(100+r)`), never added. Stored per line (`gst_rate`, `gst_amount`,
  `hsn_code`) and per order (`orders.gst_amount`). Delivery/gift-wrap are also treated as inclusive and not broken out.
- **Coupon**: applies to eligible lines (its vendor and/or category, else all); minimum order is judged on the eligible subtotal;
  capped by `max_discount_amount`; allocated to lines in whole paise by largest remainder so parts always sum to the whole.
- **Who funds a coupon**: vendor-scoped coupon ⇒ vendor-funded (commission base + payout shrink); platform-wide ⇒ platform-funded
  (commission on the full price, vendor paid as if no coupon).
- **Delivery**: flat ₹79 per *vendor shipment* unless that shipment's post-discount value ≥ ₹999. Gift wrap ₹49 per order.
  All three are `platform_settings` rows (`delivery_charge`, `free_delivery_threshold`, `gift_wrap_charge`) — editable in Stage 11.
- `formatCurrency` now shows paise when present (₹679.80) so totals never silently round.

## Security findings and fixes

1. **Customers could read the platform's margin.** `order_items` has a customer SELECT policy and RLS is row-level, so
   `commission_rate` / `commission_amount` / `vendor_payout` were readable by the buyer. Moved to **`order_item_financials`**
   (vendor-own + admin SELECT, service-role writes) — the same lesson as `vendor_private` in Stage 4. No orders existed, so the
   columns were dropped, not migrated.
2. **New functions are executable by `anon`/`authenticated` by default** (`alter default privileges … grant execute` in the Stage 1
   grants migration). Every new function must `revoke all … from public, anon, authenticated` then grant to `service_role`.
   Both new functions do; verified anon/customer calls fail.
3. Address rules enforced in the DB, not just the form: format CHECKs, one default per user (partial unique index + trigger), max 10.

## Verification

- **DB, as real users**: anon/customer can't call `place_order`/`resolve_coupon` or insert orders; tampered total / subtotal ≠ sum of lines /
  quantity above stock all rejected with nothing left behind; idempotency key returns the same order and no duplicate; customer can't read
  financials but can read own order items; unrelated user can't read the order; coupon case-insensitive, expired, exhausted, per-user;
  own draft doesn't block the coupon; re-placing supersedes the old draft and `used_count` stays 1; an exhausted coupon is refused at
  placement. Addresses: default/limit/format/cross-user tests.
- **Browser (the "done when" test)**: set both cart `unit_price_snapshot`s to ₹1 via the API as the customer, then placed the order — the
  server total was exactly ₹6,167.20 (6,798 − 679.80 coupon + 49 wrap, free delivery). Commission 0% on the in-house item, 10% on the
  partner's; platform-funded discount left vendor payouts untouched. Validation messages, coupon errors (expired / bogus / bad characters),
  vendor-scoped coupon hitting only that vendor's line, gift wrap toggle, second placement superseding the first, 375px layout, signed-out
  redirects for `/checkout`, `/orders/…`, `/account/addresses`.
- `lint`, `tsc`, 50 unit tests, `npm run build` clean.

## Deferred / hand-offs to later stages

- **Stage 7 must decrement stock atomically on payment capture** (checkout only *checks* stock; nothing is reserved), clear the cart, and
  move `created` → `payment_*`. It also needs a job (Stage 9 cron) to cancel stale `created` orders (e.g. > 24h) and release their coupon
  use — today only the shopper's next checkout does that.
- Real pincode serviceability and shipping-cost quotes: Stage 8 (delivery is a flat placeholder now).
- `order_items.variant_ids` exists (mirrors the cart); `variant_id` = first.
- Coupon creation UI: Stage 11 (coupons were inserted directly for testing and deleted afterwards).
- Saved-for-later, guest checkout (checkout requires an account by design), order history list (`/account/orders`) — not built.
