# Wishlist price-drop alerts — fifth of the remaining spec gaps

## The finding that shaped the design

`sendBackToReviewIfLive()` runs after every vendor edit to a live product, so a price cut by a vendor sets the product to
`pending` — hidden from shoppers — until an admin re-approves it. Notifying at save time would advertise a price nobody
can buy yet (and the link would 404). So the alert can't be tied to "the price changed"; it has to be tied to "the lower
price is now purchasable". That is why this is a queue plus a job that WAITS, not a notification in the save path.

## Pieces

- **Trigger → queue** (`supabase/migrations/20261002110000_price_drop_events.sql`): `products_record_price_drop` fires on
  base/sale price changes and queues a row when the product is `active` and its effective price (cheaper of sale/base —
  the DB doesn't enforce sale < base) fell ≥5%. A trigger rather than app code because prices change through more than
  one door. `SECURITY DEFINER` (the vendor has no insert right on the queue; it never reads `current_user`, so the CLAUDE.md
  masking pitfall doesn't apply). The queue table is server-only: RLS on, no policies, grants revoked from client roles.
- **Rules** (`lib/wishlist/price-drops.ts`, pure, 17 tests):
  - `from` = the price shoppers last saw (earliest queued event's old price); `to` = price now. Net ≥5% or nothing —
    a reversed drop, or a cut followed by a rise, sends nothing.
  - Product not live (status or boutique) → `wait`. Events older than 14 days → `expire`.
  - Skip people who wishlisted AFTER the drop was recorded (they saw the lower price). Skip a person for a product if they
    were alerted about it in the last 7 days (stops a vendor spamming by cycling a price). One digest per person (max 10 items,
    "and N more"), biggest % drop first.
- **Job** (`lib/wishlist/price-drop-job.ts`): reads the queue (paged — see `lib/db/paginate.ts`), classifies per product,
  **claims events before sending** (atomic `processed_at` update, only if unclaimed → overlapping runs/retries can't double
  send; a crash between claim and send loses that product's alert — chosen on purpose: a missed nudge beats a duplicate),
  reads wishlisters (paged), cooldown from the users' own prior `wishlist_price_drop` notifications (no new table holding
  personal data → nothing to add to `export_user_data`/`anonymize_user`), then sends via `notifyUser` (category
  `wishlist_alerts`). Deleted/anonymised accounts are skipped. Runs from the existing daily cron (03:30 UTC ≈ 9:00 IST) as an
  independent job with `dryRun` support.
- **Email**: `buildPriceDropEmail` (singular vs digest wording, struck-through old price, product links via `safeUrl`,
  HTML-escaped vendor-supplied names, opt-out link). 2 tests incl. escaping and a `javascript:` URL.
- **Preference fix**: `wishlist_alerts` was already allowed by the DB CHECK and used by `NotificationCategory`, but missing
  from `NOTIFICATION_CATEGORIES` and the settings action's zod enum — so the toggle didn't exist. Added to both and to
  `NotificationToggle`'s type. Like every category, turning it off silences email/push; the in-app note still appears.

## Verified (real database, then cleaned up)

1. Trigger in a rolled-back transaction: 3% cut → nothing; 17.5% cut → event; price rise → nothing; sale price 30% under
   base → event; non-price edit → nothing; drop on a `pending` product → nothing. Queue empty afterwards.
2. The job end-to-end (script calling `runPriceDropAlerts` directly — the full cron would also have sent real diary reminders
   and cancelled stale orders): dry run → reports 1 product/1 user, changes nothing; product set `pending` → `waiting:1`,
   nothing sent, event still queued; product active again → 1 user notified, title/message correct, `/wishlist` link;
   a shopper who wishlisted after the cut → 0 notifications; event claimed; immediate re-run → `eventsSeen:0`; a second 20% cut →
   the first person still has exactly 1 notification (cooldown held; the one user notified was someone who wishlisted between the
   two cuts, correctly). Product price/status, wishlist rows, notifications and events restored/deleted; DB confirmed clean.

## Not verified / limits

- **The settings toggle was never viewed** — browser navigation to `/account/notifications` was denied as PII handling.
  It is a one-line addition to the list the page already maps over, and tsc covers the wiring.
- **A real delivered email**: Resend is configured but the test accounts are `@giftping.test`; no inbox received one. One
  honest caveat on my test: the "late wishlister" was chosen with an unordered `limit 1` and cleanup deleted the evidence; the
  identical query returns a `dem…@giftping.test` demo shopper, so a real address was very likely not emailed — but I can't
  prove it. Future scripts should name the test users explicitly.
- **Vercel cron firing it in production** (it's the same endpoint as the diary reminders, already scheduled; untested live).
- **Variants**: alerts follow the product's own base/sale price. A vendor changing only a variant's price modifier isn't tracked.
- **Latency**: up to ~a day after approval (daily cron), by design for cost; an immediate drain on approval would be a small add.
- **Anyone who wishlists a product when its price already dropped isn't told** — by design; no "price when added" is stored.
- No badge on `/wishlist` itself showing "price dropped" — would need a stored baseline price.
