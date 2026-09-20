# Stage 11 (slice 1) — Admin orders: oversight, cancellation and refunds

Date: 2026-09-20

## Status: built; cancellation/restock verified against the real DB; the refund SUCCESS path against real Razorpay still needs one real test payment

## What was built

- **`/admin/orders`** (search by order number, filter by status, paginated) and **`/admin/orders/[id]`** (customer, items with per-line commission and vendor payout, totals incl. GST and platform
  commission, delivery address, payments with refund ids/failure reasons, shipments with the courier timeline). Read with the **admin's own session** so RLS (`is_admin()`) is the enforcement.
- **Cancel & refund** (`lib/admin/orders.ts`, `cancelOrderAction`, admin-only checked against the DB role): reason required (the customer is told).
  Order of operations is deliberate — **1) `cancel_order_and_restock()` (atomic SQL) 2) THEN the Razorpay refund**. Refunding first could leave a refunded order a vendor still ships. If the refund
  fails, the order stays cancelled with the payment still `captured` and a `REFUND_FAILED` reason; the order page shows a red alert and a **Retry refund** button, and every step is idempotent.
- **`cancel_order_and_restock()`** (service_role only): row-locks the order; restores product **and variant** stock and `total_sold` for paid orders, cancels items and any un-picked shipment, releases the
  coupon use, closes pending payments; refuses when a courier is already booked (`shipment_booked`) or the order has shipped (`not_cancellable` — that's a return); safe to call twice (`already_cancelled`).
- Customer gets an in-app notice + **cancellation/refund email** (`buildOrderCancelledEmail`); vendors of a paid order are told not to ship. Audit-logged (`order.cancelled`, `order.cancelled_refund_failed`).

## Verification

- DB (17 checks): stock + `total_sold` restored exactly for a two-product order; variant stock restored; second cancel is a no-op (no double restock); refuses with a booked AWB and touches nothing, allows once
  that shipment is cancelled; shipped order refused; unpaid cancel doesn't restock, releases the coupon and closes the pending payment; anon and customers cannot call it.
- Browser as admin: list + filter; reason validation ("at least 5 characters"); unpaid order cancelled with the note saved; paid order with a fake payment id → order cancelled, stock restored, Razorpay refused the
  refund (404), payment left `captured` + `REFUND_FAILED`, audit row written, clear alert + Retry refund shown.
- `lint`, `tsc`, 120 unit tests, `npm run build` clean; test orders/coupon/audit rows removed, stock reset.
- **Not yet observed:** a refund that SUCCEEDS at Razorpay. Needs one real test payment, then Cancel & refund in the admin UI (Razorpay test refunds are instant). The refund call itself is the same one already exercised against the
  mock in Stage 7 and its request shape matches Razorpay's docs.

## Still to do in Stage 11
Coupons UI (create/edit/deactivate, usage), dashboard KPIs (orders, GMV, AOV, commission earned, stale unpaid, low stock), user management + DPDP deletion/anonymisation, homepage banners, vendor management extras
(commission override, support phone capture, suspend/reinstate), vendor settlements report, returns (post-delivery refunds, partial refunds), vendor logo/banner + CSV product upload.
