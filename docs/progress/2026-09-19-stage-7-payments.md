# Stage 7 — Payments (Razorpay)

Date: 2026-09-19

## Status: built and verified against a local mock gateway — NOT yet against real Razorpay

The Razorpay test keys were not available this session, so `.env.local` still has the three Razorpay values empty. Everything that
doesn't need Razorpay to be *real* was built and tested end-to-end (the webhook route, signature checks, the SQL fulfilment function, refunds,
idempotency, concurrency, RLS). The Razorpay REST client was exercised over real HTTP against a throw-away mock server that mimics the
documented endpoints. **What has not been observed with real keys**: Razorpay Checkout's modal completing a payment, real webhook
deliveries and their exact payload shapes, and the real refund/capture API responses. Do the "First real test" steps below before trusting it.

## What was built

- **Pay Now** on `/orders/[id]` (`PayNowButton` → `startPaymentAction`). The server creates the Razorpay order for `orders.total_amount`
  (×100 → paise) read from the DB; the browser only ever sends an order id. Idempotent: an order already holding a Razorpay order id reuses it;
  a click race stores exactly one. Refuses if an item has sold out since checkout.
- **Two paths converge on one idempotent step** (`lib/commerce/payments.ts` → SQL `confirm_order_payment()`):
  - *Webhook* `POST /api/webhooks/razorpay` — the **source of truth**. Verifies the HMAC of the RAW body in constant time *before* parsing,
    claims the event id in `webhook_events` (a replay returns 200 and does nothing), processes, and answers 5xx on failure so Razorpay retries.
    Handles `payment.captured`, `order.paid`, `payment.authorized` (captures only if the payment is genuinely still "authorized" — auto-capture
    accounts also send it for already-captured payments and a second capture would error-loop), `payment.failed`.
  - *Browser callback* (`confirmPaymentAction` → `verifyClientPayment`) — a UX fast path: checks the order belongs to the caller, the
    checkout signature (`order_id|payment_id`), then **re-fetches the payment from Razorpay** and takes the amount/state from there, not the
    browser. If it never arrives (tab closed) the webhook alone completes the order — verified.
- **`confirm_order_payment()`** (SQL, service_role-only, atomic): row-locks the order; amount must equal the stored total to the paisa; decrements
  product + variant stock (any shortfall raises and a sub-transaction rolls *every* decrement back); order → `confirmed`, `placed_at` set;
  removes exactly the ordered lines from the shopper's cart (anything added since stays) and clears the applied coupon. If it can't fulfil
  (`OUT_OF_STOCK`, `AMOUNT_MISMATCH`, `ORDER_CANCELLED`, `DUPLICATE_PAYMENT`) it records the captured payment and returns `refund_needed`;
  the caller refunds via the API automatically (order → cancelled, coupon use released, audit-logged). A refund that fails throws → 5xx →
  Razorpay retries; the retry refunds exactly once.
- **Vendors now only see PAID orders.** Stage 1's RLS let a vendor read `created` (unpaid/abandoned/cancelled) orders and items — including the
  buyer's address and phone — for orders that might never be paid. `order_visible_to_vendors()` now gates `vendor_has_order_item` and the
  `order_items` vendor branch (hidden: `created`, `payment_initiated`, `cancelled`).
- `place_order()` / `resolve_coupon()` now treat a `payment_initiated` order as the shopper's own open draft too (an abandoned Razorpay modal
  must not lock them out of their coupon or leave two live orders); a superseded draft's pending payment row is marked failed. A payment that
  still lands on a superseded order is refunded automatically.
- In-app notifications on confirmation (customer + each vendor). Emails/push are Stage 10.
- `lib/integrations/razorpay.ts` — plain-fetch client (no SDK), 15s timeout, `RAZORPAY_API_BASE` override honoured only outside production.
  `razorpay-signature.ts` — pure HMAC checks (unit-tested; empty secret never validates).

## Verification (all against the mock gateway + a real signed request to the running route)

- Webhook request validation: unsigned / wrong secret / body altered after signing / missing event id / non-JSON → 400; unknown gateway order → 200 ignored.
- Webhook alone (no client callback): order confirmed, `placed_at`, stock −qty and `total_sold` +qty, payment row with gateway id + method, cart
  line removed, customer notified; **replay of the same event id is a no-op; a second event (`order.paid`) for the same payment → `already`;
  stock not decremented twice**; browser test: order page flipped to "Confirmed", cart badge cleared, Pay button gone.
- **8 concurrent deliveries** (4 same event id + 4 different ids) → one `confirmed`, stock decremented once, one notification, one payment row.
- Wrong amount → refunded (gateway saw the refund call with the captured amount), order cancelled, no stock taken.
- Oversold multi-item order → ALL decrements rolled back (hamper untouched, wallet not negative), refunded `OUT_OF_STOCK`.
- Late payment on a superseded order → refunded, not fulfilled; the newer live order untouched.
- `payment.failed` recorded, order stays payable. Authorized → captured → confirmed; already-captured authorized event → no second capture.
- Refund failure → 500 + event `failed` + `REFUND_FAILED` flag; retry of the same event id refunds once; a further replay is a no-op.
- Browser callback path (temporary dev route, since deleted): forged signature, mismatched razorpay order id, a payment belonging to a different
  gateway order, another user's order → all rejected; not-yet-captured → `pending`; authorized → captured → confirmed; captured → confirmed.
- Pay Now: gateway received `POST /v1/orders` with `amount: 249900`, `receipt: GP-100017`, correct Basic auth; Razorpay's real Checkout script loaded.
- RLS/ACL as anon + customer: can't call `confirm_order_payment` / `release_order_coupon`, can't read or write `webhook_events` or read `payments`,
  can't update orders. Vendors: can't see or read an unpaid order; can once it's paid; get a new-order notification.
- With the secret unset, every webhook (unsigned, or signed with an empty secret) is rejected 400.
- `lint`, `tsc`, 57 unit tests, `npm run build` clean. All test data/orders/stock were reset; `.env.local` restored to empty Razorpay values.
- Note: the `security-review` skill errored in this environment (`origin/HEAD` missing), so the review was done by hand (checklist in this section).

## First real test (needs the developer)

1. Razorpay dashboard (Test mode) → API keys → put `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_SECRET_KEY` in `.env.local`.
2. Settings → Payment Capture: **Automatic** (the code also handles manual capture via `payment.authorized`).
3. Webhooks → add `https://<public-host>/api/webhooks/razorpay` (locally use a tunnel such as `cloudflared tunnel --url http://localhost:3000` or ngrok;
   Razorpay can't reach localhost). Active events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`. Set a secret and put
   the SAME value in `RAZORPAY_WEBHOOK_SECRET`.
4. Pay a test order with Razorpay's test UPI/card details. Confirm: order → Confirmed; `webhook_events` row `processed`; block the browser callback
   (close the tab right after paying) and confirm the webhook alone still confirms it; resend the event from the dashboard (must be a no-op).
5. Compare a real payload against `RazorpayWebhookEvent` in `lib/commerce/payments.ts` — the field paths were written from Razorpay's docs.

## Deferred / hand-offs

- **Razorpay Route (split settlement to vendor accounts) is NOT built.** It needs a Route-enabled Razorpay account and per-vendor linked-account
  KYC, neither of which can be verified without a real account (the plan flagged this as the least predictable dependency). Every paid line's
  commission and vendor payout is already stored in `order_item_financials`, so the fallback — manual/periodic settlement using
  `vendor_settlements` — has all the data; the settlement job belongs after delivery + return window (Stage 8/11). Decide with the client whether
  to pursue Route.
- Stale unpaid `created` / `payment_initiated` orders that a shopper never revisits: still need the Stage 9 cron to cancel them and release coupon uses.
- Customer/admin-initiated refunds and cancellations (partial refunds, returns) — Stage 11 admin suite.
- Order confirmation **emails** and push: Stage 10.
- No PCI scope: card data never touches our servers (Razorpay Checkout iframe).


## Real-account verification (2026-09-20) — Razorpay TEST keys wired

- Keys verified against the real API: order create/fetch, and the real error shapes (`error.code` / `error.description`, 401 "Authentication failed")
  match what `RazorpayError` parses. Real Checkout loads (overlay with the "Test Mode" ribbon); the server-stored total and Razorpay's own record
  agree to the paisa (₹2,499 ↔ 249900) with the order number as receipt.
- Production webhook on `https://giftping-lime.vercel.app/api/webhooks/razorpay` verified: a correctly signed probe is accepted (`unknown_order`),
  unsigned is rejected. **Vercel had the webhook secret but NOT `NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_SECRET_KEY`** — the deployed order page
  showed "Online payments aren't switched on yet" until those are added and the project redeployed.
- Still to observe once, by a human: completing a test payment in the modal (card/UPI test values are typed by the developer, not the agent) and
  the real `payment.captured` webhook confirming the order. Checklist: developer pays order GP-100028 (or any new order) → order flips to Confirmed.
