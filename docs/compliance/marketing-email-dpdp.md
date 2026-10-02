# Marketing email — consent, data protection, and going live on a paid email plan

> **This is an engineering design record, not legal advice.** It explains what the system does and why, so the client's lawyer can
> review the real behaviour. India's Digital Personal Data Protection Act 2023 and its rules are being phased in; confirm the current
> commencement dates and exact obligations with counsel before launch. Flip `SITE.legalReviewed` (lib/site.ts) only after that review.

## 1. The problem we found before building anything

`users.marketing_opt_in` has existed since the first migration with **`DEFAULT TRUE`**, and nothing in the app ever asked anyone or let
them change it. So every account looked "opted in" without ever having been asked. That is not valid consent: the DPDP Act requires
consent to be free, specific, informed, unconditional and given by a clear affirmative action — a pre-set "yes" is none of those.

**What we did:** default changed to `false`, every existing flag reset to `false` (migration `20261002120000_marketing_campaigns.sql`; the
reset deliberately runs before the logging trigger exists, so no fake "withdrawn" history was created). Result today: **0 opted in**.
Marketing email is opt-in only, and the audience starts empty.

## 2. How consent works

| Requirement | How it's met |
|---|---|
| Clear affirmative action, not bundled | An **unticked** checkbox on sign-up, separate from creating the account; a switch that is **off** by default in `/account/notifications`. |
| Specific purpose, plain language | One purpose: "offers, new arrivals and gifting ideas from GiftPing" by email. Wording in `lib/marketing/consent.ts`. |
| Proof of what was agreed | Every change is logged in `marketing_consent_log` (granted/withdrawn, **source**, **notice version**, time) by a **database trigger**, so the record is complete whatever code path or direct API call flipped the flag. Clients cannot write the log. |
| Email address is really theirs | A box ticked at sign-up is only a *pending* choice; it is recorded as consent **when the confirmation link is clicked** (`app/auth/callback`). Typing someone else's address and ticking the box cannot subscribe them. |
| Withdrawal as easy as giving | One click in every email (link and the mail app's own Unsubscribe button), or one switch in settings. No login needed for the email link. |
| Withdrawal honoured immediately | Consent is **re-checked per person at the moment of sending**, not only when the audience was chosen; someone who unsubscribes mid-campaign is skipped. |
| Purpose limitation / minimisation | Campaigns use first name + email only. Segments use purchase history only (never diary content — the Gifting Diary has no admin read path by design). The admin UI shows **counts**, never lists of addresses. |
| Right of access | `export_user_data()` now includes `marketing_emails`: current status, full consent history, and which campaigns they were sent. |
| Erasure | Erasure already resets the flag; the consent log keeps only a user id + timestamps (no contact details) as evidence, and the user row it points to is anonymised. |
| Records / accountability | Admin actions (create, start, pause, cancel, limit changes) are written to `audit_logs`. |

**Notice versioning:** if the consent wording ever changes materially, bump `MARKETING_NOTICE_VERSION`; that is what lets GiftPing show later
exactly what each person was told.

## 3. The unsubscribe mechanism

- Links are **signed, stateless tokens** (`<userId>.<HMAC>`, `lib/marketing/unsubscribe-token.ts`) under `MARKETING_UNSUBSCRIBE_SECRET`. They can't be
  forged for another person, and they **never expire** (a person must be able to unsubscribe from an old email).
- A mail app's own button POSTs to `/api/marketing/unsubscribe` (RFC 8058 `List-Unsubscribe` + `List-Unsubscribe-Post` headers — Gmail/Yahoo require
  this for bulk senders). The link in the email body opens a **confirm page**; only its button POSTs. **A GET never changes anything**, because mail
  scanners fetch every URL in a message and would otherwise unsubscribe people silently.
- **Fails closed:** with no secret configured the sender refuses to send anything (an email without a working unsubscribe link must not go out).
- Idempotent: a second click or a mail-app retry still shows success, and logs nothing extra.

## 4. Designing for the free Resend tier now, and a paid plan later

The free tier is (as documented when this was built — **verify current numbers**) roughly **100 emails/day, 3,000/month, one verified domain, 2 API
requests/second**, and order confirmations / diary reminders spend from the same pool. So:

- **Budgets, not code, are the lever.** Two admin-editable numbers (`marketing_daily_cap` default 50, `marketing_monthly_cap` default 1,500 — about half
  the free tier, leaving the rest for transactional mail) in **/admin/campaigns → Sending limits**. A run sends at most what's left of today's and this
  month's budget, counted from our own sent records in UTC. **Moving to a paid plan = raising these two numbers.**
- A campaign is a **queue**: the audience is frozen when it's started, and the daily job (04:00 UTC, `/api/cron/marketing`) works through it. The admin sees
  "at the current limit this takes about N days" *before* pressing Start, plus a "Send next batch now" button for demos.
- Sends use Resend's **batch endpoint** (≤100 per call, paused between calls) so it stays inside the 2 requests/second limit.
- **At most once.** Recipients are claimed before the provider is called, so overlapping runs can't double-send. A failure that might still have delivered
  (timeout/5xx) is marked `failed` and **not retried automatically** — a duplicate marketing email is worse than a missed one; an admin can re-queue them
  knowingly. A failure that definitely sent nothing (provider not ready, provider quota) leaves everyone queued.
- Until a sending domain is verified in Resend, the free account only delivers to its owner's address; the system treats that as "provider not ready"
  (campaign stays queued, nothing lost) rather than failing everyone.

## 5. Going live — checklist (nothing here is done for you)

1. **Resend:** move to a paid plan; verify the sending domain (SPF + DKIM) and add a **DMARC** record; set `RESEND_FROM_EMAIL` to an address on that domain.
   Warm up: start with small campaigns and ramp, rather than the first send being the full list.
2. **Raise the limits** in /admin/campaigns to suit the plan (leave headroom for order/diary email). If you want faster draining, run `/api/cron/marketing`
   more often in `vercel.json`.
3. **Environment (Vercel):** set `MARKETING_UNSUBSCRIBE_SECRET` (24+ chars; **never rotate** — it would break every link already emailed), and
   `NEXT_PUBLIC_BUSINESS_ADDRESS` + `NEXT_PUBLIC_SUPPORT_EMAIL` (shown in the email footer).
4. **Legal review** of: the consent wording, the Privacy Policy's marketing section, and the grievance-officer/contact details; then flip `SITE.legalReviewed`.
5. **Bounce and spam-complaint handling is NOT built.** Resend can send a webhook for hard bounces and complaints; the right behaviour is to withdraw consent
   (`set_marketing_consent(..., 'direct')`) so those addresses are never mailed again. Do this before sending at volume — mailbox providers penalise senders who keep mailing complainers.
6. **Re-permission of existing customers:** everyone was reset to "not opted in". There is no prompt asking them yet; they can opt in from settings. A one-time,
   dismissible in-app invitation would grow the list lawfully.
7. **Children:** sign-up has no age check. The DPDP Act has special rules for under-18s (verifiable parental consent). Ask counsel whether GiftPing's audience requires one.
8. **Google sign-ups** get no checkbox (there is no sign-up form); they opt in from settings like everyone else.

## 6. What was and wasn't verified

Verified against the real database and running server: consent trigger/log, the `set_marketing_consent` function, access control (a customer can read only their own
log, cannot write it, cannot call the function), the data export (a bug here was found and fixed by this testing — see the progress log), the sender end-to-end with an injected fake
provider (budgets, mid-campaign unsubscribe, provider-not-ready, quota, ambiguous failure, re-queue, two parallel runs → exactly one email each), every unsubscribe endpoint
over real HTTP (including that GET changes nothing), the admin screens (create, validation, preview, refused empty start, limits, delete) and the sign-up checkbox default.

**Not verified:** an actual email through Resend (so: that Gmail shows the Unsubscribe button, and Resend's real batch response shape — coded from its documentation);
the sign-up → confirmation-email → consent path end to end (Supabase's shared SMTP rate limit blocks repeated test sign-ups; the pieces are verified separately); the
`/account/notifications` settings switch was never *viewed* (the browser tool was denied that page as PII handling — it reuses the established switch pattern and type-checks);
the Vercel cron firing in production.
