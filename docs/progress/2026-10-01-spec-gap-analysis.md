# Full assessment against the original 112-feature spec

The developer asked for an honest stock-take against the actual agreed scope — not the stage-by-stage
build log, the original `Feature_Specification_Gifting_Platform.docx` itself (112 features across 7
sections) — plus "complete what you can, tell me the rest." Converted the doc to text and went through it
feature by feature, verifying uncertain ones directly in code (a research-only pass, nothing taken on
faith) rather than from memory of what was built.

## Result: ~100 of 112 features built. ~12 genuine gaps, in three groups.

### Group A — small, no dependency, fixed today

1. **Price range filter** (2.2): the backend (`lib/db/products.ts`'s `minPrice`/`maxPrice`) already existed
   and was unused — `components/shop/ShopFilters.tsx` now has a min/max price form (plain GET, works
   without JS, like every other filter here), wired through `app/(shop)/categories/[slug]/page.tsx`'s
   `hrefFor`/`buildHref`/`filters`. Live-verified: filtering `/categories/birthday` to ₹1500+ correctly
   dropped 9 products to 3.
2. **Admin "Feature a vendor" toggle** (5.4): `vendors.is_featured` already drove the homepage showcase and
   the header's Boutiques mega-menu (`getFeaturedVendors()` in `lib/db/vendors.ts`) but could only be set by
   editing seed data — there was no admin control. Added `setVendorFeaturedAction` (`lib/admin/
   vendor-actions.ts`, audit-logged, same shape as the existing suspend/commission actions) and a toggle
   button in `VendorAdminControls.tsx`. Live-verified: featured Lumière Keepsakes, confirmed it appeared on
   the homepage, unfeatured it again to restore state.
3. **Welcome email on registration** (6.1): nothing sent one — `signUpAction` only called
   `supabase.auth.signUp`. Added `buildWelcomeEmail` (`lib/notifications/templates.ts`, same
   `renderEmailFrame` pattern as every other transactional email) and a `notifyUser()` call: from
   `signUpAction` itself for the email/password path (unambiguously a new account, no detection needed),
   and from `app/auth/callback/route.ts` for Google OAuth — which also handles *returning* sign-ins and the
   *same* email-confirmation link later, so a new category, `"account"`, was added to `NotificationCategory`
   (not user-toggleable, always allowed) and a `created_at`/`last_sign_in_at` proximity check (<5s) picks out
   a genuinely brand-new OAuth session without re-firing on a later, ordinary sign-in.
   - **Verification gap, honestly**: couldn't complete a live end-to-end signup to watch the real email land,
     because of the already-documented Supabase shared-SMTP rate limit on auth emails
     (`429 over_email_send_rate_limit`, see the Auth section of `CLAUDE.md`) — two back-to-back signup
     attempts both failed at `supabase.auth.signUp()` itself (confirmed via direct DB query: neither created
     an `auth.users` row), which is the exact same pre-existing constraint already on file, not something
     this change introduced. Verified instead by: `tsc`/`eslint` clean, the code path placed correctly
     relative to the existing error branches (never attempted when signup itself fails), and matching the
     established template/notify pattern exactly. Worth a real end-to-end check later, with real Resend
     credentials and outside the rate-limit window (the same caveat already on file for order/shipment
     emails).

### Group B — genuinely blocked on something outside this codebase

4. **Automated vendor settlements via Razorpay Route** (4.4): still manual (admin creates a settlement,
   marks it paid) — already an open question in `PROGRESS.md` ("Razorpay Route vs manual settlement — client
   decision"). Razorpay Route needs each vendor onboarded as its own linked sub-account with their own KYC
   approval at Razorpay — a real business process requiring the client's sign-off and each vendor's
   cooperation, not something to switch on from code alone. The manual system already works correctly today.
5. **Delivery speed options — Standard vs Express** (7): `lib/commerce/delivery.ts` only returns
   serviceable/unserviceable + one ETA per vendor; there's no live Shiprocket account configured yet to query
   real differentiated rates/speeds per pincode (the project has never had real Shiprocket credentials — see
   "Unverified with real Shiprocket" in the Stage 8 notes). Building a second delivery tier now would mean
   either hand-waving a flat "express" surcharge not backed by a real courier capability, or waiting for real
   API access to build it against real data.
6. **Return shipment booking / reverse pickup** (7): `lib/admin/refunds.ts`'s return flow is refund-only
   today — approving a return never calls `createShiprocketOrder`/`generatePickup` for an actual reverse
   pickup, just tells the customer "we'll arrange the pickup" and processes the refund. Same root cause as
   #5: no real Shiprocket account to build and test a real booking call against yet. The code shape to add
   this later is the same as the existing forward-shipment booking in `lib/vendor/dispatch.ts` — straightforward
   once real credentials exist.
7. **Product view-count tracking** (4.2): `products.view_count` has existed, unused, since Stage 1 — nothing
   increments it. Not blocked by anything external, just genuinely low-value on its own (no feature currently
   reads it back) and worth deferring rather than adding write traffic to every product page for a number
   nothing displays yet — see Group C.
8. **Animated/cinematic mall entrance** (2.1): a deliberate scope decision made early on (`CLAUDE.md`'s stack
   section: "illustrated + Framer Motion... not a real 3D/WebGL scene," Framer Motion never installed) — what
   exists today is CSS entrance animation (`.rise`, `Reveal`), not the spec's envisioned cinematic
   scroll-driven sequence. Not "broken," a real, named simplification — enhancing it is a design/animation
   project in its own right, needing direction on what the sequence should actually show, not a quick fix.

### Group C — not blocked, but real enough in scope that they need a priority call, not a silent build

9. **Search autocomplete** (2.1): `SearchBar` is a plain submit-to-results form today — no live typeahead.
   Doable, but a real UX design decision (what shows in the dropdown — products only, or products +
   vendors + categories as the spec asks; how it behaves on mobile).
10. **Admin category management UI** (5.4): categories only exist via `scripts/seed.ts`/`seed-demo.ts` today
    — no `/admin/categories` route. A real CRUD UI (create/edit/reorder, matching the no-code promise in the
    spec) is a clear, bounded task, just sizeable enough to deserve its own turn rather than being bundled in
    silently.
11. **Admin SEO/metadata management** (5.4): no admin UI edits meta titles/descriptions/slugs for category
    or homepage pages (product pages already read `meta_title`/`meta_description` per-product, just nothing
    admin-facing for the rest).
12. **Platform-wide financial report export** (5.5): only a per-vendor settlement CSV exists
    (`lib/admin/settlement-csv.ts`); a broader GMV/commission/refunds/net-revenue export for an arbitrary
    date range doesn't yet.
13. **Wishlist price-drop alert** (6.1): no code tracks a wishlisted product's price over time or notifies on
    a drop — needs a real design for "price when added" tracking, not just a notification call.
14. **Admin customer-growth trend / repeat-purchase rate** (5.1): the dashboard shows only a single
    "new sign-ups in the last N days" count — no trend line, no repeat-purchase metric.
15. **Promotional/marketing email campaigns to customers** (6.1): the only "campaign" tooling today is
    admin-managed homepage banners (on-site) and the vendor-only broadcast message (admin→vendors, built
    2026-09-29) — nothing sends a segmented marketing email to an opted-in customer list. The biggest of this
    group: real scope (audience selection, template, compliance with the existing opt-in preference), not a
    quick addition.

## What this does NOT include

Image/asset generation (regenerating the 4 flawed occasion-world images, the 20 product photos, more
shopfronts) is tracked separately in `docs/design/asset-prompts.md` — the developer explicitly deferred that
work this session, so it's not counted as a "feature" gap here even though it affects visual polish.

## Regression

`tsc --noEmit`, `eslint .`, `vitest run` (302/302), `next build` all clean after all three Group A changes.
