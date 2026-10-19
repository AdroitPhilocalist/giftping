# The vendor register page, taken to the next level (19 Oct 2026)

**Report:** *"the UI of the vendor register page is pretty basic we need to take it to the next level."*

It was. `/vendor/register` is one URL wearing three completely different hats, and only the third had ever
been designed:

| Who lands there | What they got |
|---|---|
| A signed-out visitor (the footer's "Become a Vendor" link) | A centred heading and two buttons. A dead end that explained nothing. |
| A signed-in applicant | One long scroll of **16 fields** in five plain `fieldset`s — business, tax, bank, pickup — with the bank details arriving before the applicant had any reason to trust the page. |
| Someone who had already applied | Four plain status cards. |

All three were rebuilt. **Nothing underneath changed**: same zod schema, same `registerVendorAction`, same
field `id`s (so labels and autofill keep working), same redirect behaviour, and `/vendor/register` is still a
public, non-gated vendor path (`isVendorPath` in `lib/auth/paths.ts`, which `lib/auth/paths.test.ts` pins).

## 1 · Signed out: an actual storefront pitch (`components/vendor/VendorSignupLanding.tsx`)

The hero reuses `/vendors`' own already-shipped treatment — the Boutique Avenue photograph
(`world-boutiques`), the same `Ambience kind="sparks"` drifting over it, the same scrim-and-caption over the
photo, headline on the cream canvas beside it — so the page reads as the place the vendor is about to move
into rather than a form they've stumbled onto. Then:

- **How it works**, three numbered steps, all genuinely how it works: apply → a human reviews it → add
  products from the dashboard once approved.
- **What you get**, four cards, each a real feature of the vendor portal rather than marketing: the
  storefront (banner/logo/story), product tools (variants, category attributes, bulk CSV import),
  orders/returns/courier pickup in one queue, and payouts with a downloadable per-settlement statement.
- **The money, plainly** — see below.
- A closing CTA panel.

## 2 · Signed in: a five-step wizard, with a live preview

`components/vendor/VendorApplicationForm.tsx` is now Business → Tax → Payout → Pickup → Review, gated with
`trigger()` per step, with a jump-back rail (`furthest` is how far the applicant has been *allowed* to go, so
a section they've passed still reads as done after they step back to re-read one).

The thing that sells it is the sidebar: **`ShopfrontArt` — the same drawn shopfront a real boutique without a
banner gets on Boutique Avenue — with the name the applicant is typing appearing on its sign, live.** It is
the one delight on the page, and it's honest: it's a real thing, drawn by the real component, showing the
business they're describing.

The Review step summarises all four sections with an "Edit" link on each, masks the bank account to its last
four digits (never reprint a full account number on a screen someone may be screen-sharing), and says what
happens next. Submitting from Review with the terms box unticked is refused, with the terms error — verified.

## 3 · Already applied: one panel, with their boutique drawn on it

`components/vendor/VendorStatusPanel.tsx` replaces four one-off cards with one shape — approved, under
review, rejected, suspended — each showing the applicant's own boutique as a shopfront, so the thing they're
waiting for is visible rather than described. Copy softened where it was previously terse (a rejection now
says what to do about it instead of just "not approved").

## The interesting engineering decision: eager validation, patient reporting

A stepped form has a UX trap. Validate only on Continue and a field that was just found wanting keeps its
error sitting under a corrected value until the next tab-away. Validate on every keystroke and the applicant
is told their brand story is too short while they're still typing the first three characters of it.

React Hook Form can't give both on its own here: `reValidateMode: "onChange"` only behaves that way once the
form has *genuinely been submitted*, which never happens before the final step, because the steps are gated
with `trigger()`. (First attempt used exactly that, plus re-validation driven from a `watch()` effect — and
it silently didn't fire, because `formState` is a mutable proxy; reading it in an effect is not something to
build behaviour on. Reverted rather than patched.)

So: **React Hook Form validates eagerly (`mode: "onChange"`) and the component decides what deserves to be
rendered** — `seenFields`, a `Set` this component owns, is fed by a `onBlurCapture` on the form and by every
Continue. A message renders only for a field the applicant has actually met. Costs one handler and one Set;
buys "no error before you've reached the field" *and* "a corrected field clears as you type".

Verified with real keystrokes, not synthetic value-setting: Continue on an untouched step → the four errors;
typing a valid business name → **its** error clears while the field is still focused; blurring → nothing
reappears; a field with no error yet that's blurred while bad → the error appears then; a fresh load → zero
errors, nothing premature.

## The money numbers are real, and read live

`components/vendor/VendorSignupLanding.tsx` states the platform's payout-hold period from `platform_settings`
via `getCommerceSettings()` — never hardcoded, so the page can't drift from what payouts actually do.
`getCommerceSettings` gained `payoutHoldDays` for this; the query already selected **every** row of
`platform_settings`, so it cost no extra round trip.

The copy was deliberately tightened to only what the code can prove: commission is "taken out of your payout
for that order — you are never invoiced for it up front" (it is only ever deducted, in
`lib/commerce/totals.ts`), and a refund shrinks that item's earnings in proportion (the same two sentences the
vendor portal's returns page already uses). An earlier draft claimed "no listing fees", which is true but
unverifiable from the codebase — absence of a feature isn't evidence of its absence — so it was dropped.

**The commission *rate* was removed at the client's request, after a first draft showed it.** The rate is
per-boutique (`resolveCommissionRate` falls back from `vendor_private.commission_rate` to a category rate to
the platform default), so a single "standard" percentage on a public page was both the first public statement
of a commercial term *and* not necessarily any given applicant's rate. The panel now says commission is "per
order", and the footnote hands the detail to the vendor terms instead of a number. Verified: no `%` anywhere
on `/vendor/register`.

## The vendor terms now exist

The checkbox had always said applicants agree to "the GiftPing vendor terms and commission structure", and the
customer Terms & Conditions said boutiques "agree to our seller terms" — and no such page existed anywhere
(`grep -rn "vendor terms"` found the checkbox and the schema, nothing else). `app/vendor/terms/page.tsx` is now
that page, built on the existing `LegalPage` component/idiom, so it inherits the same "Draft — awaiting legal
review" notice every other policy page shows until `SITE.legalReviewed` is flipped in `lib/site.ts`.

Every claim in it is something the code does: applications are read before a boutique goes live; new products
start `pending` and vendor edits to a live listing are sent back to review; commission is deducted from the
payout, never invoiced; a line becomes payable a set number of days after delivery, which covers the returns
window; returns shrink that item's earnings in proportion and a shortfall carries to a later payout; a
suspended boutique's products stop being purchasable (`lib/commerce/cart.ts`). It deliberately states **no
commission percentage**.

It is a **public** page on purpose — added to `VENDOR_PUBLIC_PATHS` in `lib/auth/paths.ts` (with a test), the
same exception `/vendor/register` already had, because someone must be able to read the terms *before* they
have an account. It is deliberately **not** in the sitemap: `PRIVATE_PATHS` in `lib/seo/robots.ts` disallows
everything under `/vendor/`, and the funnel isn't meant to be indexed. The checkbox links to it in a new tab,
so reading them can't throw away a half-filled application. The customer Terms page now links its "vendor
terms" reference to it too, which needed `LegalPage`'s body to accept a node (`{ node: … }`) alongside strings
and bullet lists — a policy linking another policy is a normal thing for that component to do.

## Verified live

Against the dev server, at 1440 and 414, with real input:

- **Signed out** — headline, all three sections, all four value cards, money values `Per order` / `7 days` /
  "In proportion" with the `7 days` read from the live settings row and **no `%` anywhere on the page**, and the
  hero image confirmed to be `world-boutiques.webp` (not just "an image loaded"). Mobile `scrollWidth` 399 < 414.
- **`/vendor/terms` while signed out** — the page a signed-out visitor must be able to read: it stayed on
  `/vendor/terms` (no bounce to sign-in), rendered its eleven numbered sections, and showed the draft notice.
  `/terms` renders the same as before with its "vendor terms" link now pointing at it, and "seller terms" gone.
  Mobile `scrollWidth` 399 < 414.
- **The wizard** — rail renders all five steps; Continue on an empty step stays put and shows exactly the
  four per-field errors; the shopfront sign tracks the typed name (`AURELIA TEST BOUTIQUE`); all four steps
  advance cleanly; **the Review step shows every value entered in steps 1–4**, which is the assertion that
  matters (it proves form state survives the inputs unmounting as steps change — React Hook Form's default
  `shouldUnregister: false`); the account number renders masked as `•••• 9012`.
- **The submit guard** — from Review with the terms box unticked, submission is refused with the terms error
  and the page stays on `/vendor/register`. **The application was deliberately not submitted**: the submit
  path is unchanged code, and a real submission would write a real vendor row for a test account. Full
  end-to-end submission of this form was verified in earlier sessions; what's new here is presentation,
  gating, and the disabled-submit behaviour, all of which were exercised.
- **An existing vendor** (`test-vendor@giftping.test`) — the status panel renders "Application approved /
  Lumière Keepsakes is live in the mall", with the boutique's own name on the drawn shopfront sign.
- **Mobile** — the compact "Step 1 of 5" header + progress bar replaces the rail, the preview falls below the
  step card, `scrollWidth` 399 < 414.

Regression: `tsc`, `eslint`, **582/582 tests** (the new ones are the `/vendor/terms` public-path assertion and
the vendor-decision email), and `npm run build` all clean. `/vendor/register` and `/vendor/terms` are both `ƒ`.

## The loop now closes (follow-up)

The rebuild made the application *look* finished, which threw the real gap into relief: a submitted application
told nobody, and a decision told nobody outside the app. Approving a vendor silently flips `users.role` to
`vendor`, so a person could be granted a dashboard and never learn it existed. Three notification points were
added, each on the existing `notifyUser` path (`lib/notifications/notify.ts`) — never a second way to notify:

| Moment | Who | Delivered as | Where |
| --- | --- | --- | --- |
| Application submitted | every active admin | in-app + push | `lib/vendor/actions.ts`, after the row is committed |
| Approved | the applicant | in-app + push + **email** (`buildVendorDecisionEmail`) | `lib/admin/actions.ts` |
| Rejected | the applicant | in-app + push + **email**, with the reviewer's reason | `lib/admin/actions.ts` |

- Admin alerts carry **no email** — the same convention as a new return request (`lib/commerce/returns.ts`),
  because "notify the admins" has always meant the bell and the push, not a shared inbox.
- The decision email says what the outcome is and what to do next (open the dashboard / reply about a fixable
  rejection). It never states a commission rate, and it never promises a re-application path — there isn't one.
- `vendorFooter()` was introduced for vendor mail: the shared footer says "because of your GiftPing order",
  which is untrue for someone approved before their first sale. The existing suspension email now uses it too.
- Approving/rejecting remains tolerant of delivery failure: `notifyUser` never throws, and both writes happen
  after the database change, so a Resend outage cannot roll back an approval.

Verified live, with two throwaway accounts (since deleted, cascade took their vendor and notification rows):
both applications raised an admin note; approving set `role=vendor` + `status=approved`; rejecting stored the
reason on `vendor_private` and in the applicant's note; `sendEmail` returned `ok: true` with a real Resend id
for both templates (the sending domain is verified, so this is not test-mode).

## Deliberately not done

- **No new CSS in `app/globals.css`** — the whole rebuild is composed from existing tokens, existing
  components (`Button`, `Card`, `Reveal`, `Ambience`, `ShopfrontArt`, `WorldCard`), and Tailwind. Nothing to
  re-tune for a festival theme, nothing to reconcile with `css-order.test.ts`.
- **`ShopfrontArt`'s sign is `slice(0, 22)`** and a long name can extend past the drawn board. That's the
  shared component's existing behaviour on Boutique Avenue cards too — left alone rather than changed for
  this one usage.
- The `auth-welcome` two-panel frame was *not* reused. The vendor page is inside `app/vendor/layout.tsx`'s
  `max-w-6xl` container, so the hero is a rounded panel inside the container rather than a viewport-bleeding
  doorway — the /vendors-style treatment, contained.
