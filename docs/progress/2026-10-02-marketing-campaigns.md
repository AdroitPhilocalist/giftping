# Customer marketing email campaigns — the last spec gap (consent-first, free-tier-sized)

See `docs/compliance/marketing-email-dpdp.md` for the consent design and the go-live checklist; this file is the build log.

## Brief
Build campaigns now on the **free** Resend tier to demo to the client, then move to a paid plan at launch without rework, and handle
India's data-protection law properly.

## What the groundwork turned up
1. **`users.marketing_opt_in` defaulted to TRUE** (first migration) and nothing ever asked anyone or let them change it. 19 of 21 accounts looked opted in.
   That can't be treated as consent. → default FALSE, all reset (before the logging trigger exists, so no invented history). The column stays the single
   source of truth (it was already in the export and erasure functions).
2. **`wishlist_alerts` / `promotions`**: the old "Offers & new arrivals" toggle wasn't connected to anything that sends email; replaced by a real opt-in switch.
3. **Resend free tier is small and shared** (~100/day, 3,000/month, 2 req/s — verify current numbers) with order confirmations and diary reminders.

## Design decisions
- **Evidence by trigger.** A trigger on `users.marketing_opt_in` writes every change (granted/withdrawn, source, notice version) to `marketing_consent_log`, so the record is
  complete whichever path changed it. `set_marketing_consent()` (service_role only) tags the change; it resets its transaction-local settings before returning (found by testing).
- **Pending consent until the email is proven.** A sign-up tick is stored in auth metadata and only recorded when the confirmation link is clicked.
- **Unsubscribe never trusts a GET.** Mail scanners fetch links. The email link opens a confirm page; only a POST withdraws. Mail apps' RFC 8058 button POSTs directly.
- **Signed stateless tokens without expiry** (HMAC of the user id under `MARKETING_UNSUBSCRIBE_SECRET`). Fails closed: no secret ⇒ nothing is sent.
- **Queue + budgets.** Audience frozen at start; the daily job drains within `marketing_daily_cap`/`marketing_monthly_cap` (platform_settings, editable in /admin/campaigns, defaults
  50/1,500). The free→paid move is a settings change. Batch endpoint (≤100/call) with a pause stays inside the 2 req/s limit.
- **At-most-once.** Claim (`queued`→`sending`, atomic) before calling the provider; ambiguous failures → `failed`, never auto-retried (admin may re-queue knowingly); definite
  non-sends (provider not ready/quota) release the claim. Stale claims >1h become `failed` rather than being resent.
- **Re-check consent at send time**, not just at queue time.
- **Plain-text bodies only**, escaped on render; CTA must be a site path or https URL (checked by the schema, a DB CHECK, and `safeUrl`); newlines refused in subject/name (header injection).
- **Segments** use purchase history only (never diary — it has no admin read path by design); admin sees counts, never address lists.
- **Export wrapper:** rather than copy `export_user_data`'s ~150-line body again, the original was renamed `export_user_data_core` and a thin wrapper adds `marketing_emails`.
  My first wrapper checked `result` but the core returns `{result:"ok", data:{…}}` — so the section was silently never added; the live test caught it and `20261002120100` fixed it.

## Pieces
Migrations `20261002120000_marketing_campaigns` + `20261002120100_marketing_consent_fixes` (applied). `lib/marketing/*` (consent, unsubscribe-token, segments, send-plan,
campaign-email, audience, settings, sender, unsubscribe, consent-actions), `lib/validation/campaign.schema.ts`, `lib/admin/campaign-actions.ts`, `lib/cron/authorised.ts` (shared by both
cron routes), `app/api/cron/marketing`, `app/api/marketing/unsubscribe`, `app/(shop)/unsubscribe`, `app/admin/campaigns/{page,new,[id]}`, `components/admin/Campaign{Form,Controls,LimitsForm}`,
`components/shop/MarketingConsentCard`, sign-up checkbox, `/auth/callback` consent step, Resend client gained `sendEmailBatch` + custom headers, `vercel.json` cron.

## Verified
Real database: consent trigger, function, source validation, access control (customer reads own log, can't write it or call the function), export includes history. Sender end-to-end with an
injected fake provider (five scenarios + parallel runs). All unsubscribe endpoints over HTTP, incl. "GET changes nothing". Admin UI in the browser: validation messages (button text without link,
`javascript:` link, limits above monthly), draft creation, preview (sandboxed iframe, greeting/paragraphs/CTA/unsubscribe footer), refused start with nobody opted in, delete, limits save + audit.
Sign-up checkbox is unticked in the served HTML. 385/385 tests (28 new), tsc/eslint/build clean. All test data removed afterwards (0 campaigns, 0 opted in, 0 log rows, limits 50/1,500).

## Not verified
Real delivery through Resend; Gmail's Unsubscribe button; Resend's actual batch response shape; sign-up → confirmation email → consent end to end (Supabase shared SMTP limit); the settings switch
(never viewed: the browser tool was denied `/account/notifications` as PII handling); Vercel cron in production; the daily-limit window semantics on Resend's side (assumed UTC).
One cosmetic: after saving limits the figures needed a reload to update in the hidden browser pane (the save and audit entry were correct) — probably pane throttling, not confirmed.

## Dev environment note
A random `MARKETING_UNSUBSCRIBE_SECRET` was added to the gitignored `.env.local` (documented in `.env.example`). **Production needs its own, set once and never rotated.**
