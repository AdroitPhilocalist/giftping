# GiftPing — Progress

_Always read this file first in a new session. It is overwritten (not appended) at the end of every
session — see `/docs/progress/*.md` for the historical "why" behind past decisions, and `CLAUDE.md` for
static project conventions that don't change session to session._

## Current Stage

> **Deployment:** https://www.giftping.in (Vercel, auto-deploys from `master`; `giftping-lime.vercel.app` still works too). Webhooks: `/api/webhooks/razorpay`, `/api/webhooks/courier-tracking`. Daily cron: `/api/cron/diary-reminders`.

**Stage 9 — Personal Gifting Diary + daily cron** ✅ built and verified locally. **Stage 10 — email + web push built** (`notifyUser()` = in-app + email + push, preference-gated; real Resend in test mode; real OneSignal wired). **Web push verified for real on the deployed site (Safari, 2026-09-20)**: subscribed via Account → Notification settings, OneSignal showed an enabled SafariPush linked to the user's id, a direct push and the production diary cron's push were both received, and a second cron run sent nothing (exactly-once). Not yet tried in Chrome/Brave (Brave needs "Use Google services for push messaging" turned on). Remaining: Supabase auth SMTP (needs a domain). **Stage 7 (payments) is now fully verified with a real Razorpay test payment**
(real webhooks confirmed the order once, replays were no-ops, stock/cart/notifications correct). Next: **Stage 12 in progress — slice 1 (design foundation + theming) and slice 2 (homepage, `/mall` directory, placeholder art, `npm run images:sync`) done, see `docs/progress/2026-09-21-stage-12-*.md`**; **slice 3 (product page + delivery checker + first real artwork: hero, map, cards) done, see `docs/progress/2026-09-21-stage-12-product-page.md`**; **slice 4 (order tracking, diary desk, About/Contact/Privacy/Terms/Refunds, real robin + logo wired) done, see `docs/progress/2026-09-21-stage-12-tracking-diary-pages.md`**; **slice 5 (cart + checkout polish) done, see `docs/progress/2026-09-21-stage-12-cart-checkout.md`**; **slice 6 (wrap-style choice, My orders, shop by relationship, account hub, 404) done, see `docs/progress/2026-09-21-stage-12-orders-wraps-relationships.md`; ALL Batch 1 artwork delivered and wired**; **slice 7 (theme scheduling + admin preview, `/admin/themes`) done, see `docs/progress/2026-09-22-stage-12-theme-scheduling.md` — no festival theme built yet, waiting on the client to ask**; **slice 8 (performance pass) done, see `docs/progress/2026-09-22-stage-12-performance-pass.md` — memoized `getActiveTheme()`/`getProductBySlug()` (were re-querying up to 8x per homepage request), parallelized several page-level query waterfalls, fixed two real image-preload bugs (Logo, HomeHero/auth panel), removed zod from the product-page bundle, added AVIF**; **slice 9 (robin mascot moments + basket-themed cart) done, see `docs/progress/2026-09-22-stage-12-robin-mascot-moments.md` — custom robin cursor, "add to cart" fly-to-basket animation, payment-confirmed celebration, cart redesigned as a woven basket**; **slice 10 (Batch 2 artwork wired, cursor drift fixed, 57-product demo database + `npm run seed:demo`) done, see `docs/progress/2026-09-23-stage-12-batch2-cursor-demo-data.md`**; **slice 11 (the Personal Gifting Diary redesigned — a book on a desk: front page, person pages with a gift plan, year at a glance, gifting-year review, paper dialogs, private photos, new reminder email, bell dropdown) done, see `docs/progress/2026-09-25-stage-12-diary-redesign.md`**; **slice 12 (quick fixes: robin cursor / condensing header / diary fits the window; page pass 1: gift-tag cards, occasion worlds, Boutique Avenue, live gift-card preview) done, see `docs/progress/2026-09-26-stage-12-quick-fixes-and-page-pass-1.md` — pass continues with cart/checkout/orders/account/home**; **slice 13 (the diary is now a real book you flip through — 7 spreads that grow with your people, a hinged-leaf page turn, section tabs, contents page, keyboard/swipe, `?p=` bookmarks, no vertical scroll on a big screen) done, see `docs/progress/2026-09-27-stage-12-diary-flip-book.md` — the person/year/review pages still use the older two-page book;** **slice 14 (the front spread is back to everything-in-small with a "see more" on each piece, no contents page; the pager under the book is gone — "Turn the page →" and a curling paper corner are written on the pages themselves; FitPage scales any page to the window) done, see `docs/progress/2026-09-27-stage-12-diary-front-spread-and-page-corners.md`;** **slice 15 (diary was silently blocking all page scroll near it — a leftover `overscroll-behavior` from the old two-page book; local sign-in was redirecting to the production deployment because `getAppUrl()` trusted `NEXT_PUBLIC_APP_URL` over the request's own origin) done, see `docs/progress/2026-09-27-stage-12-diary-scroll-and-local-auth-redirect.md`;** **slice 16 (navbar redesigned, then corrected same-day to match the client's own approved reference — a flush full-width dark-green bar at rest, condensing to a floating pill on scroll; real hover mega-menus for Occasions/Boutiques; a rebuilt account-menu dropdown; every header icon/link restyled; My Diary is now a quiet outlined pill) done, see `docs/progress/2026-09-28-stage-12-navbar-redesign.md`;** **slice 17 (homepage hero photo now runs the full page width with the headline overlaid on it, per the client's actual mockup; the announcement strip and header now share one exact colour at their seam instead of two independently-tuned bars) done, see `docs/progress/2026-09-28-stage-12-full-bleed-hero.md` — not re-verified visually, local preview access got stuck on a permission gate;** **slice 18 (the announcement ribbon removed entirely — a real theme-system field, not just a component; the white gap between header and hero photo fixed — a real height bug; hero text now stays legible regardless of what's behind it; the header's green given real depth) done, see `docs/progress/2026-09-28-stage-12-announcement-removed-hero-fixes.md` — verified visually this time;** **an overnight full-site QA + security pass done, see `docs/progress/2026-09-28-overnight-qa-and-security-pass.md`** — all three roles (customer/vendor/admin) clicked through end to end with real data, including the full vendor-onboarding→category-approval→storefront pipeline and the `/admin/themes` preview mechanism, both previously unconfirmed; a real header-height regression restored (a same-day revert had silently dropped it); a 16-check RLS audit against the real dev DB (customer/vendor/admin/anon isolation, cross-user FK guard, diary no-admin-bypass) all passed with no regressions; baseline security response headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) added to `next.config.ts` — a real gap, Vercel doesn't set these itself. No destructive/load/DDoS testing was attempted, by design. **A real Content-Security-Policy done and live-tested, see `docs/progress/2026-09-28-csp.md`** — a per-request nonce + `'strict-dynamic'` in `proxy.ts` (Next's own current recommendation over a host allowlist), verified against a real Razorpay checkout session (including a second script it dynamically loads that nobody would have thought to hand-allowlist), a real Supabase Storage image request, and the real OneSignal SDK script — all clean, zero violations; full regression (tsc/291 tests/eslint/build) clean. OneSignal's and Sentry's `connect-src` couldn't be live-exercised from localhost (both gate themselves off outside their configured production origin/env) — correct by configuration, not yet by an observed network call; needs one real check after the next deploy. **The desktop navbar now floats as a rounded, genuinely glass-like pill from first paint (not only on scroll) per a fresh client reference — see `docs/progress/2026-09-28-navbar-floating-pill.md`** — a deliberate reversal of slice 16's flush-at-rest, "never transparent" decision, done on direct instruction against a new reference image, and it took **four** same-day corrections to actually get right — the fourth was the real bug: the header was `position: sticky`, which still reserves its own box in document flow, so the hero photo genuinely never extended behind it at all (confirmed via `getBoundingClientRect()`) — no colour/blur tuning could ever have fixed "I see the plain page background behind the navbar," because that background really was the only thing there. Fixed by making the header `position: fixed` instead, with `<main>` in `app/layout.tsx` carrying matching `padding-top` (so every other page is pixel-identical to before) and `HomeHero.tsx`'s hero section cancelling that padding with a negative margin (so its photo bleeds up behind the now-floating header while its actual text content stays exactly where it was). See `docs/progress/2026-09-28-navbar-floating-pill.md` for the full four-correction history. First pass kept a solid opaque fill (wrong). Second pass added translucency but with `blur(18px)` and up to 0.85 alpha — technically see-through but heavy enough to erase all photo detail into an abstract colour blur (still wrong — caught only once the developer compared reference vs. live side-by-side). Final: `.gp-header-glass` is a *light* dark-green gradient (~0.4 alpha at the logo/icon ends, ~0.14 in the middle) with only `blur(3px)`, so the actual hero photo — the skylight, the hanging lights, the ceiling — stays sharp and recognisable through the bar, just lightly tinted. Condensed-on-scroll still switches to a solid fill for legibility over arbitrary page content. **Trade-off accepted deliberately, not fixed**: this light a tint reads great over the homepage's dark-toned hero photo but weakens contrast on non-hero pages (`/mall`'s plain cream background now shows through quite strongly) — flagged in the log rather than re-tuned again, since a real fix would be a page-aware variant (lighter only when a hero photo is actually present), not another single opacity number. The homepage's "Watch Our Story" button was also wrongly outlined/transparent — now a solid cream pill with dark text, matching the reference. The announcement strip is no longer rendered anywhere (a real, flagged divergence from every OTHER approved client mockup, which all still show one — worth reconciling with the client); mobile/tablet unaffected, still flush per the approved mobile mockup. Third: the low-alpha gradient itself was already right, but it was paired with `backdrop-filter: blur(3px)`, which rendered as a flat, muted grey on whatever device produced a later round of screenshots (never reproduced on this machine) — `backdrop-filter` on a `position: sticky`, mid-transition ancestor is a known cross-engine compositing risk, and macOS/Windows' own "Reduce Transparency" setting makes several browsers substitute a flat colour for `backdrop-filter` specifically, by design. Removed `backdrop-filter` entirely rather than chase a device-specific repro — a plain semi-transparent `background` (what's left) has no equivalent failure mode and looks identical on a normally-configured browser. Live-verified at every step (shape, translucency, and photo-sharpness against the reference; a real width-overflow bug found and fixed; scroll/condensed transition; mega-menu; mobile) and full regression clean after each correction. **The individual boutique storefront page (`/vendors/[slug]`) redesigned to match a client-supplied style reference, see `docs/progress/2026-09-28-vendor-storefront-redesign.md`** — a full-bleed banner hero (`VendorHero.tsx`, using the exact same fixed-header bleed technique as the homepage) plus a 4-card "why shop here" feature grid (`VendorFeatureGrid.tsx`); the reference depicted one real boutique's own copy ("hand-poured", "candles"), so the four claims were deliberately generalized into a **generic, truthful, partly data-driven** set (featured status and founding year pulled from real columns when set, universal gifting-platform claims otherwise) rather than hardcoding that one vendor's marketing language into the shared template — verified live against three different real vendors (featured-with-founding-year, featured-different-year, and not-featured-with-no-founding-year) to confirm it actually adapts rather than assuming every boutique looks like the reference. The `/vendors` listing page and its card component are untouched (the ask was specifically the individual boutique page). **Three real spec features built and live-verified: Profile Management, Review Management, and (admin-side) Vendor Communication — see `docs/progress/2026-09-29-profile-reviews-vendor-messaging.md`.** All three were audited against the actual spec docs first (`Feature_Specification_Gifting_Platform.docx`, converted and searched, not guessed at) and against the existing codebase (a research-only subagent pass) before writing anything — the database/RLS layer was already fully ready for all three, every gap was application-layer. Profile: `/account/profile` (name, phone, a new avatar upload pipeline copying the vendor-logo pattern exactly, new `user-avatars` bucket + CHECK constraint). Reviews: `/account/reviews` (edit/delete) plus "Write a review" on delivered order lines in `/orders/[id]`, upserting on a new `(product_id, user_id)` unique constraint (found and fixed one real pre-existing duplicate in the demo seed data before adding it). Vendor Communication: a "Message" action per vendor and a "Message all vendors" broadcast on `/admin/vendors`, both riding the existing `notifyUser()` + `audit_logs` pattern untouched. Two real bugs found *while live-testing*, not while writing: a Zod v4 union that produced a bare "Invalid input" specifically on re-parsing its own already-transformed output (the phone field is genuinely parsed twice — client then server — so this only showed up under real use, not in unit tests written before the fix); and a shared modal-close helper in `VendorAdminControls` that hardcoded which modal to close, so the brand-new "Message" modal never closed itself on success even though the toast correctly said "sent." Live-verified end to end against the real dev database for all three (a real profile update, a real review with DB-triggers-derived `is_verified_purchase`/`reviewer_display_name` confirmed correct, a real admin message that showed up in the actual vendor's `/notifications` inbox, a real broadcast) — full regression clean (302/302 tests, up from 291). **The header's plain-page contrast trade-off (flagged but deliberately not fixed in the 2026-09-28 floating-pill work) is now resolved — see `docs/progress/2026-09-29-header-page-aware-glass.md`.** The client reported the header reading as "too transparent" and camouflaging with the light background on `/mall`, `/diary`, and `/account/profile`, with white nav text hard to read. Fixed by making the header page-aware rather than one fixed tint everywhere: `.gp-header-glass` now defaults to the header's own already-proven opaque fill (the same one it already used once condensed on scroll), and only switches to the original low-alpha glass tint when `<html>` carries a new `data-hero-header="true"` attribute — set by a new `HeroHeaderFlag.tsx` client component mounted inside `HomeHero.tsx`/`VendorHero.tsx` (the only two sections that actually bleed a photo up behind the fixed header). Two other options (AI-generated background photos on every page; switching the whole site to a darker default theme) were discussed with the client and rejected — the first turns a header bug into a full redesign and hurts readability on functional pages, the second is a brand-identity decision unrelated to the seasonal festival-theme feature the client had actually seen. `/diary`'s own dark desk background was deliberately not bled up behind the header this round (real layout risk in the heavily-tuned flip-book component for a purely cosmetic upgrade — the opaque default already fixes the reported complaint there) — left as a possible future polish item. Live-verified on `/`, `/mall`, `/account/profile`, `/diary`, and a real vendor storefront, at rest and condensed-on-scroll; full regression clean. **Same-day follow-up: a gilded edge for the client's "premium/golden touch" request** — a new `--gp-gold-edge` token (a light-gold → copper → bright-highlight → copper → light-gold shimmer, built from the existing copper accent rather than an unrelated yellow so it doesn't clash with the copper already used everywhere else) renders as a genuine 1.4px gradient ring around the desktop floating pill (the standard `mask-composite: exclude` gradient-border technique, since a plain `border` can't take a gradient and keep `border-radius`) and a thin bottom hairline on the mobile flush bar; the opaque fill's top sheen was also warmed from plain white to a champagne tone and its copper corner-glow strengthened. Replaces the old, barely-visible flat copper `border-color`. Verified live on the opaque pill (`/mall`), the glass pill over a photo (homepage, a vendor storefront) at rest and condensed, and the mobile hairline — see `docs/progress/2026-09-29-header-page-aware-glass.md`. **Third fix, same day: the "My Diary" pill spilling out of the header.** The client reported it vanishing against a light background when the header shrinks on scroll — investigated rather than taken at face value, and it's a real overflow bug: `.gp-header-inner`'s single-row flex needs more width than it has at real desktop sizes, and with no `overflow` set the excess renders past the pill's rounded edge onto the plain page (confirmed live: at 1280px, at rest, the pill's right edge already sat ~101px past the header's own edge; condensed is worse since its width caps at a fixed 75rem on *any* viewport). Fixed by only showing the pill from `2xl` (1536px, not `xl`/1280px) at rest, and hiding it outright once condensed (`app/globals.css`) — costs nothing real, since "/diary" is already one click away via the "Diaries" nav link and AccountMenu. The browser pane was backgrounded for part of this check, and this app's condense detection uses `requestAnimationFrame` (paused for hidden tabs), so the live condensed-scroll transition couldn't be captured end-to-end in that window — the pre-fix bug, the at-rest fix, and the CSS selector match were all still verified live; a real click-and-scroll check by a human is worth doing once. **The Occasions listing page (`/categories`) redesigned with photo cards, see `docs/progress/2026-09-29-occasions-page-photo-cards.md`.** The client noticed it looked bland next to every other major page (no imagery at all — just a heading and plain icon-in-a-circle cards) and asked whether artwork had actually been generated for it. It had — the same `world-<slug>` images `/mall`'s own destination cards already reuse — so `CategoryCard.tsx` now shows a full-bleed photo card (matching `/mall`'s exact treatment) when one exists, falling back to the original plain card otherwise (confirmed live: categories with no artwork at all — Housewarming, Thank You, Festivals — correctly still show the plain card, nothing looks broken). **Also confirmed directly, not just from the existing note**: `world-for-her.webp` and `world-for-him.webp` show real, legible third-party luxury brand names/logos (Dior, Chanel) — a genuine trademark/false-endorsement risk, not a content nitpick. Both are deliberately excluded from this new page (fall back to the plain card) until regenerated; the two existing pages that already show these same images (`/categories/for-her`, `/categories/for-him`) were left untouched since that's pre-existing and out of scope here — flagged to the developer directly so they can decide whether to also suppress those before the images are regenerated. Regression clean. **Batch 3 artwork delivered and wired (1 Oct)**: all 7 robin poses, 4 more occasion worlds (housewarming, thank-you, festivals, plus a bonus kids-baby), and the 3 "how it works" icons on `/about` — synced via `npm run images:sync`, reviewed one by one, all clean. `/categories` now shows photo cards for Housewarming/Thank You/Festivals/Kids & Baby too. The 8 diary-sticker images were also generated but turned out unnecessary (`OccasionSticker` already solves this as a built SVG component) — harmless, just unused. See `docs/design/asset-prompts.md`'s Batch 3 status section. **Domain/launch work (11 Oct)**: `giftping.in` fully live on Vercel + Namecheap DNS, Resend/Supabase SMTP verified with a real sent email, Google Search Console verified and indexing; found and closed a real gap — 10 commits had been sitting unpushed for ~10 days, so production was quietly serving a stale build; replaced the untouched default Next.js favicon with the real logo across all icon surfaces + added Organization/WebSite structured data; a technical SEO audit against the live site fixed two real bugs (bare product `<title>`s, two missing Merchant-listing schema fields) — deliberately did NOT add a fabricated `deliveryTime`/`returnFees` claim neither page states; manual test guide fully rewritten into step-by-step form. **Mall map UX (11 Oct)**: the directory/preview/map layout regrouped so all three fit one view without scrolling (`8ec1b9e`), then the preview itself turned into a floating overlay card that re-anchors right on the map next to whichever marker is active instead of a separate scroll-away box (`c1de753`) — both client-reported, both live-verified at laptop and phone widths. **Homepage carousel arrows (11 Oct)**: the prev/next buttons were landing directly on top of the slide headline (measured overlap) and looked weak; regrouped into one premium pill in the top-right corner, clear of the text on every slide (`d3c0fac`). **`world-for-her`/`world-for-him` regenerated and wired (11 Oct)**: client generated two new clean images (unbranded perfume bottle/jewellery/scarf; unbranded cologne/watch/wallet/notebook, no readable text anywhere — confirmed by eye before wiring), synced via `npm run images:sync`, and the `/categories` suppression removed — For Her/For Him now show photo cards like every other occasion, and `/categories/for-her`/`/categories/for-him`'s existing header photos picked up the same clean image automatically. **Search improvement (12 Oct)** — see `docs/progress/2026-10-12-search-synonyms-and-fuzzy-fallback.md`: the client asked whether the search box could find a product by meaning, not just literal word ("would 'mobile' find something named 'phone'?") — investigated for real and the answer was no, same gap existed in this catalogue ("sweets" found nothing for a product tagged "chocolates"). Built all three things recommended: an admin-editable `search_synonyms` table (bidirectional — one row covers a whole word group) that both `search_products()` and `suggest_product_ids()` now expand through (`expand_search_tsquery()`), a typo-tolerant `pg_trgm` fallback (`search_products_fuzzy()`, only called when the exact search returns nothing, flagged in the UI as "close results" not exact), and a no-results fallback offering matching categories/boutiques instead of a dead end. New `/admin/search` CRUD page; seeded with four real starter groups (perfume/cologne/fragrance/scent, sweets/mithai/chocolates/candy, flowers/bouquet/roses, diary/journal/notebook) created through the real admin UI, not inserted directly. Two real SQL bugs caught and fixed before shipping: a missing-parentheses operator-precedence bug in the hand-built tsquery, and `pg_trgm`'s functions/operator class not resolving unqualified the way `pgcrypto`'s do elsewhere in this codebase (needed explicit `extensions.` prefixes) — plus a live-tested correctness fix (plain `similarity()` scored a short typo against a whole long product name and found nothing; switched to `word_similarity()`, which finds the best-matching part of the name instead). Live-verified end to end through the real UI, not just the RPCs: "cologne" went 0→7 results the moment a synonym group was saved; a real typo correctly shows the close-results fallback; true nonsense correctly shows nothing; the live-typing dropdown also benefits, not just the submitted-search page. 540/540 tests (11 new), tsc/eslint/build clean. **Three premium UI flourishes (12 Oct)** — see `docs/progress/2026-10-12-premium-ui-flourishes.md`: client asked for pure-UI/animation ideas (no new art assets, no new backend) to make the site feel more premium and more like a real mall, after bringing a ChatGPT brainstorm of four much heavier recipient-facing features that were explicitly out of scope for this round. Surveyed existing motion conventions first (confirmed no animation library is installed at all — `TiltCard.tsx`'s CSS-variable cursor-follow technique and `Ambience.tsx`'s drifting-shapes mechanism are the only patterns, both hand-rolled). Built three extensions of those same patterns: (1) a gift-wrap ribbon+bow corner on every `ProductCard` (reuses `DeliveryRibbon.tsx`'s exact bow drawing) that perks up on hover — first version was geometrically guessed and too low-contrast to read against warm product photos, fixed with a `translate(50%,50%)`-anchored corner formula plus a white-rim/dark-shadow treatment so it pops against any photo tone, caught only by zooming into actual rendered screenshots; (2) `SpotlightSection.tsx`, the room-scale version of `TiltCard`'s cursor-follow glow — a soft light drifting across an entire product grid as the cursor moves, mounted on the homepage trending grid and every category page; (3) a new `"motes"` kind added to the existing `Ambience` mechanism — soft dust catching sunlight through the atrium's skylight, mounted behind the homepage hero's headline. Live-verified at desktop/mobile widths and via real OS-level hover (not synthetic DOM events, which don't trigger `:hover` CSS); full regression clean. **"Add to cart" flight animation upgraded (12 Oct)** — see `docs/progress/2026-10-12-premium-add-to-cart-animation.md`: client ran the manual test guide's 1.10, confirmed it worked, but called the animation "naive and amateur" and asked for it to feel premium without adding real weight (still no animation library — confirmed none is installed). `CartFlyLayer.tsx`/`globals.css`'s `gp-cart-fly` went from a plain 3-stop arc with uniform scale to a proper 5-stop arc with a spring-launch squash and continuous tumble rotation past 360°, plus two faint trailing echoes of the icon for a cheap sense of speed, plus three separate, synchronized landing payoffs instead of one generic bounce: the icon bounce (re-tuned), a new independent badge pop (`gp-badge-pop` — so "the count changed" reads as its own event, not absorbed into "the icon moved"), and a six-spark copper burst at the point of impact. Both new effects ride the existing blanket `prefers-reduced-motion` rule for free. Live-verified as a signed-out guest end to end; because the real animation is fast (~0.7s) and this dev server's action round-trip made screenshot timing unreliable, verified properly by driving the sequence programmatically and sampling its actual computed transform/class state over time (DevTools-Animations-panel-equivalent rigor) — confirmed the arc's transform matrix genuinely changes throughout (not just at the endpoints), confirmed both ghost trail elements exist simultaneously with the lead, and confirmed all three landing payoffs fire in the same frame followed by a fully clean teardown. 540/540 tests, tsc/eslint/build clean. Next: regenerate world-corporate-gifting/world-birthday (off-brand slogans, not a legal risk); the 20 real product photos (Batch 3E); Stage 13 go-live.

## Occasion cards: "world windows" (18 Oct)

The occasion cards on `/categories` (`CategoryCard`) now have a deliberately **different** treatment from
the boutique "lit glass" cards (`GlowCard`, on `/vendors` and `/shop`). Where a boutique card is an object
that leans toward you, an occasion card is a **window** into a place: the frame holds still while the world
inside answers — the photo zooms deep and drifts toward your gaze, the occasion's own ambience
(confetti/petals/hearts/sparks) drifts down *inside* the pane, a sheen crosses the glass, and light **spills
out** of the frame onto the page. Same mount-point convention as `GlowCard`: `components/motion/WorldCard.tsx`
+ one `.gp-world` block in `globals.css`; CSS-variable driven (no React state), mouse only, still under
reduced motion. The old `TiltCard` was retired (its only user). tsc/eslint/565 tests/build clean; `/categories`
renders 200 locally. Full reasoning + alternatives considered: `docs/progress/2026-10-18-world-window-occasion-cards.md`.
**Not verified here:** the hover motion itself (needs a real mouse; the door view-transition needs a real window).

## Password reset fixed (18 Oct)

Forgot-password was broken: the emailed link opened the "choose a new password" form, but submitting it always
reported "link expired". Cause: the recovery link's PKCE `code` was being exchanged inside a **Server Component**
(`/update-password`'s page), and a Server Component render **cannot write cookies** — so the session the exchange
produced was silently dropped, and the follow-up `updatePasswordAction` (a fresh request) had no session to
authenticate with. Fixed by routing the recovery link through `/auth/callback` (a Route Handler — the same
cookie-safe landing point OAuth and e-mail confirmation already use, so it is already allow-listed), which
exchanges the code, skips the sign-up-only side effects, and redirects to `/update-password`; the page now just
reads the session and renders the form. Expired links now land back on `/update-password?error=expired` with a
"Request a new link" link instead of dead-ending on sign-in. As a follow-up, a successful reset now also revokes
every **other** session for the account (`signOut({ scope: "others" })`, best-effort) — so a device that was
already signed in (e.g. an attacker's) does not survive the password change. tsc/eslint/565 tests/build clean;
redirect + page states verified live. Full reasoning: `docs/progress/2026-10-18-password-reset-fix.md`. **Not
verified here:** the final email click-through in a real browser (needs a real inbox).

## Product types + category-specific attributes built (16 Oct)

Client comparison with IGP showed a missing axis: GiftPing only had *occasion* categories. Added a parallel **product-type tree** (what the thing IS) with **per-type attributes** (Flavor, Metal, Placement…) — admin UI, vendor form, `/shop` browsing with attribute filters, nav menu, SEO/sitemap. Then made the starting content deliberately complete for hand-over: **273 types (25 broad, 190 subcategories, 58 third-level) and 149 attributes (53 multi-select, 1,302 options)** in `lib/catalog/taxonomy.ts`, installed with `npm run seed:taxonomy` (insert-only, safe to re-run). Live-verified in the browser as admin, vendor and guest. Full reasoning: `docs/progress/2026-10-16-product-types-and-attributes.md`. Not built: CSV import columns for type/attributes; attribute filtering past ~1,000 matching products needs an RPC.

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

## Sprint 2 — "Make it personal" built (3 Oct)

Second sprint from `docs/ideas/DELIGHT_AND_FEATURE_IDEAS.md` (A3, A4, B1 — all done). **A3** a boutique can now let shoppers put text on a product: the vendor form has a "Personalised text on the photo"
section with a drag-to-place editor on their own photo; shoppers type and **see their words on the product photo live**; the text flows through cart → checkout → order → the **vendor's order page and
new-order email** (a highlighted "Engrave:" line). **A4** the checkout gift-wrap picker now shows the chosen wrap large with the handwritten card tucked in, carrying the real message to the real recipient.
**B1** `/gift-finder`: four questions → a shelf of real products with reasons, ranked by the diary's existing suggestion engine (+ hard budget limit, readable reasons, popular-picks fallback); homepage band and
footer link. Details and decisions: `docs/progress/2026-10-03-sprint-2-make-it-personal.md`. **Verified live** (real DB, real vendor/customer sessions): live preview, required/length rules, **server-side
enforcement proven** (limit tightened in the DB after page load — the server still rejected), the vendor editor (drag / resize / keyboard / sliders / save / reload), the vendor order view and email template,
the wrap preview, the whole quiz and results, hostile URLs, the no-JS markup. 478/478 tests (+53), tsc/eslint/build clean. **Found and fixed by testing:** an engraving would have drifted on larger screens
because the gallery frame changes shape (now square for engravable products); the quiz's fallback re-added products meant for someone else; the quiz stayed open over its own results; the resize handle shoved the
box instead of stopping at the edge. **Not verified:** touch dragging on a real phone; vendor usability beyond me; non-Latin glyphs in the preview fonts (the text itself is kept exactly); ranking on a real-sized
catalogue. **Dev data:** Personalised Name Plate and Engraved Wooden Keepsake Box now have engraving set up (demo).

## Occasion worlds de-duplicated + the Diary button (3 Oct)
See `docs/progress/2026-10-03-occasion-worlds-and-diary-button.md`. Birthday/Anniversary/Wedding/For Her… are "worlds": the filter that repeated the world's own choice is hidden (the category-OR-tag union that briefly made Birthday show 38 gifts was reverted — back to the 8 filed under it). "Diaries" is gone from the nav; the Diary has its own drawn-book button, always visible (caption ≥1440px, book-only when condensed/narrower). Tests 481/481.

## Sprint 3 — "The mall as a place" built (3 Oct)
See `docs/progress/2026-10-03-sprint-3-the-mall-as-a-place.md`. B3 mall map (flying robin + live place cards), B4 shop-door view transitions (**morph not watched — hidden test pane aborts view transitions; check once in a real window**), B6 waving robin at sign-in, B7 festival mode (Diwali theme + countdown + floating lamps; **dates and the 4-day cut-off are assumptions to confirm**), B8 tilting shop-window cards. Tests 491/491.

## Google product rich results + the six missing occasion descriptions (4 Oct)
See `docs/progress/2026-10-04-structured-data-and-occasion-copy.md`. Product pages now carry Product + BreadcrumbList JSON-LD (price/rating/stock), checked against Google's own Rich Results Test — "6 valid items detected," no errors. Birthday/Anniversary/Wedding/Corporate Gifting/For Her/For Him now all have descriptions (set via /admin/categories, doubling as their meta description). Tests 508/508.

## Diary polish — C1 & C2 (4 Oct)
See `docs/progress/2026-10-04-diary-polish-c1-c2.md`. Countdown ribbons (fill/tighten as a date nears, confetti on the day) on tickets, date cards and the plan header; a wax seal stamps the moment a gift is marked "Given" (a real remount bug fixed along the way — see the doc); a newly added person's polaroid now drops in with a tape-peel. Verified with a real added-then-removed test contact. Tests 516/516.

## Sprint 4 scoped, then paused for real artwork (5 Oct)
See `docs/progress/2026-10-05-sprint-4-scoped-on-hold.md`. Asked to go ahead with Sprint 4 (cinematic atrium entrance); checked the actual blocker first instead of guessing — confirmed the scroll sequence (an atrium depth-scroll intro) and that D1 (3D gift box) is out of scope (no `.glb` model), but the layered atrium art genuinely doesn't exist yet, so nothing was built. Wrote the art brief instead: `docs/design/asset-prompts.md` Batch 5 (`atrium-layer-far/mid/near.png`, three separate transparent layers designed to composite for parallax — not a crop of the existing flat hero photo, which can't be un-flattened that way). **Next: once those three files land in `ui-references/batch-1/` and are synced, build B2 (cinematic entrance) + B5 (parallax hero) against them.**

## Sprint 4 attempted against real art, then fully reverted (9 Oct)

Once the client generated the three Batch 5 layered-atrium images via ChatGPT, B2 (cinematic entrance) + B5 (parallax hero) were actually built against them. The client's verdict on seeing it live: "very bad looking, redo to what it was previously." Fully reverted back to the flat `hero-atrium.png` hero — confirmed via `git status`/`git diff` that no trace of the attempt remains in the working tree. The three source PNGs are still sitting untracked in `ui-references/batch-1/` for a future retry with a different treatment. Sprint 4 stays on hold until a new approach is agreed.

## Real Shiprocket credentials verified end-to-end; real courier booking stopped one step short (9 Oct)

Once the client obtained a real Shiprocket account password (separate from their Google-login), asked to test every Shiprocket-dependent feature for real. **Fully verified live**: login, serviceability checks (real courier coverage confirmed: 1 courier Jaipur→Mumbai, 3 Jaipur→Andaman), and the entire courier-tracking webhook pipeline end-to-end (webhook auth, idempotency, the monotonic status guard, customer notifications, the RTO path, order-status rollup) — exercised with real HTTP calls against the real local server across all three UI surfaces (customer order page, admin order detail, vendor orders page), then fully cleaned up with the dev database left exactly as it was before. **Not verified**: the actual booking flow (pickup-location registration → Shiprocket order → AWB assignment). Everything up to clicking the real "Book courier" button was staged (with the final physical-pickup-request step deliberately disabled per the developer's own explicit choice), but the click itself was refused by the Claude Code host's own safety classifier as a real outward-facing action — not a bug, not insufficient authorization, just a hard stop this session correctly did not attempt to route around. **This one piece (pickup-location registration + a real Shiprocket order + a real AWB) remains unverified against the live account** — doing it requires a human to click "Book courier" once on `/vendor/orders` as `test-vendor@giftping.test` for order GP-100176.

## Domain live: giftping.in, verified email, Christmas festival theme (10 Oct)

The client bought `giftping.in` (via Namecheap) and a mailbox `connect@giftping.in`. Walked through end-to-end: `www.giftping.in` attached to Vercel (A/CNAME records), `NEXT_PUBLIC_APP_URL` updated and `.env.local` synced to match. **Found and fixed a real, unrelated problem while verifying the SEO work along the way**: production had been serving a build from commit `221f45e` (29 Sept) the whole time — 10 commits, including Sprints 1-4-scoping, admin SEO tools, and marketing campaigns, were committed locally but never pushed to `origin/master`. Pushed; production is now current. Resend domain verified (SPF/DKIM/DMARC records added in Namecheap), confirmed with a real send to a real inbox (HTTP 200, real message id, sender `connect@giftping.in`). Supabase custom SMTP configured through Resend. Supabase Auth URL Configuration updated (Site URL + Redirect URLs allow-list) — verified via `generateLink`, which now accepts `https://www.giftping.in` as a valid redirect. Shiprocket webhook URL updated to the new domain (by the developer; not independently verified). **Built the Christmas festival theme** (`app/themes/christmas.css`, a `christmas` entry in `lib/theme/themes.ts` and `lib/festivals/calendar.ts` — dated `2026-12-25`, `cutoffDays: 5`, both flagged as assumptions needing confirmation same as Diwali's — plus a new `"snow"` `AmbienceKind`): pine-green/holly-red tokens, live-verified through `/admin/themes` preview (countdown ribbon showing "76 days to Christmas", snow ambience, full colour pass on homepage/mall, no raw-colour leaks). No art exists for it yet — it works purely as a token swap, same as Diwali did before any dedicated art. Wrote the art brief for real Christmas-dressed imagery: `docs/design/asset-prompts.md` Batch 6 (optional polish, not a blocker). Tests 516/516 (one new assertion), tsc/lint clean. **Still outstanding**: rotate `SHIPROCKET_WEBHOOK_SECRET` (deferred since it was accidentally exposed in chat; testing is now done, nothing left blocking the rotation).

## Delivery speed options — Standard vs Express (10 Oct)

Gap #5 from the 1 Oct spec assessment, closed now that real Shiprocket credentials exist (it was blocked purely on
needing real differentiated courier data, not a client decision). "Standard" = the cheapest available courier's own
ETA; "Express" = the fastest, offered only when it's a genuinely different, faster courier (a single-courier route
or one where cheapest already is fastest shows no upgrade — nothing fake to sell). Flows through checkout (a real
Standard/Express radio pair per vendor, live total update, server-side re-validation against a fresh serviceability
check before trusting anything the client claims), persistence (`orders.delivery_speed jsonb`, migration
`20261010150000_delivery_speed_options.sql`), and best-effort honouring at booking time (`assignAwb()` tries the
preferred courier, falls back to auto-pick if it's no longer available by dispatch time). **Verified live against
the real Shiprocket account**: confirmed via direct API calls that Delhi from the Jaipur warehouse genuinely offers
a 3-day/₹93.72 Standard vs 2-day/₹112.22 Express trade-off; then placed a real order through the full UI (address →
checkout → Standard/Express toggle → total update → place order) and confirmed via a direct database query that
`delivery_speed` and `delivery_charge` were persisted exactly right, per vendor. **Not verified**: actually booking
a courier with the preference honoured (the real "Book courier" click is refused by this environment's own safety
classifier, same limitation as the 9 Oct Shiprocket session) and the vendor/customer "Express" badges on a live
page (needs a paid, dispatched order to reach the shipment-tracking section). 523/523 tests (7 new), tsc/eslint/
build clean. See `docs/progress/2026-10-10-delivery-speed-options.md`.

## Technical SEO audit (11 Oct)

Full pass against the real live site (not code-reading guesses): crawlability, indexability, structured data via
Google's own Rich Results Test, a broken-link sample crawl. Mostly clean (robots/sitemap/canonicals/noindex/404
handling/alt text all verified correct). **Two real issues found and fixed**: every product page was shipping a
bare, brandless `<title>` (the one page template that didn't append "— GiftPing" like every other page does —
fixed to match); Google flagged two missing-but-available Merchant-listing fields (`shippingDetails`,
`hasMerchantReturnPolicy`), added using real data already on the page (delivery charge/threshold, return window)
— deliberately **not** adding `deliveryTime` (varies per courier/pincode, no fixed claim exists to make honestly)
or `returnFees` (the refund policy page never actually states who pays return shipping — omitted rather than
guessed). 529/529 tests (6 new), tsc/eslint/build clean. **Honest gap**: Core Web Vitals couldn't be measured in
this environment (no local Chrome, PageSpeed Insights' hosted tool hung) — worth a human check once. See
`docs/progress/2026-10-11-technical-seo-audit.md`.

## Real favicon + Organization/WebSite structured data (11 Oct)

The client searched "giftping" on Google and the result looked amateur — turned out `app/favicon.ico` was still
the stock Next.js starter icon from the project's very first day (16 Sept), never replaced despite the real "Gp"
monogram + robin logo existing since 5 Oct. Generated a real icon set from the actual logo (`app/icon.png`,
`app/apple-icon.png`, a proper multi-resolution `favicon.ico`, plus `/icons/icon-192.png` / `-512.png` for a new
`app/manifest.ts`), and added Organization + WebSite JSON-LD to the homepage so Google has an explicit,
machine-readable link between the domain, the real brand name, and the real logo. Verified live: all icon routes
serve correctly with the right content types, the rendered `<head>` has the right `<link>` tags, the JSON-LD
renders with real production URLs. 525/525 tests (2 new), tsc/eslint/build clean. **Not instant**: Google is
known to be slow (1–4 weeks) refreshing a favicon in live search results specifically, separate from ordinary
page reindexing — the fix is correct and deployed, the public snippet updating just takes its own time. See
`docs/progress/2026-10-11-real-favicon-and-brand-schema.md`.

## Return shipment / reverse-pickup booking (10 Oct)

Gap #6 from the 1 Oct spec assessment, closed alongside #5 now that real Shiprocket credentials exist. Approving a
return used to just tell the customer "we'll arrange the pickup" with nothing ever actually booking one —
`lib/admin/return-dispatch.ts`'s `bookReturnPickup()` now does, as an **admin** action (`/admin/returns`'s new
"Book pickup" button), matching how `/vendor/returns` is deliberately read-only and GiftPing already owns
cancellations/refunds rather than the vendor. Same resumable-saga pattern as forward dispatch, reversed: pickup =
the customer's address, drop-off = the vendor's warehouse. **Found and fixed a real gap while building it**: the
Stage 8 shipment-uniqueness indexes only ever covered forward shipments, so nothing stopped a duplicate return
booking or protected a return AWB from colliding — `20261010160000_return_shipment_indexes.sql` extends both.
**Verified live**: signed in as admin, confirmed the real "Book pickup" button renders correctly against two real
approved returns already in the seed data. **Deliberately not verified**: the actual booking click itself — same
category as the forward "Book courier" click from the 9 Oct session (a real call to Shiprocket's live API with
real consequences) — asked first, and stopped short at your choice rather than assuming. 523/523 tests, tsc/
eslint/build clean. See `docs/progress/2026-10-10-return-pickup-booking.md`.

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

1. Whatever artwork the client generates next from Batch 2/4/6 of `docs/design/asset-prompts.md` (occasion
   banners, default boutique fronts, diary desk, order-tracking header, mall destinations, auth panel,
   Christmas-dressed hero/map/cards) — `npm run images:sync` wires each one automatically, no code change needed.
2. ✅ Christmas festival theme built (10 Oct) — colours/countdown/ambience only, no art yet. Diwali has been
   built since Sprint 3 and is dated `2026-11-08`, only ~4 weeks out — worth actually scheduling it for real
   via `/admin/themes` once the client confirms the date/cutoff.
3. Sprint 4 (cinematic atrium entrance) — attempted against real art and reverted (client: "very bad looking");
   on hold until a different treatment is agreed.
4. ✅ Delivery speed options (Standard vs Express) built (10 Oct) — real courier data, live-verified end to end.
   ✅ Return shipment / reverse-pickup booking built (10 Oct) — admin-initiated `/admin/returns` "Book pickup".
   Two real clicks still outstanding (both deliberately stopped short of, by choice, not by any app defect):
   real Shiprocket courier booking (`/vendor/orders`, order GP-100176) and the return-pickup equivalent
   (`/admin/returns?status=approved`, GP-100145 or GP-100142) — everything up to each click is verified.
   Also: rotate `SHIPROCKET_WEBHOOK_SECRET` (deferred, now unblocked).
5. Then **Stage 13 — go-live**: production Supabase project + backups, rotate every pasted secret, delete
   test accounts/seed images, legal review of Privacy/Terms/Refunds (`lib/site.ts` `legalReviewed`), live
   Razorpay KYC. ✅ Verified email domain + Supabase auth SMTP through Resend — done 10 Oct.

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
| Shiprocket (API user + webhook token; Lite/PAYG plan) | Stage 8 | 🟡 login + serviceability + the full tracking webhook pipeline verified against the real API; webhook URL updated to the new domain. **Real booking (pickup-location/order/AWB) still unverified** — one human click needed, see 9 Oct log. 🔴 webhook secret rotation still pending (was exposed in chat, deferred until testing finished — testing is done now) |
| Resend | Stage 9/10 | ✅ domain `giftping.in` verified (SPF/DKIM/DMARC), real send confirmed to a real inbox, Supabase Auth SMTP also routed through it |
| OneSignal (free tier) | Stage 9 | 🔴 not needed yet |
| ~~Remove.bg~~ | — | ❌ cut from scope, cost constraint |
| ~~Railway~~ | — | ❌ cut from scope — Vercel Cron Job instead |
| ~~Cloudinary~~ | — | ❌ cut from scope — Supabase Storage + sharp + next/image instead |
