# Stage 10 — Notifications (email done; push + auth SMTP waiting on keys/domain)

Date: 2026-09-20

## Status: email pipeline built and verified end-to-end to the developer's own inbox; web push and Supabase auth SMTP NOT done (blocked on OneSignal keys / a domain)

## What was built

- **`notifyUser()`** (`lib/notifications/notify.ts`) — the single way the app tells a user something: an in-app notification (always) plus an optional email, gated by
  that user's per-category preference (no row = on), skipping deleted/anonymised users and a missing provider. **Never throws** (a failed notification must never fail a
  payment webhook, courier update or dispatch); it logs and returns what happened.
- **Transactional emails** (`lib/notifications/templates.ts`, one branded frame in `email-layout.ts`, pure + tested): order confirmed (customer: items, total, delivery address),
  shipment updates (packed / on its way / out for delivery / delivered / returning, with courier + tracking link), and a **vendor new-order** email (their own lines + earnings).
  All user-controlled text is HTML-escaped; non-http(s) links are never rendered as hrefs.
- **Wired through the dispatcher**: payment confirmation (`payments.ts`), tracking webhook (`shipments.ts`), courier booking (`dispatch.ts`); the diary cron already had its own email.
  The stale copy "Dispatch opens with the delivery stage" in the vendor notification is gone.
- Real Resend account connected (`RESEND_API_KEY`, `RESEND_FROM_EMAIL=onboarding@resend.dev`). Without a verified domain Resend only delivers to the account owner's address
  (thecontentroomdev@gmail.com); any other recipient is refused by Resend (logged as a failed email, never a crash).

## Verification

- Real diary reminder through the actual cron route → real email sent (1), in-app created (1); a second run sent nothing (2 duplicates skipped); the ledger held exactly one row per channel.
- Signed Razorpay webhook for an order owned by the developer's account → order confirmed; in-app customer + vendor notifications created; signed courier webhook (OUT FOR DELIVERY) → shipment
  notification created once. No email failures logged. (Developer to confirm the inbox: "Order … confirmed", "New order … — ready for you to accept", "Out for delivery today — order …".)
- Templates: 5 tests (contents, escaping of hostile names/addresses, per-stage subjects, tracking shown only when known, `javascript:` links neutralised).
- `lint`, `tsc`, 119 unit tests, `npm run build` clean. Test order/stock/vendor link/notifications removed afterwards.
- The Resend key is **send-only** (least privilege), so delivery status can't be read back through the API — confirm receipt by eye / in the Resend dashboard.

## Not done — and why

- **Web push (OneSignal)**: needs `NEXT_PUBLIC_ONESIGNAL_APP_ID` + `ONESIGNAL_REST_API_KEY`, the client SDK/service worker, a subscription prompt, and a `push` channel in the reminder cron
  (the `push` value already exists in `diary_reminder_log`). Free web-push tier fits the budget (see CLAUDE.md).
- **Supabase auth emails via Resend SMTP** (fixes the sign-up/password-reset rate limit): needs a verified domain. Until then auth emails use Supabase's shared sender and its strict limit.
- Real customers can't be emailed until a domain is verified in Resend and `RESEND_FROM_EMAIL` is switched to an address on it.
- Not built: React Email templates (plain HTML builders instead — no dependency), unsubscribe headers / one-click unsubscribe (add with the verified domain), email for vendor approval/rejection and product moderation (admin actions still write in-app only), digest emails.
