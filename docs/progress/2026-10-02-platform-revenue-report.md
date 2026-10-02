# Platform Revenue Report — the second of the remaining spec gaps

Picked from the same "needs a priority call" list as the admin category management work. Chose this one
next because it's pure read-and-export (no new writes, no risk of corrupting live data), and
`lib/admin/settlement-csv.ts` was a close, already-proven template for the CSV-building half of it.

## What "net platform revenue" means here, and why it's three numbers, not one

The spec (5.5) asks for "gross merchandise value, total commissions earned, refunds issued, and net platform
revenue for any date range." The platform's only real revenue is commission — vendors keep the rest of
GMV — so "net platform revenue" is commission earned minus whatever commission was later reversed by a
refund. Rather than only showing that one final net number, the report shows three: gross commission
earned, commission reversed by refunds, and the net — so an admin (or an accountant reading this later) can
see the clawback, not just the bottom line. "Refunds issued" is reported separately and is a much larger
figure than the commission reversal alone, since most of a refund is the vendor's own payout and GST, not
platform money — included because the spec names it as its own line and because an admin needs to see total
cash that left the platform, not just commission lost.

## What was built

- `lib/admin/revenue-report.ts` — new, pure and tested (same shape as `settlement-csv.ts`'s
  `buildSettlementCsv`: takes already-fetched rows, does the aggregation AND the CSV serialization in one
  function). Buckets orders by IST calendar day over an arbitrary `from`/`to` range (not the dashboard's
  "last N days trailing today" — an admin needs real past ranges, e.g. a specific quarter for GST filing).
  Reuses `csvCell` directly from `settlement-csv.ts` rather than reimplementing CSV-injection safety.
- `lib/db/admin-stats.ts` — exported its existing `PAID` order-status list as `PAID_ORDER_STATUSES` (was a
  private const) so the new report route can reuse the exact same "what counts as a paid order" definition
  the dashboard already uses, rather than risking two slightly different lists drifting apart.
- `app/api/admin/revenue-report/route.ts` — new. A plain `GET` with `from`/`to` query params, admin-gated
  directly in the route (no RLS row to hide behind for a platform-wide aggregate the way the settlement CSV
  route can rely on RLS for a single vendor's own statement). Same download mechanics as the settlement CSV
  route (`Content-Disposition: attachment`, `Cache-Control: no-store`).
- `app/admin/dashboard/page.tsx` — a new "Financial report" section at the bottom: a plain `<form method="get">`
  with two date inputs (defaulting to the 1st of the current IST month through today) and a submit button —
  works without any JavaScript, same progressive-enhancement convention as every other filter in this app.
  No new page/nav entry; this lives on the existing dashboard since it's a natural extension of the revenue
  numbers already shown there, not a big enough feature to deserve its own `/admin/...` route.

## Verified live, with an independent cross-check

Downloaded the report for 2026-08-01 to 2026-10-02 against the real dev database: 42 orders, ₹2,40,899 GMV,
₹19,721.80 gross commission, ₹0 refunds in that window, with a 63-row daily breakdown that sums correctly.
**Cross-checked against the dashboard's own already-trusted 90-day view for the same effective range — every
figure matched exactly** (same GMV, same order count, same commission, same refund total), giving real
confidence the new aggregation is consistent with the existing, previously-verified dashboard numbers rather
than a second, silently-different definition of the same business terms.

## Regression

`tsc --noEmit`, `eslint .`, `vitest run` (313/313, up from 308 — 5 new tests for the report builder,
including a UTC/IST day-boundary case and a rejected backwards date range), `next build` all clean.
