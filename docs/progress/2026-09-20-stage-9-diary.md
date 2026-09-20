# Stage 9 — Personal Gifting Diary + daily cron

Date: 2026-09-20

## Status: built and verified locally against the real database; real EMAIL sending not yet exercised (no Resend key)

## What was built

- **Diary** (`/diary`, `/diary/people/[id]`): people (relationship, interests, budget, preferences, private notes), important dates (occasion,
  recurring, 1–4 reminder lead times, pause), gift log (manual entries for gifts bought elsewhere), a **dashboard** with "Coming up" (next 60 days),
  ideas for the next un-sorted moments, your people, a **Gifting Score** ring and a month **mini calendar**. Empty state, mobile layout checked (375px, no overflow).
- **Pure, unit-tested core** (`lib/diary/*`): `recurrence.ts` (dates as `YYYY-MM-DD` strings, UTC day-numbers; Feb 29 → Feb 28 in non-leap years; a reminder is due
  on *exactly* one day per occurrence), `gifting-score.ts` (documented 45/25/15/15 formula), `suggestion-matcher.ts` (rule-based, explains each pick;
  whole-word interest matching; never suggests something already gifted; excludes products tagged for a different recipient unless an interest matches),
  `view.ts` (dashboard view-model), `reminder-email.ts` (HTML-escaped email builder). 42 diary tests.
- **Daily cron** `GET/POST /api/cron/diary-reminders` (`vercel.json`: `30 3 * * *` UTC = 09:00 IST; Bearer `CRON_SECRET`, constant-time, unset secret validates nothing):
  1. diary reminders — "today" is computed in each owner's timezone (`users.timezone`); in-app notification + email (Resend, if configured and the user allows it)
     with three gift ideas. **Exactly-once** via `diary_reminder_log` (unique event + occurrence + lead time + channel): the run CLAIMS a row before sending, so
     overlapping runs/manual re-runs never double-send; a failed email releases its claim so the next run retries.
  2. `cancel_stale_unpaid_orders(48h)` — cancels never-paid orders, releases coupon uses (a late payment is auto-refunded by Stage 7).
  3. `purge_stale_guest_carts(30d)`.
  Jobs are independent (one failing doesn't stop the others). `?dryRun=1` reports without writing.
- **Notification bell + inbox** (`/notifications`, navbar badge) — every in-app notification from Stages 7–9 (order confirmed, shipment updates, diary reminders)
  was being written but was invisible; now users can see, open (same-site links only) and mark them read.
- **Email preferences** (`/account/notifications`): per-category email switches (no row = on; users opt out). The reminder email links here.

## Security / privacy findings (all fixed in migrations `20260920100000` and `20260920110000`)

1. **Cross-user reference hole**: diary policies only checked `user_id = auth.uid()`, so a user could attach an event/gift to *someone else's* `contact_id`; the cron would
   then put a stranger's contact name in the attacker's reminder. `diary_events_guard` / `gift_history_guard` (SECURITY INVOKER — lookups run under the caller's RLS, so a
   foreign contact/order is invisible) now require the referenced contact/order to belong to the same user. *An RLS `user_id = auth.uid()` check does not validate foreign keys.*
2. **Admins could read diary content through `notifications`**: the SELECT policy allowed any admin to read every notification, and reminders carry a contact's name and date.
   Diary reminders are now owner-only (`type <> 'diary_reminder'` for the admin branch); orders/shipments stay visible for support.
3. **Notification tampering**: users could rewrite any column of their own notification (incl. `link_url`). A trigger now allows only `is_read` to change.
4. Abuse limits in the DB: 200 people/user, 20 dates/person, 15 interests, 4 reminder lead times (each 1–60 days), length caps on text.
5. Diary tables still have **no admin bypass**; the reminder ledger is service-role write, owner read only.

## Bugs found by testing (not by build/lint)

- A `"use server"` file may only export async functions — exporting a constant from `notification-actions.ts` crashed the page at runtime (moved to
  `notification-categories.ts`). Scanned every other `"use server"` file: clean.
- Suggestion ranking sent a Men's Wallet to a sister (occasion match outweighed the recipient mismatch) → wrong-recipient products are now excluded unless an interest matches.
- Vitest had no `@/` alias (bit twice) → `vitest.config.ts` mirrors tsconfig.

## Verification

- DB as real users: can't attach to another user's contact/order; 21st date, 5 lead times, lead time 0/61, 16 interests, oversize notes rejected; another customer AND an admin see
  none of a user's contacts/events/gifts/reminder log; can't edit others' contacts; can't write the ledger; cleanup functions locked to service role and behave (fresh order kept,
  49-hour-old cancelled; 31-day-old guest cart purged, 29-day kept).
- Cron over real HTTP: 401 without/with wrong/with a non-Bearer secret; dry run writes nothing; 7-day and 3-day reminders fire on exactly the right days; a 5-days-out event, a paused
  event and a late-created one-off don't; a second timezone (Los Angeles) user judged by their own calendar; re-run and **5 concurrent runs** send nothing new; email correctly skipped as
  "no provider" vs "opted out".
- Browser: empty state; add person (validation messages); add date (default 7d+3d reminders, date validation); dashboard (coming up, ideas, score 40 → 100 after logging a gift, "Gift sorted");
  another user's person page is a 404; person page at 375px; preference toggle persisted and honoured by the cron; bell (2 unread → click → /diary → 1).
- `lint`, `tsc`, **114** unit tests, `npm run build` clean. Test data removed.

## Not verified / deferred

- **Real email**: needs `RESEND_API_KEY` (+ a verified sending domain; until then Resend only allows `onboarding@resend.dev` to the account owner's own address). The email builder is unit-tested
  and escapes user text, but no message has been delivered.
- **Web push** (OneSignal): not built — needs the client SDK + subscription flow (Stage 10). The `push` channel exists in the ledger schema only.
- Vercel cron on the Hobby plan runs **once a day, within the scheduled hour** — fine for daily reminders. Add `CRON_SECRET` in Vercel or the cron will (correctly) get 401.
- Not built: recurring-event "years" edge display for non-birthday types, contact photos, importing contacts, sharing a wishlist with someone, auto-logging gifts from placed orders (manual log + "Got it" only).
