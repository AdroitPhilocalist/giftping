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

## Slice 4 — vendor controls and the payout ledger (2026-09-20)

Migration `20260920150000_vendor_controls_and_payouts.sql`.

- **Suspend / reinstate a boutique** (`/admin/vendors`, reason required to suspend, vendor notified by in-app + email, audit-logged). Until now a suspended vendor's products stayed public and only checkout refused them.
  The products SELECT policy now also requires `vendor_is_approved(vendor_id)`, so a suspended boutique disappears from the storefront, search and categories (product + vendor pages 404) while its owner and admins still see it. A suspended
  vendor who opens the portal lands on a "Your boutique is paused" page.
- **Commission override** per vendor (0–100, blank = use category/platform default). Applies to **future orders only**: commission is snapshotted per line in `order_item_financials` at order time.
- **Vendor settings** (`/vendor/settings`): storefront profile, support email/phone, pickup address. Changing the warehouse address clears the registered Shiprocket pickup location so the next booking re-registers it (names now carry a random suffix so
  re-registration isn't refused as a duplicate). **A vendor can no longer set `shiprocket_pickup_location` themselves** (guard trigger) — they could otherwise have pointed it at another vendor's warehouse.
- **Payout ledger.** Every delivered line is settled **exactly once** (`order_item_financials.settlement_id`, null = unsettled) and only after `platform_settings.payout_hold_days` (default 7) from delivery. Cancelled/refunded orders never appear.
  All money functions are service_role-only, atomic, row-locked: `create_settlement` (locks the vendor row so two admins clicking at once can't double-settle), `mark_settlement_paid` (UTR ≥ 4 chars, idempotent), `void_settlement` (refuses once settled —
  reverse with an adjustment, never a void), `payout_overview`, `settlement_items_all`. Nothing is paid automatically: admin creates a settlement, pays by bank transfer, records the UTR, and the vendor is notified.
- **Admin UI** `/admin/settlements` (per-vendor payable / in-hold / settled, history) + `/admin/settlements/[id]` (lines, CSV, mark paid, void). **Bank details** are decrypted only through an explicit "Reveal" that is audit-logged
  (`vendor.bank_details_revealed`). **CSV export** (`/api/settlements/[id]/csv`) is read with the caller's own session (RLS decides; 401 signed-out, 404 otherwise), neutralises spreadsheet formula injection, adds a TOTAL row and IST delivery dates.
- **Vendor** `/vendor/payouts`: what's payable, what's still in the hold window (with the date each becomes payable), and settlement history with UTRs.
- **Verified**: 33 DB checks as anon/customer/vendor/admin (guard triggers, exactly-once settlement, hold window, concurrent create, void/paid state rules, storefront hiding); browser: create settlement (₹5,669.10 across 2 due lines, ₹900 still in hold), bank reveal,
  short UTR rejected, mark paid, CSV content and formula-safety, vendor payouts + settings pages, commission validation (150 rejected, 12.5 saved), suspend-needs-reason, storefront hides then restores the boutique. 144 unit tests, lint, tsc, build clean. Test data removed afterwards.
- **Not built / decisions needed:** marketplace **TCS (GST) / TDS (194-O)** deductions on payouts and a GST invoice for the commission — needs the client's accountant; Razorpay Route automatic splits (manual settlement is the current model);
  clawback of already-settled payouts when a post-delivery refund happens (comes with the returns slice); paid orders whose vendor is suspended before shipping don't yet surface in the dashboard "needs attention".

## Slice 5 — returns and partial refunds (2026-09-20)

Migrations `20260920160000_returns_and_refunds.sql`, `…160100_erasure_covers_returns.sql`, `…160200_settlement_line_snapshot.sql`.

- **Customer**: on `/orders/[id]`, a delivered line inside the return window (`platform_settings.return_window_days`, default 7, counted from the delivery scan) shows "Return or report a problem" (units, reason, note). One live request per line; the customer can cancel while it's still `requested`; they see approval/rejection (with our note) and refunds on the line.
- **Admin**: `/admin/returns` (queue by status; refunds that didn't finish are pinned at the top with Retry) and, on the order page, per-line **Refund…** (amount pre-filled with the proportional share, units coming back, optional restock, a live preview of the boutique impact) plus a Returns & refunds section. Admin decides returns (approve / reject-with-reason); a refund can also be issued with no return (goodwill, partial). Vendors get a read-only `/vendor/returns`.
- **Money flow (same principle as cancellation — reserve, then gateway, then apply):** `begin_refund` row-locks the order and RESERVES the amount (a pending refund counts against the line's cap, so concurrent refunds can't exceed what was paid — verified with 3 simultaneous attempts: exactly one wins) → Razorpay partial refund tagged `notes.gp_refund_id` → `complete_refund` applies everything atomically and idempotently. A gateway failure leaves a `failed` row that Retry re-checks; a *lost reply* (gateway refunded, we saw an error) is recovered because Retry first looks the tag up at the gateway, so **it can never refund twice** (verified against a mock that records the refund then answers 500).
- **Caps**: a line can never be refunded above what the customer paid for it (price × qty − its coupon share). Delivery / gift-wrap charges are only returned by cancelling the whole order before it ships. When the refunded total reaches the payment amount the payment flips to `refunded`.
- **Vendor and platform effect** (`refundShare`, cumulative so partial refunds sum exactly to the whole): commission and vendor payout on the line shrink in the refund's proportion. Unsettled lines just get smaller (`settlement_items_all` nets `refunded_payout`). A line **already in a settlement** produces a `vendor_adjustments` debit that is netted off the vendor's next payout; if the debit exceeds the next payout it carries forward (`debits_exceed`, nothing is paid). Statements show the amounts as settled (snapshotted in `settled_payout/settled_commission`), with refund deductions as separate rows, so a statement's lines always add up to what was paid.
- **Bug caught while testing the design:** voiding a settlement after one of its lines was refunded would have deducted that refund twice (line back in the pool already reduced, debit still open). `void_settlement` now drops the line's own open debits, and refuses (`debit_in_other_settlement`) if one was already netted into another payout.
- **Privacy**: return notes are free text → scrubbed by `anonymize_user`, which now also refuses while a return/refund is open. Customers and vendors can only READ their own rows; there are no client write policies on `return_requests`, `refunds`, `vendor_adjustments`; every function is service_role-only.
- **Dashboard**: refunded total now includes line refunds, top products/boutiques and commission are net of refunds, and "needs attention" flags waiting returns and refunds that didn't finish.
- **Verified**: 74 + 12 + 5 DB checks as anon / customer / vendor / admin / stranger (caps, reservation race, retry, restock, exact reversal, debits, void rules, RLS, erasure) plus browser flows with a local mock gateway (customer request → admin approve → refund with gateway down → lost-reply retry → exactly one gateway refund → applied; debit visible to the vendor; statement + CSV reconcile; dashboard numbers hand-checked). 160 unit tests, lint, tsc, build clean. Test data removed.
- **Not verified against the real Razorpay**: partial refunds and the `GET /payments/:id/refunds` tag lookup (mock only; full refunds were verified for real earlier). First real test: pay a small order, mark it delivered, refund part of a line and confirm one Razorpay refund with `gp_refund_id` in its notes.
- **Not built:** reverse pickup with Shiprocket (approval tells the customer we'll arrange it; the admin coordinates by hand), photo evidence on requests, refund to store credit, customer-visible refund timeline beyond the line, GST credit notes for refunds (needs the accountant, with TCS/TDS).

## OneSignal real-browser test (2026-09-20)

- Google sign-in on the live site initially bounced to `localhost:3000/?code=…`: Supabase's **Site URL / Redirect URLs** still pointed at localhost. Fixed in the Supabase dashboard (Site URL = the Vercel URL; redirect allow-list has the Vercel URL and `http://localhost:3000/**`). A landing on `/?code=` instead of `/auth/callback?code=` is the tell-tale sign of a redirect that isn't on the allow-list.
- Safari: "Turn on push" → browser permission → OneSignal shows a `SafariPush` subscription, enabled, with `external_id` = the GiftPing user id. A direct REST push and a real production run of `/api/cron/diary-reminders` (temporary diary event, then removed) both arrived; the run reported `pushSent: 1` and the immediate re-run `duplicatesSkipped: 1`.
- Email in that run was skipped (Resend test mode only delivers to the account owner until a domain is verified) — expected.
- Not covered: Chrome/Edge/Firefox (different push services), Brave (needs "Use Google services for push messaging"), mobile browsers.


## Slice 6 — homepage banners (2026-09-21)

Migration `20260921100000_homepage_banners.sql`.

- **Admin `/admin/banners`**: create/edit/pause/delete, reorder (↑/↓), image upload with live preview, headline / sub-heading / button text / link, picture description (accessibility; falls back to the headline), audience (everyone / shoppers / vendors only), and an optional start and end date in **IST calendar days** (same convention as coupons — a banner appears and disappears by itself). Status badge: live / scheduled / expired / paused.
- **Homepage**: a carousel above the welcome hero (`components/shop/HeroBanners.tsx`): cross-fade, autoplay every 6s that pauses on hover/focus and is off for `prefers-reduced-motion`, dots + arrows, hidden slides out of tab order and the accessibility tree, first image `priority`, `next/image` from Supabase Storage. No banners ⇒ nothing renders and the usual welcome section stays; a banner query failure can never break the homepage.
- **Images**: public `site-banners` bucket with NO client write policies — the only write path is `POST /api/admin/upload-banner` (admin-only, rate-limited): sharp validates the real bytes, EXIF-rotates, requires ≥1200px wide and a wide shape (ratio 1.3–3.2; 16:7 / 1920×840 ideal), strips metadata and stores WebP at 2000px and 1000px. The form only ever sends back the server-generated path (`banners/<uuid>-full.webp`); the save action re-validates the pattern, confirms the files exist, and builds the URLs itself — so a banner can never point at an arbitrary image. One upload belongs to one banner; replacing an image or deleting a banner removes the files (verified: zero orphans).
- **Security fixes found on the way**: (1) the Stage 1 policy let anyone read any `is_active` banner through the API, which would leak an upcoming sale's image and copy before its start date — public read is now "live right now" (active AND inside its window), admins still see everything; (2) the link is rendered into an `href`, so it is restricted to a path on this site or an `https://` URL at three layers (form schema, server action, and a database CHECK) — `javascript:`, `data:`, `//host`, `http://`, whitespace and backslashes are all refused. External links open with `rel="noopener noreferrer"`.
- **Pure, tested rules** (`lib/content/banners.ts`, 12 tests): status by date window, audience matching (guests see shopper banners; vendor-only banners reach only vendors), ordering with stable ties, `safeCtaUrl`.
- **Verified**: 23 database checks (anon/customer/vendor see only live banners; admin sees all; no non-admin can create/edit/delete; nobody — even an admin's own login — can upload straight into the bucket; every unsafe link refused, safe ones accepted; length and date-window constraints) and browser flows with real uploads (too-narrow, too-tall and non-image files refused with clear messages; create; bad link and button-without-link refused; scheduled and vendor-only banners absent from the signed-out homepage HTML; reorder; autoplay/hover-pause/dots; edit with image replacement; pause; delete; mobile layout). Signed-out upload → 401, admin page → sign-in redirect.
- **Not built**: per-banner click/impression analytics, separate mobile crops (one image is cropped to the box with `object-cover`, so keep the subject away from the far edges), category/occasion landing-page banners (the table is generic; only the homepage slot is wired), an "undo delete".
