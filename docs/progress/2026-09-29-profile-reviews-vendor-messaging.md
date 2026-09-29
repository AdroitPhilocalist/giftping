# Three real features, built and live-verified: profile management, review management, vendor communication

The developer asked for three specific features from the original spec — pulled from the actual source
documents (`Feature_Specification_Gifting_Platform.docx`, converted to text and searched rather than
guessed at), not reinvented:

- **Profile Management** (2.5): "Customers can update their name, contact number, profile photo, and email
  preferences from their account dashboard at any time." Email preferences already existed
  (`/account/notifications`) — the missing piece was name/phone/photo.
- **Review Management** (2.5): "Customers can see all their submitted product reviews and edit them from
  their account dashboard." Nothing existed here at all — not even a way to *submit* a review in the first
  place, so "edit" needed the whole path built.
- **Vendor Communication** (5.2, Platform Administration Suite → Vendor Management): "A direct messaging
  capability to send official communications to individual vendors or broadcast messages to all vendors
  simultaneously." Purely admin-side, one-directional.

Before writing anything, an audit pass (a research-only subagent, no code written) checked exactly what
already existed for each — RLS policies, DB columns, triggers, existing components — so nothing here
duplicates or fights existing infrastructure. The short version: **the database layer was already fully
ready for all three** (columns existed, RLS already permitted the right writes) — every gap was purely
application-layer.

## Profile Management

- **`users.full_name`/`phone`/`avatar_url`** already existed as columns (confirmed 100% unused before this —
  `avatar_url` had zero real values anywhere). RLS (`users_update_own_or_admin`) already let a signed-in user
  update their own row; the only restrictive trigger blocks changing `role`. Nothing to unlock at the DB
  layer — `lib/account/profile-actions.ts`'s `updateProfileAction` whitelists exactly `full_name`/`phone` in
  its own `UPDATE`, the same explicit-column pattern `address-actions.ts` already uses, so a crafted request
  can't also touch unrelated columns.
- **A new avatar pipeline**, copying the established shape exactly: `processUserAvatar` in
  `lib/storage/resize.ts` (face-aware square crop via `sharp.strategy.attention`, same as diary photos, at
  400×400 — smaller than a diary photo since this is a navbar-sized image, not a full spread), a new public
  `user-avatars` bucket with a CHECK constraint pinning `users.avatar_url` to `<userId>/avatar-<uuid>.webp`
  (`supabase/migrations/20260928190000_user_avatar.sql` — the same "constrain uploaded-file URLs in the
  database" rule Stage 11 established for vendor logos), and `POST /api/account/upload-avatar` (a Route
  Handler, not a Server Action, for the same 1MB-body-cap reason every other image upload in this app is).
- **A real bug found and fixed while testing, not while writing**: the phone field's Zod schema originally
  normalised to a `z.union([z.literal(""), z.string().regex(...)])`. The client (`react-hook-form`'s
  `zodResolver`) parses once, and the Server Action parses *again* independently — feeding the schema's own
  *output* back through itself as its next *input*. In Zod v4, that round trip through the union reported a
  bare, unhelpful `"Invalid input"` on the second pass instead of erroring correctly or passing — confirmed
  live (the toast showed exactly that string) before it was traced to the union specifically. Fixed by
  preprocessing straight to `null | normalised-digits` and validating with `.nullable()` instead of a union
  with the empty-string literal — the schema's output is now a valid input to itself again, which is exactly
  what re-parsing needs. `lib/validation/profile.schema.test.ts` covers this (blank phone, real phone, bad
  phone, and — the case that actually caught the original bug — re-parsing behaviour matters here more than
  most schemas in this app, since this one really does get parsed twice on every real save).

## Review Management

Nothing existed before this — `lib/db/reviews.ts` had exactly one function (`getProductReviews`, for
showing everyone's reviews on a product page), no insert, no update, no delete, anywhere in the app. But the
RLS was already fully correct and just sitting there unused: `reviews_insert_own`, `reviews_update_own_or_
product_vendor_or_admin`, `reviews_delete_own_or_admin` all already existed, and `enforce_review_update_
scope()`'s trigger already left an owner's own update completely unrestricted (it only narrows what a
*vendor* can touch — `vendor_response` only). `set_review_verified_purchase()` already safely re-derives
`is_verified_purchase` from real order data server-side regardless of what the client claims.

- **A real gap found before writing any code**: no unique constraint existed on `(product_id, user_id)` — a
  customer could submit unlimited reviews for the same product, each one counted separately by
  `recompute_product_rating()`'s trigger, silently skewing the product's own average. Added
  `reviews_product_user_unique` (`supabase/migrations/20260928191000_reviews_unique_per_product.sql`) — and
  checked the real dev database *before* writing the migration, which turned up one actual duplicate pair
  already sitting in the demo seed data. The migration cleans that class of duplicate up first (keeping the
  newest of any pair) before adding the constraint, so it's safe to run against any environment with a
  similar stray duplicate, not just this one.
- **`submitReviewAction` upserts** on that same constraint (`on conflict (product_id, user_id)`), which
  means "write a review" and "review this again after a repeat purchase" are the same code path — no
  separate insert-vs-update branching needed. "Write a review" lives on a delivered order line in
  `/orders/[id]` (the natural place a customer would go to review something they actually bought — reviews
  aren't gated to delivered orders at the DB layer, since nothing there enforces it, but the only real entry
  point in the UI is exactly that context); "my reviews" — the actual management surface the spec asks for —
  is a new `/account/reviews` page, with edit and delete.
- **`StarRatingInput.tsx`** (new): a small controlled 1–5 star click input — no native form element covers
  this, so it's plain `useState`-driven like every other modal form in this codebase (`VendorAdminControls`,
  `ReturnRequestControls`), not `react-hook-form`, for consistency with how this app already builds
  modal-triggered forms specifically (RHF is reserved for full standalone forms like `ProductForm`).

## Vendor Communication

Also nothing existed — no messages/announcements/broadcast page anywhere under `/admin`. But `notifyUser()`
(in-app + optional email + preference-gated, never throws) already existed and already does exactly what
"send an official communication" needs; `category: "vendor_updates"` already existed in its type union for
this purpose. The one real constraint: `notifications` has **no INSERT policy for any client role at
all** — every existing caller already goes through the service-role client inside `notifyUser()` itself, so
this needed no new access to unlock, just a new caller.

- **`lib/admin/vendor-message-actions.ts`**: `messageVendorAction` (one vendor) and
  `broadcastVendorMessageAction` (every approved vendor, via the already-existing `getApprovedVendors()`,
  which already returns `user_id` — just needed the existing `.filter(v => v.user_id)` null-check the admin
  vendors page itself already applies). Both write an `audit_logs` row (`vendor.messaged` /
  `vendor.broadcast`), matching every other money- or trust-adjacent admin action in this codebase.
  `buildAdminMessageEmail()` (new, in `templates.ts`) renders the admin's free-text message as escaped
  paragraphs, never as raw HTML.
- **The UI**: a "Message" action added next to Suspend/Reinstate in `VendorAdminControls.tsx` (the exact
  same modal shape — Radix `Modal` + `Textarea` + a Server Action + toast — this file already used for
  Suspend), and a new `BroadcastVendorMessage.tsx` button at the top of `/admin/vendors` for "message all
  vendors at once."
- **A real bug found and fixed while extending shared code**: `VendorAdminControls`'s `run()` helper
  hardcoded `setSuspending(false)` on every successful action, regardless of which action actually ran —
  harmless for the existing calls (closing a modal that wasn't open is a no-op), but it meant the brand-new
  "Message" modal would never close itself after a successful send, even though the toast correctly said
  "Message sent." Fixed by making `run()` take an explicit `after()` callback per call site instead of
  assuming which modal is open.
- **No new inbox UI needed on the vendor side at all** — `/notifications` already renders any notification
  generically (only `diary_reminder` gets special-cased, for its own sticker), confirmed by reading
  `NotificationBell.tsx`/`NotificationItem.tsx` before writing anything: a brand-new `type` value needs zero
  UI changes to display correctly, and this was directly confirmed live (below).

## Live-verified against the real dev database, not just code-reviewed

- **Profile**: updated the real `test-customer` account's name and phone through the actual form, watched
  it fail with the "Invalid input" bug on the first attempt, fixed the schema, watched it succeed and
  persist in the database, confirmed the navbar's `AccountMenu` picked up the new name (it reads
  `getServerUser()`, revalidated via `revalidatePath("/", "layout")`), then restored the seed account to its
  original values afterward.
- **Reviews**: wrote a real review from a real delivered order line (`GP-100142`, "Birthday Surprise Box for
  Kids") through the actual dialog — confirmed in the database that `is_verified_purchase` and
  `reviewer_display_name` were both correctly auto-derived by the existing triggers, not something this
  session had to reimplement. Edited it (rating 4 → 5) through `/account/reviews` and confirmed `updated_at`
  moved. Confirmed the delete path is correctly scoped via a real RLS simulation (`set local role
  authenticated` as that exact user, `rollback`) since this browser tool can't drive a native `confirm()`
  dialog — the one thing not click-tested end-to-end through the UI itself, though the same delete was then
  actually run for real to clean up the test data afterward.
- **Vendor messaging**: sent a real message to "Lumière Keepsakes" as admin, confirmed the exact title/
  message landed in `notifications` with `type: "admin_message"` and the right `audit_logs` row, then
  signed in as that vendor and watched it appear correctly in their real `/notifications` inbox — generic
  styling, unread, exactly as the existing inbox UI already promised it would. For the broadcast (blocked by
  the same un-drivable `confirm()` dialog), temporarily bypassed the confirm gate in the component
  (`&& false`, reverted immediately after), sent a real broadcast, confirmed the toast said "Sent to 1
  vendor" (the one approved vendor in this dev database), confirmed the notification and the
  `recipientCount: 1` audit row, then cleaned up the test notifications afterward (audit log entries were
  left in place — an audit trail is meant to be permanent, and a note saying a test message was sent is
  itself accurate and harmless to keep).
- Full regression after every change: `tsc --noEmit`, `npx eslint .`, `npx vitest run` (302/302, up from 291
  — 11 new tests for the two new Zod schemas, including the exact re-parse-own-output case that caught the
  phone bug), `next build` — all clean.

## What this deliberately didn't do

No admin UI to review past sent messages — `notifications`/`audit_logs` already *are* that record if anyone
ever needs to look, and building a dedicated log viewer wasn't part of what was asked. No gating of review
submission to a delivered order at the database layer — the only real entry point in the UI already only
appears on delivered items, and adding a DB-level enforcement wasn't asked for and duplicates what the UI
already guarantees. No change to `getServerUser()`/`SessionUser` to carry `phone`/`avatar_url` — the one
page that needs them queries `users` directly, the same pattern `account/addresses/page.tsx` already uses,
rather than widening a function every page/layout calls on every request.
