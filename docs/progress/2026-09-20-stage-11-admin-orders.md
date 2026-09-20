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

## Slice 2 — coupons and dashboard (2026-09-20)

- **`/admin/coupons`**: list with a live status (active / paused / scheduled / expired / exhausted), plain-words description ("10% off, up to ₹1,000 on orders over ₹500"), usage (`3 / 100 used`), scope
  (boutique / category), create + edit dialog, pause/activate, delete. Dates are **IST calendar days** (a coupon runs 00:00 IST on its first day to 23:59:59 IST on its last). A used coupon's code is locked and it
  can't be deleted (pause it) so order history keeps its meaning. Runs on the admin's own session (RLS `is_admin`); the Server Actions re-check the DB role.
- **DB integrity (`20260920130000_coupon_hardening.sql`)**: format/range constraints (code `^[A-Z0-9_-]{3,30}$`, percentage ≤ 100, positive values, limits ≥ 1, end after start) and a trigger so **nobody — not a vendor editing
  their own coupon, not an admin session — can set or reset `used_count`** (only `place_order()`/`release_order_coupon()` can). Found because vendors may manage their own coupons and could otherwise reset usage to bypass the cap.
- **`/admin/dashboard`** (7/30/90 days): sales (GMV), average order value, platform commission, refunds, sales-by-day bars (IST days), top 5 products and boutiques (net of discounts), low stock, new sign-ups, and a
  **needs-attention** list (cancelled orders whose payment was never refunded, pending vendors/products, unpaid orders older than 48h). Aggregation is a pure tested function (`lib/admin/stats.ts`, 6 tests).
- Verified: 21 DB checks as admin/vendor/customer (constraints, counter protection, vendor sees only own coupons, customers can't list or create, checkout's `resolve_coupon` reads what the admin created and refuses it once
  paused); browser create/validation/pause/activate/delete; dashboard numbers matched an independent hand calculation on seeded orders (GMV ₹9,700, AOV ₹3,233.33, commission ₹400, 5 units, both rankings, low stock, stuck-refund alert).
- The OneSignal SDK is no longer loaded on `localhost` (it refuses to run outside the dashboard-configured site and only produced console errors).
- Not done: dashboard is limited to the latest 2,000 paid orders per period (shown when hit) — move to SQL views/materialised rollups if volume grows.

## Slice 3 — user management and DPDP account erasure (2026-09-20)

- **`anonymize_user()`** (SQL, service_role-only, idempotent; migration `20260920140000`): orders/payments can't be deleted (tax & accounting), so a person is **anonymised**. **Removed:** diary (people, dates, gifts, reminder history), addresses,
  wishlist, cart, reviews (rating rollup recomputes), Q&A questions, notifications and preferences, loyalty ledger. **Scrubbed:** users row (name, email → a non-deliverable `.invalid` address, phone, avatar, birth date, gender, referral/OneSignal ids),
  and every order's delivery address (kept only as city/state/pincode), gift message and notes. **Kept:** orders, items, payments, coupon redemptions. **Refused, changing nothing:** admin accounts, owners of a vendor profile, and
  customers with an order still in progress (a vendor needs the real address to deliver it).
- **Service** (`lib/admin/users.ts`): emails the person first (address is about to be scrubbed), anonymises, then **soft-deletes the Supabase Auth login** (blocks sign-in, keeps the row so foreign keys hold). Audit trail records who/what with **no personal data**.
- **Self-service**: "Delete my account" on `/account` (type `DELETE`; the account erased is always the signed-in one — no id from the client; admins excluded), then signed out and redirected with a confirmation notice.
- **Admin** `/admin/users` (search by name/email, role filter, paginated): **Suspend/Reinstate** (blocks sign-in at Auth level AND `users.is_active`, so the app treats them as signed out on the very next request) and **Erase data** (type `ERASE`, for a
  data-erasure request). Admins can't act on other admins or themselves. `getServerUser()` now returns null for suspended/erased accounts.
- **Verified**: 27 DB/Auth checks on a throwaway user with data in every table (refusals change nothing; erased data gone; delivered order kept with amounts intact and address scrubbed; login refused after soft-delete; anon and customers can't call it);
  browser: admin suspend → Supabase says "User is banned", reinstate, erase with the typed confirmation gate; self-service delete with the gate (lowercase `delete` rejected) → signed out → data erased → cannot sign in; audit rows have no personal data. Test accounts removed.
- **Not built:** a grace period/undo window before erasure, a data-export ("download my data") for DPDP access requests, role editing in the UI (roles only change through the vendor-approval flow, on purpose), erasing a vendor owner (must close the vendor first).
