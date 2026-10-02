# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

> **Deployment:** https://giftping-lime.vercel.app (Vercel, auto-deploys from `master`). Webhooks: `/api/webhooks/razorpay`, `/api/webhooks/courier-tracking`. Daily cron: `/api/cron/diary-reminders`.

**Stage 9 — Personal Gifting Diary + daily cron** ✅ built and verified locally. **Stage 10 — email + web push built** (`notifyUser()` = in-app + email + push, preference-gated; real Resend in test mode; real OneSignal wired). **Web push verified for real on the deployed site (Safari, 2026-09-20)**: subscribed via Account → Notification settings, OneSignal showed an enabled SafariPush linked to the user's id, a direct push and the production diary cron's push were both received, and a second cron run sent nothing (exactly-once). Not yet tried in Chrome/Brave (Brave needs "Use Google services for push messaging" turned on). Remaining: Supabase auth SMTP (needs a domain). **Stage 7 (payments) is now fully verified with a real Razorpay test payment**
(real webhooks confirmed the order once, replays were no-ops, stock/cart/notifications correct). Next: **Stage 12 in progress — slice 1 (design foundation + theming) and slice 2 (homepage, `/mall` directory, placeholder art, `npm run images:sync`) done, see `docs/progress/2026-09-21-stage-12-*.md`**; **slice 3 (product page + delivery checker + first real artwork: hero, map, cards) done, see `docs/progress/2026-09-21-stage-12-product-page.md`**; **slice 4 (order tracking, diary desk, About/Contact/Privacy/Terms/Refunds, real robin + logo wired) done, see `docs/progress/2026-09-21-stage-12-tracking-diary-pages.md`**; **slice 5 (cart + checkout polish) done, see `docs/progress/2026-09-21-stage-12-cart-checkout.md`**; **slice 6 (wrap-style choice, My orders, shop by relationship, account hub, 404) done, see `docs/progress/2026-09-21-stage-12-orders-wraps-relationships.md`; ALL Batch 1 artwork delivered and wired**; **slice 7 (theme scheduling + admin preview, `/admin/themes`) done, see `docs/progress/2026-09-22-stage-12-theme-scheduling.md` — no festival theme built yet, waiting on the client to ask**; **slice 8 (performance pass) done, see `docs/progress/2026-09-22-stage-12-performance-pass.md` — memoized `getActiveTheme()`/`getProductBySlug()` (were re-querying up to 8x per homepage request), parallelized several page-level query waterfalls, fixed two real image-preload bugs (Logo, HomeHero/auth panel), removed zod from the product-page bundle, added AVIF**; **slice 9 (robin mascot moments + basket-themed cart) done, see `docs/progress/2026-09-22-stage-12-robin-mascot-moments.md` — custom robin cursor, "add to cart" fly-to-basket animation, payment-confirmed celebration, cart redesigned as a woven basket**; **slice 10 (Batch 2 artwork wired, cursor drift fixed, 57-product demo database + `npm run seed:demo`) done, see `docs/progress/2026-09-23-stage-12-batch2-cursor-demo-data.md`**; **slice 11 (the Personal Gifting Diary redesigned — a book on a desk: front page, person pages with a gift plan, year at a glance, gifting-year review, paper dialogs, private photos, new reminder email, bell dropdown) done, see `docs/progress/2026-09-25-stage-12-diary-redesign.md`**; **slice 12 (quick fixes: robin cursor / condensing header / diary fits the window; page pass 1: gift-tag cards, occasion worlds, Boutique Avenue, live gift-card preview) done, see `docs/progress/2026-09-26-stage-12-quick-fixes-and-page-pass-1.md` — pass continues with cart/checkout/orders/account/home**; **slice 13 (the diary is now a real book you flip through — 7 spreads that grow with your people, a hinged-leaf page turn, section tabs, contents page, keyboard/swipe, `?p=` bookmarks, no vertical scroll on a big screen) done, see `docs/progress/2026-09-27-stage-12-diary-flip-book.md` — the person/year/review pages still use the older two-page book;** **slice 14 (the front spread is back to everything-in-small with a "see more" on each piece, no contents page; the pager under the book is gone — "Turn the page →" and a curling paper corner are written on the pages themselves; FitPage scales any page to the window) done, see `docs/progress/2026-09-27-stage-12-diary-front-spread-and-page-corners.md`;** **slice 15 (diary was silently blocking all page scroll near it — a leftover `overscroll-behavior` from the old two-page book; local sign-in was redirecting to the production deployment because `getAppUrl()` trusted `NEXT_PUBLIC_APP_URL` over the request's own origin) done, see `docs/progress/2026-09-27-stage-12-diary-scroll-and-local-auth-redirect.md`;** **slice 16 (navbar redesigned, then corrected same-day to match the client's own approved reference — a flush full-width dark-green bar at rest, condensing to a floating pill on scroll; real hover mega-menus for Occasions/Boutiques; a rebuilt account-menu dropdown; every header icon/link restyled; My Diary is now a quiet outlined pill) done, see `docs/progress/2026-09-28-stage-12-navbar-redesign.md`;** **slice 17 (homepage hero photo now runs the full page width with the headline overlaid on it, per the client's actual mockup; the announcement strip and header now share one exact colour at their seam instead of two independently-tuned bars) done, see `docs/progress/2026-09-28-stage-12-full-bleed-hero.md` — not re-verified visually, local preview access got stuck on a permission gate;** **slice 18 (the announcement ribbon removed entirely — a real theme-system field, not just a component; the white gap between header and hero photo fixed — a real height bug; hero text now stays legible regardless of what's behind it; the header's green given real depth) done, see `docs/progress/2026-09-28-stage-12-announcement-removed-hero-fixes.md` — verified visually this time;** **an overnight full-site QA + security pass done, see `docs/progress/2026-09-28-overnight-qa-and-security-pass.md`** — all three roles (customer/vendor/admin) clicked through end to end with real data, including the full vendor-onboarding→category-approval→storefront pipeline and the `/admin/themes` preview mechanism, both previously unconfirmed; a real header-height regression restored (a same-day revert had silently dropped it); a 16-check RLS audit against the real dev DB (customer/vendor/admin/anon isolation, cross-user FK guard, diary no-admin-bypass) all passed with no regressions; baseline security response headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) added to `next.config.ts` — a real gap, Vercel doesn't set these itself. No destructive/load/DDoS testing was attempted, by design. **A real Content-Security-Policy done and live-tested, see `docs/progress/2026-09-28-csp.md`** — a per-request nonce + `'strict-dynamic'` in `proxy.ts` (Next's own current recommendation over a host allowlist), verified against a real Razorpay checkout session (including a second script it dynamically loads that nobody would have thought to hand-allowlist), a real Supabase Storage image request, and the real OneSignal SDK script — all clean, zero violations; full regression (tsc/291 tests/eslint/build) clean. OneSignal's and Sentry's `connect-src` couldn't be live-exercised from localhost (both gate themselves off outside their configured production origin/env) — correct by configuration, not yet by an observed network call; needs one real check after the next deploy. **The desktop navbar now floats as a rounded, genuinely glass-like pill from first paint (not only on scroll) per a fresh client reference — see `docs/progress/2026-09-28-navbar-floating-pill.md`** — a deliberate reversal of slice 16's flush-at-rest, "never transparent" decision, done on direct instruction against a new reference image, and it took **four** same-day corrections to actually get right — the fourth was the real bug: the header was `position: sticky`, which still reserves its own box in document flow, so the hero photo genuinely never extended behind it at all (confirmed via `getBoundingClientRect()`) — no colour/blur tuning could ever have fixed "I see the plain page background behind the navbar," because that background really was the only thing there. Fixed by making the header `position: fixed` instead, with `<main>` in `app/layout.tsx` carrying matching `padding-top` (so every other page is pixel-identical to before) and `HomeHero.tsx`'s hero section cancelling that padding with a negative margin (so its photo bleeds up behind the now-floating header while its actual text content stays exactly where it was). See `docs/progress/2026-09-28-navbar-floating-pill.md` for the full four-correction history. First pass kept a solid opaque fill (wrong). Second pass added translucency but with `blur(18px)` and up to 0.85 alpha — technically see-through but heavy enough to erase all photo detail into an abstract colour blur (still wrong — caught only once the developer compared reference vs. live side-by-side). Final: `.gp-header-glass` is a *light* dark-green gradient (~0.4 alpha at the logo/icon ends, ~0.14 in the middle) with only `blur(3px)`, so the actual hero photo — the skylight, the hanging lights, the ceiling — stays sharp and recognisable through the bar, just lightly tinted. Condensed-on-scroll still switches to a solid fill for legibility over arbitrary page content. **Trade-off accepted deliberately, not fixed**: this light a tint reads great over the homepage's dark-toned hero photo but weakens contrast on non-hero pages (`/mall`'s plain cream background now shows through quite strongly) — flagged in the log rather than re-tuned again, since a real fix would be a page-aware variant (lighter only when a hero photo is actually present), not another single opacity number. The homepage's "Watch Our Story" button was also wrongly outlined/transparent — now a solid cream pill with dark text, matching the reference. The announcement strip is no longer rendered anywhere (a real, flagged divergence from every OTHER approved client mockup, which all still show one — worth reconciling with the client); mobile/tablet unaffected, still flush per the approved mobile mockup. Third: the low-alpha gradient itself was already right, but it was paired with `backdrop-filter: blur(3px)`, which rendered as a flat, muted grey on whatever device produced a later round of screenshots (never reproduced on this machine) — `backdrop-filter` on a `position: sticky`, mid-transition ancestor is a known cross-engine compositing risk, and macOS/Windows' own "Reduce Transparency" setting makes several browsers substitute a flat colour for `backdrop-filter` specifically, by design. Removed `backdrop-filter` entirely rather than chase a device-specific repro — a plain semi-transparent `background` (what's left) has no equivalent failure mode and looks identical on a normally-configured browser. Live-verified at every step (shape, translucency, and photo-sharpness against the reference; a real width-overflow bug found and fixed; scroll/condensed transition; mega-menu; mobile) and full regression clean after each correction. **The individual boutique storefront page (`/vendors/[slug]`) redesigned to match a client-supplied style reference, see `docs/progress/2026-09-28-vendor-storefront-redesign.md`** — a full-bleed banner hero (`VendorHero.tsx`, using the exact same fixed-header bleed technique as the homepage) plus a 4-card "why shop here" feature grid (`VendorFeatureGrid.tsx`); the reference depicted one real boutique's own copy ("hand-poured", "candles"), so the four claims were deliberately generalized into a **generic, truthful, partly data-driven** set (featured status and founding year pulled from real columns when set, universal gifting-platform claims otherwise) rather than hardcoding that one vendor's marketing language into the shared template — verified live against three different real vendors (featured-with-founding-year, featured-different-year, and not-featured-with-no-founding-year) to confirm it actually adapts rather than assuming every boutique looks like the reference. The `/vendors` listing page and its card component are untouched (the ask was specifically the individual boutique page). **Three real spec features built and live-verified: Profile Management, Review Management, and (admin-side) Vendor Communication — see `docs/progress/2026-09-29-profile-reviews-vendor-messaging.md`.** All three were audited against the actual spec docs first (`Feature_Specification_Gifting_Platform.docx`, converted and searched, not guessed at) and against the existing codebase (a research-only subagent pass) before writing anything — the database/RLS layer was already fully ready for all three, every gap was application-layer. Profile: `/account/profile` (name, phone, a new avatar upload pipeline copying the vendor-logo pattern exactly, new `user-avatars` bucket + CHECK constraint). Reviews: `/account/reviews` (edit/delete) plus "Write a review" on delivered order lines in `/orders/[id]`, upserting on a new `(product_id, user_id)` unique constraint (found and fixed one real pre-existing duplicate in the demo seed data before adding it). Vendor Communication: a "Message" action per vendor and a "Message all vendors" broadcast on `/admin/vendors`, both riding the existing `notifyUser()` + `audit_logs` pattern untouched. Two real bugs found *while live-testing*, not while writing: a Zod v4 union that produced a bare "Invalid input" specifically on re-parsing its own already-transformed output (the phone field is genuinely parsed twice — client then server — so this only showed up under real use, not in unit tests written before the fix); and a shared modal-close helper in `VendorAdminControls` that hardcoded which modal to close, so the brand-new "Message" modal never closed itself on success even though the toast correctly said "sent." Live-verified end to end against the real dev database for all three (a real profile update, a real review with DB-triggers-derived `is_verified_purchase`/`reviewer_display_name` confirmed correct, a real admin message that showed up in the actual vendor's `/notifications` inbox, a real broadcast) — full regression clean (302/302 tests, up from 291). **The header's plain-page contrast trade-off (flagged but deliberately not fixed in the 2026-09-28 floating-pill work) is now resolved — see `docs/progress/2026-09-29-header-page-aware-glass.md`.** The client reported the header reading as "too transparent" and camouflaging with the light background on `/mall`, `/diary`, and `/account/profile`, with white nav text hard to read. Fixed by making the header page-aware rather than one fixed tint everywhere: `.gp-header-glass` now defaults to the header's own already-proven opaque fill (the same one it already used once condensed on scroll), and only switches to the original low-alpha glass tint when `<html>` carries a new `data-hero-header="true"` attribute — set by a new `HeroHeaderFlag.tsx` client component mounted inside `HomeHero.tsx`/`VendorHero.tsx` (the only two sections that actually bleed a photo up behind the fixed header). Two other options (AI-generated background photos on every page; switching the whole site to a darker default theme) were discussed with the client and rejected — the first turns a header bug into a full redesign and hurts readability on functional pages, the second is a brand-identity decision unrelated to the seasonal festival-theme feature the client had actually seen. `/diary`'s own dark desk background was deliberately not bled up behind the header this round (real layout risk in the heavily-tuned flip-book component for a purely cosmetic upgrade — the opaque default already fixes the reported complaint there) — left as a possible future polish item. Live-verified on `/`, `/mall`, `/account/profile`, `/diary`, and a real vendor storefront, at rest and condensed-on-scroll; full regression clean. **Same-day follow-up: a gilded edge for the client's "premium/golden touch" request** — a new `--gp-gold-edge` token (a light-gold → copper → bright-highlight → copper → light-gold shimmer, built from the existing copper accent rather than an unrelated yellow so it doesn't clash with the copper already used everywhere else) renders as a genuine 1.4px gradient ring around the desktop floating pill (the standard `mask-composite: exclude` gradient-border technique, since a plain `border` can't take a gradient and keep `border-radius`) and a thin bottom hairline on the mobile flush bar; the opaque fill's top sheen was also warmed from plain white to a champagne tone and its copper corner-glow strengthened. Replaces the old, barely-visible flat copper `border-color`. Verified live on the opaque pill (`/mall`), the glass pill over a photo (homepage, a vendor storefront) at rest and condensed, and the mobile hairline — see `docs/progress/2026-09-29-header-page-aware-glass.md`. **Third fix, same day: the "My Diary" pill spilling out of the header.** The client reported it vanishing against a light background when the header shrinks on scroll — investigated rather than taken at face value, and it's a real overflow bug: `.gp-header-inner`'s single-row flex needs more width than it has at real desktop sizes, and with no `overflow` set the excess renders past the pill's rounded edge onto the plain page (confirmed live: at 1280px, at rest, the pill's right edge already sat ~101px past the header's own edge; condensed is worse since its width caps at a fixed 75rem on *any* viewport). Fixed by only showing the pill from `2xl` (1536px, not `xl`/1280px) at rest, and hiding it outright once condensed (`app/globals.css`) — costs nothing real, since "/diary" is already one click away via the "Diaries" nav link and AccountMenu. The browser pane was backgrounded for part of this check, and this app's condense detection uses `requestAnimationFrame` (paused for hidden tabs), so the live condensed-scroll transition couldn't be captured end-to-end in that window — the pre-fix bug, the at-rest fix, and the CSS selector match were all still verified live; a real click-and-scroll check by a human is worth doing once. **The Occasions listing page (`/categories`) redesigned with photo cards, see `docs/progress/2026-09-29-occasions-page-photo-cards.md`.** The client noticed it looked bland next to every other major page (no imagery at all — just a heading and plain icon-in-a-circle cards) and asked whether artwork had actually been generated for it. It had — the same `world-<slug>` images `/mall`'s own destination cards already reuse — so `CategoryCard.tsx` now shows a full-bleed photo card (matching `/mall`'s exact treatment) when one exists, falling back to the original plain card otherwise (confirmed live: categories with no artwork at all — Housewarming, Thank You, Festivals — correctly still show the plain card, nothing looks broken). **Also confirmed directly, not just from the existing note**: `world-for-her.webp` and `world-for-him.webp` show real, legible third-party luxury brand names/logos (Dior, Chanel) — a genuine trademark/false-endorsement risk, not a content nitpick. Both are deliberately excluded from this new page (fall back to the plain card) until regenerated; the two existing pages that already show these same images (`/categories/for-her`, `/categories/for-him`) were left untouched since that's pre-existing and out of scope here — flagged to the developer directly so they can decide whether to also suppress those before the images are regenerated. Regression clean. **Batch 3 artwork delivered and wired (1 Oct)**: all 7 robin poses, 4 more occasion worlds (housewarming, thank-you, festivals, plus a bonus kids-baby), and the 3 "how it works" icons on `/about` — synced via `npm run images:sync`, reviewed one by one, all clean. `/categories` now shows photo cards for Housewarming/Thank You/Festivals/Kids & Baby too. The 8 diary-sticker images were also generated but turned out unnecessary (`OccasionSticker` already solves this as a built SVG component) — harmless, just unused. See `docs/design/asset-prompts.md`'s Batch 3 status section. Next: regenerate world-for-her/for-him (real brand names visible — now doubly confirmed) and world-corporate-gifting/world-birthday (off-brand slogans); the 20 real product photos (Batch 3E); Stage 13 go-live.

## Full spec gap analysis (1 Oct)

The developer asked for an honest assessment against the original 112-feature spec document (`Feature_
Specification_Gifting_Platform.docx`), not just the stage-by-stage log — converted it to text, went through
it feature by feature, verified uncertain ones directly in code rather than from memory. **Result: ~100 of
112 built.** Full breakdown, including three gaps fixed the same day (a price-range filter UI, an admin
"feature this vendor" toggle, and a welcome email on registration — all live-verified except the email's
actual delivery, blocked by the same already-documented Supabase SMTP rate limit noted in the Auth section
below) and the remaining ~9 gaps grouped by whether they're genuinely blocked on something external
(Razorpay Route settlement, real Shiprocket credentials for delivery-speed options and return bookings, the
originally-scoped cinematic mall entrance) versus just needing a priority call before building (search
autocomplete, admin category management, admin SEO tools, a platform-wide financial export, wishlist
price-drop alerts, admin growth metrics, customer marketing campaigns) — see `docs/progress/
2026-10-01-spec-gap-analysis.md` for the full feature-by-feature detail and reasoning.

## Admin Category Management built (2 Oct)

Asked to pick one of the six "needs a priority call" gaps from the 1 Oct spec assessment and build it —
chose admin category management (spec 5.4: "create, edit, rename, and reorder... no developer involvement
needed"), since the DB schema and RLS (`categories_select_active_or_admin`/`categories_write_admin_only`)
were already fully ready and unused, and `/admin/banners` was an almost line-for-line template to copy. New:
`/admin/categories` (list, create/edit dialog, hide/show, up/down reorder), `lib/admin/category-actions.ts`,
`lib/validation/category.schema.ts` (preprocesses blanks to `null` rather than a union, avoiding the same
Zod v4 re-parse-own-output bug `profile.schema.ts` hit before). Deliberately left out: sub-categories
(`parent_id`) and delete (neither used/needed elsewhere in the app). Live-verified end to end — create,
reorder, edit (including the self-row slug-uniqueness exclusion), hide/show — and **caught a real bug in my
own test methodology, not the product**: a rapid double-click landed both clicks on the same screen position
before the button's label updated, so the second click undid the first; re-verified with one precise,
reference-targeted click + an immediate DB query, which confirmed the feature itself works correctly. See
`docs/progress/2026-10-02-admin-category-management.md`. Regression clean (308/308 tests, up from 302).

## Platform Revenue Report built (2 Oct)

Second pick from the 1 Oct spec assessment's "needs a priority call" list — the exportable financial
report (spec 5.5: GMV, commissions earned, refunds issued, net platform revenue for any date range).
New: `lib/admin/revenue-report.ts` (pure, tested — buckets by IST day over an arbitrary range, reuses
`settlement-csv.ts`'s `csvCell`), `app/api/admin/revenue-report/route.ts` (plain GET, admin-gated,
downloads as CSV), a "Financial report" date-range form at the bottom of `/admin/dashboard` (plain HTML
form, no JS needed). Shows gross commission, commission reversed by refunds, and net separately rather than
one blended number, so the refund clawback is visible, not just the bottom line. **Live-verified with an
independent cross-check**: downloaded the report for Aug 1–Oct 2 (42 orders, ₹2,40,899 GMV, ₹19,721.80
commission, ₹0 refunds) and confirmed every figure matches the dashboard's own already-trusted 90-day view
for the same range exactly. See `docs/progress/2026-10-02-platform-revenue-report.md`. Regression clean
(313/313 tests, up from 308).

## Customer growth & repeat-purchase metrics built (2 Oct)

Third pick from the 1 Oct spec assessment (spec 5.1). The dashboard's lone "new sign-ups" number is now a
"Customers" section: total customers, how many have ever bought, repeat buyers (2+ paid orders, all-time) with
orders-per-buyer, the share of in-window orders that came from returning customers, and a daily sign-up bar
chart with "X of Y new sign-ups have already ordered". New: `lib/admin/customer-metrics.ts` (pure, 7 tests —
IST day bucketing, order-independent "returning" detection, zero-safe ratios), `lib/db/customer-stats.ts`
(paginated at 1,000 rows/page because PostgREST clamps bigger limits; reads ids and dates only). Customer
names/emails are never fetched. **Live-verified against an independent SQL computation** for both the 30-day
and 7-day windows — every figure matched exactly (19 customers, 14 buyers, 10 repeat, 3.00 orders/buyer,
21 of 26 window orders returning, 14 of 19 new sign-ups bought; 7-day: 2 new, empty-window shows "—" not NaN).
Regression clean (320/320 tests). See `docs/progress/2026-10-02-customer-metrics.md`.

**Row-cap bug found and fixed (2 Oct):** PostgREST silently clamps one response to the project's max-rows
setting (1,000 by default — not confirmable here: no API token, and no dev table is big enough to test), so the
revenue report's `.limit(20000)` and the dashboard's `.limit(2000)` would have under-counted past ~1,000 rows with
no error and no "truncated" warning. New `lib/db/paginate.ts` (`fetchAllRows`: `.range()` paging, exact `truncated`
via a +1 probe row, requires a total `.order()` ending in `id`; 7 tests incl. a fake server that clamps) is now used
by the revenue report (orders/payments/refunds; a range over 50k rows is refused with a 413 telling the admin to
shorten it, rather than exporting an incomplete financial report), the dashboard stats (orders still capped at the
latest 2,000 with the existing notice, now accurate; refund sums paged to 50k) and the customer metrics. Verified
live: paging the real orders table at page size 7 vs 1,000 gave identical rows/order/no duplicates, the cap flagged
truncation correctly, and the CSV + dashboard reproduce the earlier figures exactly. The *truncation* path
(>50k rows) is covered by unit tests only — no dev data is that large. See
`docs/progress/2026-10-02-customer-metrics.md` (follow-ups).

## Search autocomplete built (2 Oct)

Fourth pick from the 1 Oct spec assessment. The homepage and `/search` search box now suggests as you type:
up to 6 products (photo, boutique, price), 3 categories, 3 boutiques, then "See all results". The existing
search only matches whole words ("ham" found nothing, "hamper" did), so this needed a prefix-matching DB function:
migration `20261002100000_search_suggest.sql` adds `suggest_product_ids()` (SECURITY INVOKER so RLS still applies;
tokenises the text itself so punctuation can't cause a tsquery syntax error; applied to the linked project and
`lib/db/types.ts` regenerated). New: `lib/search/suggest.ts` + `suggestions.ts`, `GET /api/search/suggest`
(rate-limited with the already-defined-but-unused `searchRateLimit`), and `components/shop/SearchBar.tsx`
rewritten as a client combobox (180ms debounce, stale requests aborted, per-query cache, ↑/↓/Enter/Esc,
ARIA combobox roles, highlighted matches). Progressive enhancement kept: it is still a plain GET form to `/search`.
**Verified live**: API with ham / luxe mem / lum / gift / 1 char / `%` / hostile punctuation; in the browser the
dropdown overlays the hero un-clipped, keyboard nav + Enter-to-open + Esc/↓ + plain-Enter-searches + no-match state +
click-to-open all behave; typing "gift" sends one request, a pre-filled `/search?q=` box sends none on load.
338/338 tests (11 new), tsc/eslint/build clean. **Not verified**: the Upstash rate limiter (not configured
locally, so it no-ops) and screen-reader behaviour (ARIA roles are correct by construction, not tested with a real
screen reader); coordinate-based mouse clicks in the test tool kept missing, so the click path was verified by
dispatching the events on the row instead. Typing mid-word in a non-English script is untested against the
English-stemming search config. See `docs/progress/2026-10-02-search-autocomplete.md`.

## Wishlist price-drop alerts built (2 Oct)

Fifth pick from the spec assessment. When something in a customer's wishlist gets at least 5% cheaper, they get one
in-app notification (+ email/push per their settings), as a single digest if several items dropped. How it works:
migration `20261002110000_price_drop_events.sql` adds a DB trigger that queues live-product price drops into a
server-only `price_drop_events` table (so every price-change path is covered, not just the vendor form); the daily cron
runs `lib/wishlist/price-drop-job.ts`. **Key finding while designing it:** any vendor edit to a live product sends it
back to admin review, so a drop isn't real to shoppers until re-approved — so the job *waits* (up to 14 days) until
the product is live again instead of announcing an unbuyable price. Other rules: net change judged from the price
shoppers last saw (a reversed drop sends nothing), people who wishlisted after the drop are skipped, a person gets at
most one alert per product per week (anti price-cycling spam), claimed-before-send (at-most-once). Also fixed:
`wishlist_alerts` existed in the DB but was missing from the notification settings screen/action, so nobody could opt out.
**Verified live against the real DB** (trigger in a rolled-back transaction; then the real job end-to-end with cleanup):
sub-5%/increase/non-price/pending edits queue nothing; dry run changes nothing; pending product → job waits; live →
the right person notified with correct text; late wishlister not notified; re-run idempotent; cooldown held. 357/357
tests (19 new), tsc/eslint/build clean. **Not verified**: the settings page toggle was never *viewed* (browser
navigation to that page was blocked as PII handling; the code is a one-line addition to an existing list); a real email
delivery (test addresses are `@giftping.test`); the Vercel cron firing it in production; variant price changes (alerts
track the product's own base/sale price, not per-variant adjustments). See `docs/progress/2026-10-02-wishlist-price-drops.md`.

## Customer marketing email campaigns built (2 Oct) — consent-first, sized for the free Resend tier

The last item on the 1 Oct spec-gap list. Full reasoning and the go-live checklist: `docs/compliance/marketing-email-dpdp.md`
(an engineering record, **not legal advice** — counsel must review before launch) and `docs/progress/2026-10-02-marketing-campaigns.md`.
**Biggest finding:** `users.marketing_opt_in` defaulted to TRUE and nothing ever asked anyone, so 19/21 accounts looked "opted in" without
consent (invalid under India's DPDP Act). Default is now FALSE and everyone was reset: **0 opted in today, so the audience starts empty.**
What exists: an unticked sign-up checkbox (recorded only after the email is confirmed) and an off-by-default switch in
`/account/notifications`; a DB trigger logging every consent change with source + wording version (`marketing_consent_log`);
one-click unsubscribe (signed never-expiring links, confirm page so link-scanners can't unsubscribe anyone, RFC 8058 headers);
`/admin/campaigns` (draft → preview → test email → start → pause/resume/cancel, segments: everyone / buyers / non-buyers / lapsed);
a queue sender that re-checks consent per person at send time, claims before sending (at-most-once), batches via Resend's batch endpoint and
fails closed without `MARKETING_UNSUBSCRIBE_SECRET`. **Free-tier handling:** two admin-editable budgets (default 50/day, 1,500/month, UTC) —
moving to a paid plan means raising those numbers, not changing code; the admin sees "takes about N days at the current limit" before sending.
Data export now includes consent history (a bug in my first version of that — it silently omitted the section — was caught by testing).
**Verified live** (real DB + running server): trigger/log/RLS/export; sender end-to-end with an injected fake provider (budget, mid-campaign
unsubscribe, provider-not-ready, quota, ambiguous failure, re-queue, parallel runs → exactly one email each); every unsubscribe endpoint over HTTP;
admin create/validate/preview/refused-empty-start/limits/delete in the browser; sign-up checkbox default. 385/385 tests (28 new), tsc/eslint/build clean.
**Not verified:** a real email through Resend (Gmail's Unsubscribe button; Resend's real batch response shape — coded from docs); sign-up → confirmation email →
consent end to end (Supabase SMTP rate limit); the settings switch was never viewed (browser tool denied that page as PII handling); Vercel cron in production.
**Needs doing before launch (not built):** Resend paid plan + verified domain + DMARC; set `MARKETING_UNSUBSCRIBE_SECRET` in Vercel (never rotate);
bounce/complaint webhook → withdraw consent; legal review (then flip `SITE.legalReviewed`); optional re-permission prompt for existing customers; age/guardian question.

## Admin SEO tools + sitemap/robots built (2 Oct); ideas menu written

Marketing campaigns committed first (`3f88b1e`). Then the spec's admin SEO/metadata item (gap-analysis #11 — I had wrongly left it out of my "four items left" count).
**Found while building:** the Meta title/description fields in the category admin (built earlier) were saved but **read by nothing** — `/categories/[slug]` and boutique pages
set no metadata at all, and there was no `metadataBase`, sitemap or robots. Now: `/admin/seo` (editor per fixed page — Homepage, Mall, Occasions, Boutiques, About, Contact — with a live
Google-style preview, length guidance, a "hide from search" switch, reset-to-default, and a "where text is missing" panel); `site_seo` table (overrides only; no row = default);
`app/sitemap.ts` (live products/boutiques/occasions/main pages; read with the anon session so RLS decides what's listed) and `app/robots.ts` (private areas blocked, **non-production deploys fully
blocked**); per-page canonical + share cards; category/boutique/product metadata; filtered category URLs noindex. Fixed a real bug on the way: the layout's `openGraph` made every page without
its own share card show the HOME title. **Verified live:** robots/sitemap output (92 URLs, counts match the DB, nothing private), head tags on 8 page types, the full admin cycle in the browser
(too-long refused → save → live `<title>`/og:title change → noindex → sitemap exclusion → reset → row deleted), category SEO fields now reach the page. 408/408 tests (23 new), tsc/eslint/build clean.
**Not verified:** how Google/Facebook actually render the tags (no external debugger from here); the preview-deployment robots behaviour (needs a Vercel preview). **Real content gap surfaced:**
6 occasion pages (Birthday, Anniversary, Wedding, Corporate Gifting, For Her, For Him) have no description at all. **Not done (idea E12):** product structured data (JSON-LD) for rich results.
See `docs/progress/2026-10-02-admin-seo-tools.md`.

**New: `docs/ideas/DELIGHT_AND_FEATURE_IDEAS.md`** — a menu of animation/interaction and business-feature ideas with IDs, effort, "needs", cost, and suggested sprints, so you can say
"build A1 + A2". Includes an honest account of what already exists (more than I first listed: Ambience on occasion headers, GiftCardPreview, OrderStepper, wrap picker).

## Sprint 1 — "The Basket" built (2 Oct)

First sprint from `docs/ideas/DELIGHT_AND_FEATURE_IDEAS.md` (A1, A2, A5, A6; A8 not done). The cart is now genuinely a basket: **A1** the cart-page basket holds the shopper's real
product photos (drop in on arrival, jiggle on add, quantity badges, "+N"); **A2** a basket icon in the header (and tab bar) with a **mini-basket** that opens on hover and automatically after
adding to cart (desktop mouse only; touch keeps the link + toast), showing the just-added gift instantly and the full cart a moment later; **A6** a free-delivery ribbon with a bow that ties on unlock
(cart page + mini-basket); **A5** the post-payment celebration is now a gift box that opens (lid lifts off, robin hops up, caption), skipped for reduced-motion. New: `lib/shop/basket.ts` (+23 tests),
`LiveBasket`, `MiniBasket`, `DeliveryRibbon`, `BasketIcon`, `GET /api/cart/mini`, CSS in `globals.css`. **Verified live** (real DB, real clicks): the add→fly→panel sequence and timings, no toast on desktop,
no double photo-drop when the real cart replaces the provisional one, auto-close timing, hover path, the cart page with 4 real items (images served by the optimiser at ~3–4 KB each), live re-layout on
remove/increase, ribbon 90%→100% with jiggle + bow-tie + quantity badge, empty state, phone layout, and the unwrap scene mounted through the real event and inspected frame-by-frame at 2.4 s.
431/431 tests, tsc/eslint/build clean. **Fixes found by testing:** the mini-basket data call takes ~1.4–2 s in this dev setup (remote DB) so the panel was stuck on "Opening…" — now provisional + deferred
auto-close; a pointer merely sitting under the panel kept it open forever — now only real movement counts. **Not verified:** a real phone's speed/feel and a real touch device; real payment triggering the unwrap
(exercised via the same window event PayNowButton fires); the reduced-motion path (coded, not exercised); the production latency of `/api/cart/mini` (dev numbers are inflated by DB distance but unproven).
**Decision for you/client:** all copy still says "Cart" — say if you want "Basket" site-wide. See `docs/progress/2026-10-02-sprint-1-the-basket.md`.

## Stage 11 in progress

Slices done: **admin orders + cancel/refund** (real refund verified at Razorpay), **coupons + dashboard**, **user management + DPDP erasure**, **vendor controls + payout ledger** (suspend/reinstate, commission override, vendor settings, settlements with hold period/UTR/CSV), **returns + partial refunds** (customer requests, admin decisions, reserve→gateway→apply refunds, payout clawback as debits) — see `docs/progress/2026-09-20-stage-11-admin-orders.md`. **Homepage banners done** (admin CMS + carousel). **Vendor logo + banner upload done** (with admin take-down). **Bulk CSV product upload done** (preview → all-or-nothing import as hidden drafts). **"Download my data" done. Dashboard alert for paid orders stuck with a suspended vendor done — Stage 11 (admin suite) is COMPLETE.** Next: Stage 12 (visual & motion polish), then Stage 13 (go-live). **Unverified with the real Razorpay: partial refunds** (see slice 5 in the Stage 11 log for the first real test). 

## Last Session Summary

Full detail: `docs/progress/2026-09-20-stage-9-diary.md`, and the "Real-account verification" sections of the Stage 7/8 logs.

- **Real-account verification**: Razorpay test keys + Shiprocket API user wired and verified against the real APIs; a real test payment completed and was confirmed by real webhooks.
  (Card lesson: the account rejects the US test card `4111…` — use Razorpay's domestic test card/UPI.)
- **Diary**: people, dates, gift log, dashboard (coming up, ideas, gifting score, calendar), person pages; pure tested core; rule-based suggestions.
- **Daily cron** (`vercel.json`, 09:00 IST): timezone-aware, exactly-once diary reminders (in-app + email when Resend is configured), stale unpaid order cancellation, guest cart purge.
- **Notification bell + inbox** and **email preferences** — previously invisible in-app notifications are now visible.
- **Three privacy/integrity fixes** found while building (cross-user contact reference, admin-readable diary reminders via `notifications`, notification tampering).
- 114 unit tests, lint, tsc, build all clean; DB rules and the cron verified with real users and real HTTP.

## Next Up

Stages 0–11 are complete. Stage 12 (visual & motion polish) is in progress — slices 1–9 done (design
foundation/theming, homepage + mall, product page, order tracking + diary desk + content pages, cart/
checkout, wrap styles + My Orders + shop-by-relationship, theme scheduling, a performance pass, robin mascot moments & a basket-themed cart — see the
dated logs in `/docs/progress/`). Remaining before Stage 13:

1. Whatever artwork the client generates next from Batch 2 of `docs/design/asset-prompts.md` (occasion
   banners, default boutique fronts, diary desk, order-tracking header, mall destinations, auth panel) —
   `npm run images:sync` wires each one automatically, no code change needed.
2. Any festival theme the client asks for (Christmas first) — the scheduling mechanism (`/admin/themes`)
   is built and waiting; adding a theme is the 4-step recipe in `docs/design/DESIGN_DIRECTION.md`.
3. Then **Stage 13 — go-live**: production Supabase project + backups, rotate every pasted secret, delete
   test accounts/seed images, legal review of Privacy/Terms/Refunds (`lib/site.ts` `legalReviewed`), live
   Razorpay KYC, verified email domain + Supabase auth SMTP through Resend.

## Open Questions / Blocked On

- Real **email** delivery (Resend key + domain) and real **courier booking** (Shiprocket wallet + pickup address) are the two remaining unverified live paths.
- Razorpay Route (auto vendor split) vs manual settlement — client decision.
- The Shiprocket webhook token equals the account password (advised to change).
- `VENDOR_BANK_ENCRYPTION_KEY` lives only in `.env.local` + must be set in Vercel; losing it makes stored bank details unrecoverable.
- **Resolved this session** (all previously-open click-through items): `/admin/themes` preview confirmed working (whole-site restyle + "Stop" strip), the full diary (`/diary`, person pages, plan strip, date dialogs, bell dropdown) confirmed working with a real signed-in session, and a real order was placed through checkout with a gift-wrap style, reaching a live Razorpay test-mode session. Two things still genuinely untestable in this environment (tooling limits, not app defects): a native file picker (diary/product photo upload) and completing a payment inside Razorpay's own cross-origin iframe — both need a human at a real browser once. See `docs/progress/2026-09-28-overnight-qa-and-security-pass.md` for exactly what was and wasn't exercised.
- Support email/phone for the Contact page (`NEXT_PUBLIC_SUPPORT_EMAIL`/`_PHONE`) — currently blank.
- **The CSP is written and live-tested** (see `docs/progress/2026-09-28-csp.md`) but two entries still need one real check after the next production deploy: subscribe to web push for real (OneSignal's SDK refuses to fully initialize anywhere but the configured production origin, so its `connect-src`/websocket behavior never ran locally) and trigger one real Sentry-reported error (Sentry is `enabled: false` outside `NODE_ENV === "production"`, so it never makes a network call in dev). Both entries are correct by configuration, just not yet by an observed request.
- The custom robin cursor (desktop only) and payment-confirmed celebration — worth the client watching once during a real completed payment (couldn't be triggered end-to-end by any automated session, including this one).
- **New this session**: deleting a review and broadcasting a vendor message both go through a native `confirm()` dialog, which this session's browser tooling can't drive — both were instead verified by other means (a real RLS-simulated delete for reviews; a temporary, immediately-reverted bypass of the confirm gate for the broadcast) rather than a literal click-through of that one confirmation step. Worth one real click-through by a human, though the underlying actions are confirmed correct.
- **New this session**: the "My Diary" header pill's condensed-on-scroll fix (`.gp-diary-pill` hidden when `data-condensed="true"`) couldn't be captured through a real, live scroll transition — the browser pane was backgrounded, and this app's condense detection uses `requestAnimationFrame`, which browsers pause for hidden tabs. The underlying bug and the at-rest half of the fix were confirmed live; the condensed CSS rule was confirmed to target the right element but not watched through an actual scroll. Worth one real scroll-and-look by a human.

## Credentials Status

| Integration | Needed at | Status |
|---|---|---|
| GitHub | Stage 0 | ✅ done — repo at https://github.com/AdroitPhilocalist/giftping |
| Supabase (URL/anon/service-role) | Stage 0 | ✅ done — connectivity verified, full schema live |
| Supabase Personal Access Token | Stage 1 | ✅ used for CLI link/push, not stored anywhere in-repo |
| Supabase DB password | Stage 1 | ✅ used for migrations, not stored anywhere in-repo |
| Sentry DSN | Stage 0 | 🟡 wired, not yet verified against live dashboard |
| Google OAuth | Stage 2 | ✅ done — configured on Supabase, reaches real Google consent screen |
| MSG91 (phone OTP) | Stage 2 | ⚪ deliberately deferred — feature-flagged off, cost constraint |
| Upstash Redis | Stage 2 (reused later) | 🟡 code-complete with graceful no-op fallback; not yet provisioned |
| Supabase Storage bucket (`product-images`) | Stage 4 | ✅ created via migration, verified |
| Vendor bank encryption key | Stage 4 | ✅ in `.env.local`; 🔴 must be set in Vercel before go-live |
| Razorpay (test) | Stage 7 | 🟡 keys wired locally + verified against the real API; webhook secret set on Vercel. **Add `NEXT_PUBLIC_RAZORPAY_KEY_ID` + `RAZORPAY_SECRET_KEY` to Vercel and redeploy**; one human test payment still to observe |
| Shiprocket (API user + webhook token; Lite/PAYG plan) | Stage 8 | 🟡 login + serviceability verified against the real API; webhook token set on Vercel. Account has 0 pickup locations and ₹0 wallet; add `SHIPROCKET_EMAIL`/`PASSWORD` to Vercel; use a separate webhook token |
| Resend | Stage 9/10 | 🟡 API key wired (send-only) and real emails sent in test mode to the owner's address only; **verified domain still needed** to email real users |
| OneSignal (free tier) | Stage 9 | 🔴 not needed yet |
| ~~Remove.bg~~ | — | ❌ cut from scope, cost constraint |
| ~~Railway~~ | — | ❌ cut from scope — Vercel Cron Job instead |
| ~~Cloudinary~~ | — | ❌ cut from scope — Supabase Storage + sharp + next/image instead |
