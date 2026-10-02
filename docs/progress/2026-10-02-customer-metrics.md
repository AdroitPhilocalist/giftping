# Customer growth & repeat-purchase metrics — third of the remaining spec gaps (5.1)

## What it measures, and the definitions chosen

- **Total customers** — accounts with `role = customer`. **New** — signed up inside the selected window (7/30/90 IST days).
- **Have bought** — customers with at least one *paid* order, all-time. "Paid" reuses `PAID_ORDER_STATUSES` from
  `admin-stats.ts`, so a cancelled or unpaid draft never makes someone a buyer, and the definition can't drift from the revenue numbers.
- **Repeat buyers** — buyers with two or more paid orders, all-time. All-time on purpose: a window-limited
  count would call a customer "new" in October even though they first bought in January.
- **Orders from returning customers** — of the paid orders placed in the window, the share where that customer
  had already bought before that order. Orders are walked oldest-first, so the answer doesn't depend on row order.
- **New sign-ups who have bought** — a simple sign-up → first-purchase signal for the window.

## Design notes

- Pure aggregation in `lib/admin/customer-metrics.ts` (same split as `stats.ts`), loader in `lib/db/customer-stats.ts`.
- The loader pages through orders 1,000 at a time with a stable `(placed_at, id)` ordering, because PostgREST clamps
  a larger `.limit()` to its max-rows setting without any error. There is a 50-page safety stop; if hit, the page says
  figures are a lower bound.
- Only `customer_id` / `placed_at` / `id` / `created_at` are read — no names, emails or anything diary-related.
- Replaced the old two-line "Customers" card; Low stock now spans the full row.

## Verified

Cross-checked against a hand-written SQL query (window functions over the real dev database) for 30 days and 7 days:
all eight figures identical. The 7-day window has no orders, and the tile correctly shows "—" rather than 0% or NaN.
Unit tests cover: empty input, IST day boundary (a 20:00 UTC sign-up lands on the next IST day), repeat/returning
logic with shuffled input and pre-window history, and unloaded-customer headline totals.

## Limits / follow-ups

- Dev data is synthetic (all 19 customers signed up in the last 30 days), so the *trend shape* has not been judged against realistic data.
- No cohort retention table or lifetime value — out of scope for the spec line; the data model supports adding them.

## Follow-up the same day: the row-cap fix

While building this I noticed the earlier revenue-report route (`.limit(20000)`) and dashboard stats (`.limit(2000)`)
depended on limits PostgREST may silently clamp to its max-rows setting (1,000 by default). Fixed with a shared
`lib/db/paginate.ts` (`fetchAllRows`) used by all three readers.

- **Mechanism**: `.range()` pages with a stable `(sort column, id)` order; asks for `maxRows + 1` so `truncated` is exact
  (not a false alarm at exactly `maxRows`).
- **Policy differs by purpose**: the revenue report refuses (HTTP 413, "pick a shorter range") over 50k rows rather than
  hand an accountant an incomplete file; the dashboard keeps its "latest 2,000 orders" display cap with an accurate notice;
  customer metrics flag "lower bound".
- **Not confirmed**: whether this project's max-rows is actually 1,000 (no API token available; no table >321 rows). The fix is
  correct either way.
- **Verified**: real-DB paging at page size 7 vs 1,000 identical (42 rows, same order, 0 duplicates); cap flagged truncated;
  CSV and dashboard figures unchanged. The >50k refusal path is unit-tested only.
