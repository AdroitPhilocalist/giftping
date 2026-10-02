# GiftPing — Project Reference

Static conventions for this repo. This file changes rarely — for *current* build status, open-questions,
and next steps, read [`PROGRESS.md`](./PROGRESS.md) instead (and read it first, every session).

The full staged build plan this project follows lives at the developer's
`~/.claude/plans/okay-so-i-have-immutable-river.md` (not part of this repo). `/docs/progress/*.md` holds
a dated log entry per completed stage/milestone with the reasoning behind decisions made along the way.

## What this is

GiftPing is a multi-vendor gifting marketplace for India, modeled on a physical mall: the platform sells
its own "GiftPing Originals" products directly, and partner vendors also list products on commission
(default 10%, configurable per vendor/category). The signature feature is the **Personal Gifting Diary** —
a private planner logging loved ones and important dates, with automated 7-day/3-day reminder emails and
push notifications enriched with curated gift suggestions.

Source documents (kept in the repo root for reference, not code): `GIFTPING_SRS_Development_Bible.docx`,
`Feature_Specification_Gifting_Platform.docx`, and the approved visual references in `ui-references/`.

## Cost constraint — hard budget ceiling, drives real architecture choices

The client has capped ongoing third-party costs at **~₹40,000–50,000/year for APIs, ~₹60,000–70,000/year
including Vercel hosting + domain**. This isn't a soft guideline — it eliminated services from the
original plan entirely and constrains which tier of everything else is acceptable:

- **Remove.bg is cut entirely.** No automated background-removal/replacement pipeline. Vendors upload
  their own finished product photos as-is; the image pipeline (Supabase Storage + `sharp` + `next/image`,
  see below) handles optimization/delivery only, not AI editing. (Client can be offered background removal
  as a paid add-on later, e.g. a self-hosted free library or a per-image API — but it is not in scope now.)
- **Railway is cut entirely.** The Stage 9 diary-reminder cron runs as a **Vercel Cron Job** instead
  (confirmed: Pro plan supports up to 100 cron jobs/project, configurable timeout up to 300s — comfortably
  enough for a daily batch reminder job at any realistic near-term scale). This is a free-tier-of-something-
  already-being-paid-for substitution, not a corner cut — functionally equivalent for this use case.
- **Shiprocket**: use the **Lite/pay-as-you-go plan** (no fixed monthly fee), not Basic/Advanced, unless/
  until shipment volume genuinely justifies the jump (Basic ≈ ₹1,000/mo, meant for 60–100 shipments/mo).
- **OneSignal**: free tier is expected to be sufficient **specifically because this is a web-only product
  with no native mobile app** (per the SRS's own "no mobile app" scope) — OneSignal's newer 1,000-MAU cap
  applies to mobile push, not the web push this project actually uses (free web push: 10k subscribers,
  unlimited sends). If a native app is ever added later, revisit this.
- **Cloudinary is cut entirely — replaced by Supabase Storage + `sharp` + `next/image`.** This was the
  single biggest budget risk (Cloudinary's free tier is small, and its next tier alone — ~₹91,000/yr — is
  more than the *entire* API budget). The replacement uses only infrastructure already being paid for:
  raw files go to **Supabase Storage** (Pro plan includes 100GB, no extra cost), a couple of fixed sizes
  are generated server-side at upload time with **`sharp`** (free, open-source — needed for React Email
  templates, which can't use `next/image`), and on-page display optimization (WebP/AVIF, resizing) comes
  from **`next/image`** via Vercel's own image pipeline (already covered by the Vercel Pro plan). No
  Cloudinary account, no `NEXT_PUBLIC_CLOUDINARY_*` env vars, ever. `lib/integrations/cloudinary.ts` does
  not exist — see `lib/storage/` instead (built in Stage 3/4 when image upload is actually implemented).
- **Resend stays as planned** (client's explicit choice over the cheaper Brevo alternative — 3,000
  emails/month free tier, ~₹20,600/yr for the next tier if the user base grows past that; this remains
  the one real cost-growth risk left to watch, budgeted for).
- **MSG91 phone OTP is built as a feature flag**, not a hard dependency — see Stage 2 notes below. It's
  already a secondary verification step (not the primary login method), so it can be switched off without
  a code change if SMS costs run ahead of budget. If it's ever turned on, use MSG91, not Twilio via
  Supabase's built-in phone auth — Twilio's India SMS rates (~$0.0075/SMS ≈ ₹0.65) are actually *more*
  expensive than MSG91's (~₹0.15–0.20/SMS) once converted to the same currency, despite how it looks at a
  glance; Twilio prices India routes at international-carrier rates, not local ones.
- Razorpay's ~2.4% transaction fee and Shiprocket's per-shipment courier cost are **not** part of this
  budget — they scale with GMV/order volume rather than being a fixed subscription, and the courier cost
  is normally recovered from the customer via the delivery charge.
- **Net effect of the above**: realistic year-one API costs land closer to ~₹10,000–20,000/yr, well under
  the ₹40,000–50,000 ceiling — comfortable headroom, not a tight squeeze.

## Design tokens and theming (Stage 12 — read `docs/design/DESIGN_DIRECTION.md`)

The look is defined by CSS variables `--gp-*` in `app/globals.css` (default theme "native": warm cream canvas `#FBF6F1`, deep forest green `#0C2A1D`, copper accent `#B75F22`, ink `#1C1916`; display serif **Newsreader**, body **DM Sans**). Tailwind's `brand-*` utilities (`bg-brand-primary`, `text-brand-secondary`, `bg-brand-surface`, `rounded-card`, `shadow-card`, `font-heading`…) read those variables at runtime via `@theme inline`.

- **Components must use tokens, never raw colours** — `lib/theme/theme-safety.test.ts` fails the build on a hex/rgb colour, `bg-white`, non-brand palette colours, etc. (exceptions: red for errors, `text-white`/`bg-black/…` scrims on photos, and lines marked `theme-safe:` with a reason).
- **A festival/seasonal theme is additive**: `app/themes/<id>.css` (a `:root[data-theme="<id>"]` block — `:root[…]`, NOT bare `[…]`, or it loses to the defaults), a `kind: "festival"` entry in `lib/theme/themes.ts`, artwork in `public/themes/<id>/` mapped in `lib/content/imagery.ts`, then it appears automatically in `/admin/themes` to schedule or preview — nothing else to wire. `app/layout.tsx` sets `data-theme` on `<html>` from `getActiveTheme()` (`lib/theme/active.ts`), whose priority is: an admin's own preview (`lib/theme/preview.ts`, an admin-only cookie re-verified on every read, shown site-wide via a floating "Stop" strip) → the live row in the `site_themes` schedule table (`lib/theme/schedule.ts` — pure resolver, same live/scheduled/paused/expired shape as banners; overlapping schedules resolve to whichever started most recently) → native. `/admin/themes` (`lib/admin/theme-actions.ts`) is the admin UI; `/design` is the live style sheet with a separate, simpler client-only switcher (demo themes `demo-night`, `demo-jewel` exist only to prove the mechanism and are never offered for real scheduling — `schedulableThemes()` filters to `kind: "festival"`).
- **CSS gotcha (cost us a real bug): the individual transform properties `scale`/`rotate`/`translate` apply on the OUTER side of `transform`.** Putting `scale` on an element that also moves via `transform: translate()` multiplies the translation (the robin cursor drifted away from the pointer). Move with one element, scale/flip on an inner one.
- Ornaments are SVG in code (`components/ornaments/`, `currentColor`); entrance motion is `components/motion/Reveal.tsx`; everything respects `prefers-reduced-motion`.
- **The robin as an interactive mascot** (client request): `components/motion/RobinCursor.tsx` (desktop-only custom cursor, one mount in `app/layout.tsx`, real art when delivered else a drawn fallback, respects reduced motion, keeps native cursor over text fields), `components/motion/CartFlyLayer.tsx` (a gift arcs from Add-to-Cart to whichever cart icon is visible, then it bounces — triggered via a `window` event, not React context, since the button and the icon are far apart in the tree), `components/orders/OrderCelebration.tsx` (the robin celebrates the moment `PayNowButton` confirms a real payment, not merely when a draft order is placed). All three degrade to nothing under `prefers-reduced-motion` and are each a single, easily-removable mount point. The cart itself is basket-themed: `components/art/BasketArt.tsx` (split into `BasketHandle`/`BasketBody` layers so photos sit BETWEEN them) + the `.basket-weave` background in `globals.css`. **Sprint 1 (2 Oct): the basket holds the shopper's REAL items** — `components/shop/LiveBasket.tsx` (client: product photos tucked over the rim, newest on the right, quantity badges, "+N", drop-in on arrival/add, jiggle when units grow; photos go through `/_next/image?w=128` via `optimizedImageUrl()` because an SVG `<image>` can't use `<Image>`), `components/layout/MiniBasket.tsx` (the header icon + a hover/after-add panel rendered through a PORTAL, desktop mouse only via `canShowMiniBasket()`; data from `GET /api/cart/mini`, loaded on demand, never on ordinary page loads; the add event carries the just-added item so it shows instantly — a provisional line replaced by the real cart under the same `displayKeys` so nothing re-animates), `components/shop/DeliveryRibbon.tsx` (free-delivery progress as a ribbon with a bow; `FreeDeliveryNudge` wraps it), `components/art/BasketIcon.tsx` (the header/tab-bar icon), and `OrderCelebration`'s default **"unwrap"** scene (box → lid lifts → robin → caption; skipped under reduced motion; the diary's gift-given moment keeps the older `burst`). All logic that can be pure is in `lib/shop/basket.ts` (tested). User-facing wording is still "Cart" everywhere — renaming to "Basket" is a deliberate, unmade client decision. **Animation lives on an INNER element, never the one carrying a placement `transform` (the gotcha above).**
- **The header is `position: fixed`, not `sticky`** (`HeaderShell.tsx`) — floating as a rounded, inset pill
  from first paint on desktop (`lg` and up, 1024px+), condensing into a tighter, solid-fill version of the
  same pill on scroll. This is a structural fact worth knowing before touching any of this again: a `sticky`
  element still reserves its own box in normal document flow at rest, so page content (the homepage hero
  photo included) only ever started right where the header ended — never extended up behind/underneath it.
  No amount of retuning the header's own colours ever fixed "I see the plain page background behind the
  navbar, not the photo," because with `sticky` the photo genuinely never reached there; confirmed directly
  via `getBoundingClientRect()` before switching to `fixed`. Two things compensate for `fixed` taking the
  header out of flow: **`app/layout.tsx`'s `<main>`** carries `pt-[5.5rem] lg:pt-[6.5rem]` (matching
  `.gp-header`'s own height exactly) so every *other* page renders pixel-identical to before — content
  doesn't jump up and hide under the now-floating header; **`HomeHero.tsx`'s hero `<section>`** cancels that
  same padding with a matching *negative* margin (`-mt-[5.5rem] lg:-mt-[6.5rem]`) plus the same amount back
  as its own `padding-top`, so its box (and the `absolute inset-0` photo filling it) starts at the true
  viewport top behind the header, while the actual headline/button content — an ordinary in-flow child —
  still lands at the same visual position as before. Any future full-bleed hero on another page needs this
  same pairing (negative margin + matching padding-top on that one section), not a change to `<main>`'s own
  padding.
  **This reverses an earlier documented decision** (flush-at-rest, pill-only-on-scroll, "never transparent")
  after a clearer client reference surfaced, and took four same-day corrections to get fully right — see
  `docs/progress/2026-09-28-navbar-floating-pill.md` for the full blow-by-blow (worth reading before changing
  this again, since three of the four corrections were plausible-looking dead ends). In short: (1) first pass
  kept a solid opaque fill — wrong; (2) added translucency via `blur(18px)` + up to 0.85 alpha — technically
  see-through but heavy enough to erase all photo detail into an abstract colour blur; (3) the low-alpha
  gradient was corrected, but paired with `backdrop-filter: blur(3px)`, which rendered as flat grey on
  another device even though it looked right here (`backdrop-filter` on a `position: sticky`-turned-`fixed`,
  mid-transition ancestor is a known cross-engine compositing risk, and macOS/Windows' "Reduce Transparency"
  setting makes several browsers substitute a flat colour for `backdrop-filter` specifically) — removed
  `backdrop-filter` entirely; (4) **the actual root cause** — `sticky` never let the photo reach behind the
  header at all — fixed as described above. `.gp-header-glass` (`globals.css`) is a light dark-green
  `background` gradient (~0.4 alpha at both ends, ~0.14 in the middle), no blur, no `backdrop-filter`: light
  enough that the photo behind it stays completely sharp. **This same-day log originally accepted a
  trade-off here as deliberate** — this light a tint reads clearly over the homepage's photo but weakens
  contrast on plain-background pages (`/mall` and similar) — **and it was later fixed for real** (client
  feedback, 2026-09-29, see `docs/progress/2026-09-29-header-page-aware-glass.md`): the header is now
  page-aware rather than one fixed tint everywhere. `.gp-header-glass` **defaults** to the opaque
  `.gp-bar-gradient` fill (same as condensed-on-scroll) on every page, and only uses the light glass tint
  above when `<html>` carries `data-hero-header="true"` — set by a small client component,
  `components/layout/HeroHeaderFlag.tsx`, mounted only inside the sections that actually bleed a photo up
  behind the header (`HomeHero.tsx`, `VendorHero.tsx`; see the `-mt-[5.5rem] lg:-mt-[6.5rem]` bleed pattern
  two paragraphs up). A `:not([data-condensed="true"])` guard means scrolling still always wins. Any future
  full-bleed hero on a new page needs both: the bleed pairing on its own section, **and** mounting
  `<HeroHeaderFlag />` inside it, or its header will default to opaque instead of showing the photo through
  a tint. `/diary` was deliberately left out of this — it has its own dark desk background that *could* be
  bled the same way, but that risks the already heavily-tuned flip-book layout for a cosmetic-only gain; the
  opaque default already fixes the contrast complaint there without touching it. Once condensed on scroll
  (`data-condensed="true"`) it's the same solid opaque fill (`.gp-bar-gradient`) on every page regardless —
  legibility over whatever's now behind the smaller pill matters more than the glass effect at that size.
  Mobile/tablet (below `lg`) are visually unaffected (still
  the flush bar per the client's mobile mockup) despite also now being `fixed` rather than `sticky`, since
  mobile has no hero to bleed under. **A gilded edge** (client request, "a golden touch," 2026-09-29): a
  `--gp-gold-edge` token (light-gold → copper → bright highlight → copper → light-gold, built from the
  existing `--gp-copper` accent rather than a separate yellow, so it doesn't clash with the copper already
  used for dividers/badges/the current-page underline) renders as a real 1.4px gradient ring around the
  desktop pill via the standard `mask-composite: exclude` gradient-border trick (a plain `border` can't take
  a gradient and keep `border-radius` — `border-image` ignores rounded corners), and as a thin bottom
  hairline on the mobile flush bar (a full ring there would put a stray line down both screen edges). This
  replaced the old, nearly-invisible flat copper `border-color`. `NavLinks.tsx`'s items are pipe-separated
  (`|`). "My Diary" is a quiet
  outlined pill with a book icon. `HomeHero.tsx`'s "Watch Our Story" button is a solid cream/white pill with
  dark ink text (was wrongly outlined/transparent); "Explore the Mall" was already correct (solid forest
  green). **The announcement strip is no longer rendered** (`AnnouncementBar.tsx` still exists, just unused)
  — the reference has no room for one above a pill with its own top margin; every OTHER client reference
  mockup still shows one, a real, deliberate divergence worth reconciling with the client.
- Chrome: `components/layout/` — AnnouncementBar, Logo (type-based until the real logo file exists), NavLinks (active underline), MobileMenu (Radix dialog), MobileTabBar, TrustStrip, Footer, HeroHeaderFlag (marks `<html data-hero-header>` from inside a hero section so the header knows to use its glass tint instead of the opaque default — see the navbar section above). Main nav lives in `lib/nav.ts`.
- Artwork: `lib/content/imagery.ts` (`siteImage(key, themeId)`, manifest written by `npm run images:sync` from `ui-references/batch-1/`); until a file exists each component draws its placeholder from `components/art/` (AtriumScene, MallMapArt, ShopfrontArt, DiaryArt, GiftBoxArt, Robin). The mall's nine places live in `lib/mall.ts` (used by `/mall`). Above-the-fold entrances use the CSS `.rise` class; `Reveal` only hides content below the fold.
- Gift-wrap style (`lib/commerce/wrap-styles.ts`) is cosmetic — flat fee, `orders.gift_wrap_style` written by the server after `place_order()`. "Shop by relationship" (`lib/relationships.ts`) maps people to real tag filters.
- Mascot: a robin (empty states, "Ask GiftPing AI", decorative cards) — `<Robin pose="perched|flying-gift|on-gift|peeking">` shows the client's art and falls back to a drawing; the logo (`Logo`) does the same. Slots for occasion banners (`world-<slug>`), default boutique fronts (`shopfront-*`), `diary-desk` and `order-hero` exist too. All artwork comes from ChatGPT prompts in `docs/design/asset-prompts.md`; business facts pages state live in `lib/site.ts` (`legalReviewed` must be flipped only after legal review).

## Stack decisions (deviations from the SRS, made deliberately — see plan doc for full reasoning)

- **Next.js**: latest stable (currently 16.x), App Router, TypeScript strict, no `any`. Next 16 renamed
  `middleware.ts` → `proxy.ts` ("Proxy") — use `proxy.ts` for route protection, not `middleware.ts`.
- **Tailwind v4**: CSS-first config via `@theme` in `app/globals.css`, not a `tailwind.config.ts` color
  extension (the SRS's example predates v4). No `tailwindcss-animate` plugin installed — don't use
  `animate-in`/`fade-in` utility classes until/unless it's added.
- **Auth**: Supabase Auth directly (no NextAuth.js layer). MSG91 phone OTP is a verification step on top
  of email/password, not a standalone login method (Supabase's native phone auth doesn't speak MSG91) —
  and per the cost constraint above, gated behind a feature flag (`PHONE_OTP_ENABLED` env var) so it can
  be switched off without a code change if SMS costs run ahead of budget.
- **No visual UI library** (no shadcn/MUI/Chakra) — everything in `components/ui/` is bespoke Tailwind.
  Headless/unstyled behavior primitives are fine and already wired: Radix UI (dialog, dropdown-menu, tabs,
  tooltip, slot), Sonner (toasts). Not yet installed, add when the relevant stage needs them: React Hook
  Form + Zod resolvers (forms), Embla Carousel (PDP gallery / homepage rows), react-day-picker (diary
  calendar), Upstash Redis + `@upstash/ratelimit` (rate limiting).
- **"Ask GiftPing AI" chat**: static UI routed to the rule-based diary suggestion engine — not a live LLM
  integration (deliberate scope decision, revisit later if desired).
- **Supabase API keys**: using the newer publishable/secret key format (`sb_publishable_...` /
  `sb_secret_...`) rather than the legacy anon/service_role JWTs — Supabase's own drop-in replacement,
  same env var names (`NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`) still used for
  continuity with the SRS's naming. `lib/db/client.ts` (browser), `lib/db/server.ts` (Server
  Components/Actions/Route Handlers, via `@supabase/ssr` + `next/headers` cookies), `lib/db/admin.ts`
  (service-role, RLS-bypassing, `server-only`-guarded — server-trusted code paths only). All three are
  generic over `lib/db/types.ts` (generated — regenerate with `npm run db:types` after any schema change,
  never hand-edit it).
- **Supabase CLI + Postgres client**: the CLI (`supabase`, via `brew install supabase/tap/supabase`) is
  linked to the remote project (`supabase link`) using a personal access token (`supabase login --token`)
  — the DB password alone isn't enough for `link`/`gen types`, only for `db push --password`. A `psql`
  client was also installed (`brew install libpq`, then `export PATH="/opt/homebrew/opt/libpq/bin:$PATH"`
  — it's keg-only, not symlinked by default) for hand-verifying RLS policies directly, which is
  significantly more reliable than reasoning about policy SQL from reading it: simulate a specific
  user/role with `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}';` inside
  a transaction, run the query, then `rollback;` — never `commit` a manual verification session. Both
  credentials (Supabase PAT, DB password) were provided once for initial setup and are not stored
  anywhere in this repo; a future session needing to run migrations again will need to ask the developer
  for them afresh (or use whatever the developer has cached locally, e.g. `supabase login` state).
- **Sentry**: wired via the modern `instrumentation.ts` + `instrumentation-client.ts` convention (not the
  older `sentry.client.config.ts` + `_app.tsx` pattern) — see those files plus `sentry.server.config.ts` /
  `sentry.edge.config.ts` / `app/global-error.tsx`. Only enabled when `NODE_ENV === "production"`, so
  nothing reports from local dev. `next.config.ts` wraps the config with `withSentryConfig` from
  `@sentry/nextjs/config` (not the deprecated `@sentry/nextjs` root export); source-map upload to Sentry
  is skipped until a `SENTRY_AUTH_TOKEN` is set at go-live — error capture works fine without it.
- **Mall experience**: illustrated + Framer Motion (`motion` package, not yet installed) animated pages
  using AI-generated imagery from `ui-references/` and future client-supplied images — not a real 3D/WebGL
  scene.
- **Security response headers**: `next.config.ts`'s `headers()` sets `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a
  `Permissions-Policy` that leaves camera/mic/geolocation off but allows `payment` for Razorpay's own
  origin — Vercel doesn't set any of these itself (its automatic HSTS only covers a verified custom
  domain).
- **Content-Security-Policy**: set in `proxy.ts` (NOT `next.config.ts` — Next's nonce mechanism requires
  minting a fresh nonce per request, which only `proxy.ts`/middleware can do), a per-request nonce +
  `'strict-dynamic'` rather than a host allowlist for `script-src`. This means a script that a
  nonce-trusted bundle loads dynamically (Razorpay's `checkout.js`, which itself goes on to load a second
  script for risk detection; OneSignal's SDK config fetch) is automatically trusted too, without listing
  those hosts by name — a stronger guarantee than an allowlist, and one that doesn't need updating when a
  vendor adds a subdomain. `style-src` allows `'unsafe-inline'` deliberately (~40 components use dynamic
  `style={{}}` from server data/theme tokens, never raw user text; Safari doesn't support the
  finer-grained `style-src-attr` alternative). Live-tested against a real Razorpay checkout session, a
  real Supabase Storage image request, and the real OneSignal SDK script (all clean, no CSP violations) —
  see `docs/progress/2026-09-28-csp.md` for exactly what was and wasn't exercised (OneSignal's and
  Sentry's `connect-src` entries are correct by configuration/research but not live-observed, since
  neither fires a real network call from localhost).

## Folder structure

```
/app            → routes: (shop), (auth), /vendor, /admin, /api, /kitchen-sink (dev only)
/app/(shop)     → /, /categories, /categories/[slug], /vendors, /vendors/[slug], /products/[slug],
                  /search, /wishlist, /account, /diary, /cart (Stage 5), /checkout (Stage 6)
/components/ui  → bespoke Tailwind primitives: Button, Card, Input/Textarea/Label, Select, Badge, Modal,
                  Dropdown, Tabs, Tooltip, Toast, Skeleton, Spinner
/components/layout → Navbar (reads session + wishlist count server-side), Footer, AccountMenu
/components/auth → GoogleButton, SubmitButton (useFormStatus-based pending state)
/components/shop → ProductCard, ProductImage (branded placeholder when no photo — see "Product imagery"
                  below), WishlistButton, ProductGallery, ProductBuyBox (variants + personalization +
                  working Add to Cart / Buy Now via the cart Server Actions), CartLineItem, GuestCartMerger, ReviewList, ProductFilters (plain GET form — query-param filters,
                  works without JS), CategoryCard, VendorCard, SearchBar, Pagination, VendorHero (a boutique's
                  own full-bleed banner hero on `/vendors/[slug]` — bleeds behind the fixed header the same
                  `-mt-[5.5rem] lg:-mt-[6.5rem]`/matching-`pt-` way `HomeHero` does; any future full-bleed
                  hero on a new page needs this exact pairing, not a change to `<main>`'s own padding — see
                  `docs/progress/2026-09-28-navbar-floating-pill.md`), VendorFeatureGrid (the "why shop here"
                  cards under it — generic, truthful claims per vendor, not one boutique's own marketing copy
                  hardcoded into the shared template; see `docs/progress/2026-09-28-vendor-storefront-
                  redesign.md`)
/components/vendor → VendorApplicationForm, ProductForm (RHF + Zod, variants via useFieldArray with
                  keyName "fieldKey"), ImageManager, ProductRowActions, PortalNav
/components/admin → DecisionButtons (Approve / Reject-with-reason modal), BroadcastVendorMessage (message
                  every approved vendor at once — see VendorAdminControls' own "Message" action for the
                  single-vendor version, same modal shape as its Suspend action)
/components/account → ProfileForm (RHF + Zod — name/phone), AvatarUpload (saves immediately on pick, same
                  pattern as VendorBrandingForm's logo slot)
/components/diary → the redesigned diary (a book on a desk — see "Stage 12 — the diary redesign" below): diary.css (all `dy-*` styles, in Tailwind's `components` layer) + diary-tokens.css (sticker colours on :root) +
                  fonts.ts (Caveat, diary-only); book/ (DiaryDesk, Book, SectionTitle, Polaroid), art/ (Sprig, OccasionSticker, WaxSeal, Doodles, DeskProps — all SVG, coloured from variables), forms/ (PaperDialog +
                  DiaryDialogs: person/date/gift dialogs and their ready-made buttons, parts.tsx), person/ (PersonSpread, PlanSheet, LovesBoard, PrivateNotes…), year/, review/, flip/ (DiaryBook — the page-turning home book) + pages/ (one component per diary page + buildSpreads), FirstRun…
/lib/account    → address-actions.ts (save / default / delete — session client, RLS + triggers enforce),
                  profile-actions.ts (updateProfileAction — name/phone only, explicit column whitelist,
                  session client, no elevated trigger needed since users_update_own_or_admin already permits it)
/lib/db         → Supabase clients + generated types + per-table query helpers: addresses.ts, orders.ts, categories.ts, vendors.ts
                  (incl. getVendorsForCategory — scopes a category page's vendor filter to vendors that
                  actually have products there), products.ts (listProducts w/ filter+sort+paginate,
                  getProductBySlug, getRelatedProducts, getTrendingProducts), reviews.ts, wishlists.ts
/lib/auth       → redirect.ts (safeRedirectPath — use for EVERY user-supplied post-login redirect), session.ts (getServerUser/requireRole — always re-reads role from the DB), actions.ts
                  (Server Actions: sign-up/in/out, Google OAuth, password reset), rate-limit.ts
                  (Upstash — fails open/no-ops if not configured, never blocks on a missing dev credential)
/lib/shop       → basket.ts (pure, tested: layoutBasket / optimizedImageUrl / deliveryNudge / miniBasket / displayKeys / withAddedLine — the basket drawing's layout, the free-delivery nudge and the /api/cart/mini payload), mini-basket-env.ts (`canShowMiniBasket()`), wishlist-actions.ts (toggleWishlistAction, a Server Action — not lib/commerce, that's
                  reserved for cart/checkout/commission/coupons, which are a different domain), review-
                  actions.ts (submitReviewAction upserts on the reviews_product_user_unique constraint —
                  "write a review" and "review again after a repeat purchase" are the same code path)
/lib/commerce   → refunds.ts (pure, tested: refundableRemaining / suggestRefundAmount / refundShare / returnWindow / RETURN_REASONS), returns.ts (customer return requests; server-only), commission.ts (built, tested: resolveCommissionRate = vendor override → category →
                  platform_settings default → 10, `!= null` so 0 is a real override; computeCommission).
                  pricing.ts (pure, tested: computeUnitPrice / effectiveStock / maxPurchasable — Stage 6
                  checkout MUST reuse these), cart.ts (server-only: resolve cart, getCartView, add/set/remove,
                  mergeGuestCartIntoUser), cart-actions.ts (Server Actions, rate-limited), guest-cart-cookie.ts
                  (httpOnly `gp_cart`), totals.ts (pure, tested: computeQuote — GST-inclusive prices, coupon scope +
                  allocation, vendor- vs platform-funded discounts, per-vendor delivery, gift wrap, commission
                  split), checkout.ts (server: rebuilds every price from the DB; persistOrder → place_order()),
                  checkout-actions.ts (apply/remove coupon, placeOrderAction), coupons.ts (resolve_coupon RPC),
                  settings.ts (platform_settings reader), delivery.ts (per-vendor pincode serviceability, cached, fail-open),
                  shipments.ts (tracking webhook -> apply_shipment_update + notifications), payments.ts (startPayment, confirmCaptured, verifyClientPayment,
                  processWebhookEvent — see the Stage 7 notes), payment-actions.ts
/lib/security   → encryption.ts (AES-256-GCM encryptSecret/decryptSecret, key VENDOR_BANK_ENCRYPTION_KEY —
                  losing it makes stored bank numbers unrecoverable; same value needed in Vercel)
/lib/vendor     → product-csv.ts (pure, tested CSV parser + row validator reusing productSchema), product-import.ts + import-actions.ts (server preview/commit; import_vendor_products() is atomic, service_role-only, refuses a re-uploaded file), dispatch.ts (accept order + resumable Shiprocket booking saga), fulfilment-actions.ts, actions.ts (registerVendorAction, saveProductAction, setProductActiveAction, image
                  actions), product-helpers.ts (syncProductThumbnail, sendBackToReviewIfLive)
/lib/admin      → refunds.ts + refund-actions.ts (return decisions; begin→gateway→complete refunds, retryable), actions.ts (approve/reject vendor & product; writes audit_logs + notifications via the
                  admin client — those tables have no client write policies), vendor-message-actions.ts
                  (messageVendorAction / broadcastVendorMessageAction — official admin→vendor comms via
                  notifyUser(), category "vendor_updates"; also audit-logged)
/lib/catalog    → tags.ts (OCCASION_TAGS, RECIPIENT_TAGS, labelForTag — shared by vendor form + shop filters)
/lib/notifications → notify.ts (notifyUser: in-app + optional email, preference-gated, NEVER throws — use it for every user-facing message), email-layout.ts +
                  templates.ts (pure, tested, HTML-escaped order/shipment/vendor emails)
/lib/marketing  → **customer marketing email (consent-first — read docs/compliance/marketing-email-dpdp.md before touching).** consent.ts (wording + MARKETING_NOTICE_VERSION — bump it if the text changes), unsubscribe-token.ts (signed, never-expiring `<userId>.<HMAC>` links under MARKETING_UNSUBSCRIBE_SECRET), segments.ts (opted-in people only; purchase history only, never diary data), send-plan.ts (daily/monthly budgets — the free-Resend-tier lever, editable in /admin/campaigns), campaign-email.ts (plain text → escaped HTML + RFC 8058 List-Unsubscribe headers), audience.ts, settings.ts, sender.ts (queueCampaign / processCampaigns: claims recipients before sending = at-most-once, RE-CHECKS consent per person at send time, fails closed without the secret, never auto-retries an ambiguous failure), unsubscribe.ts + consent-actions.ts. **`users.marketing_opt_in` is the single source of truth and now defaults to FALSE (it used to default TRUE with nothing ever asking — not valid consent); a trigger logs every change to `marketing_consent_log` with source + notice version; change it only via the `set_marketing_consent()` RPC (service_role).** Admin UI: /admin/campaigns; cron: /api/cron/marketing (04:00 UTC); public: /unsubscribe (confirm page; a GET never changes anything) + POST /api/marketing/unsubscribe. The old `promotions` notification category is unused — don't wire anything to it.
/lib/wishlist   → price-drops.ts (pure, tested: effectivePrice, classifyPriceDrop, buildDigests — the alert rules: ≥5% net drop, 14-day expiry, 7-day per-person/per-product cooldown, skip people who wishlisted AFTER the drop, one digest per person) and price-drop-job.ts (server: runs from the daily cron, `runPriceDropAlerts`). Events come from the `products_record_price_drop` trigger into the server-only `price_drop_events` queue (RLS on, no policies, no client grants). **A vendor edit to a live product sends it back to admin review, so a drop only becomes real once re-approved — the job leaves events queued until the product is live again instead of announcing a price nobody can buy.** Events are claimed (processed_at, atomically) BEFORE sending: at-most-once by design.
/lib/integrations → resend.ts (fetch client; no-op without a key), razorpay.ts (REST client) + razorpay-signature.ts (pure HMAC checks), shiprocket.ts (REST client, cached JWT) +
                  shiprocket-status.ts / shiprocket-webhook.ts (pure, tested) built; msg91.ts, onesignal.ts, resend.ts not built yet ( no
                  cloudinary.ts or removebg.ts at all — both cut per the cost constraint above)
/lib/storage    → (also diary-photos.ts — the PRIVATE `diary-photos` bucket: written only by POST /api/diary/photo, read only through signed URLs; processDiaryPhoto in resize.ts) (also branding.ts — vendor logo/banner storage in the public `vendor-branding` bucket, written only by POST /api/vendor/upload-branding; processVendorLogo/processVendorBanner; processBannerImage + the public `site-banners` bucket helpers in upload.ts — server-only writes via POST /api/admin/upload-banner) (also avatar.ts — a customer's profile photo in the public `user-avatars` bucket, written only by POST /api/account/upload-avatar; processUserAvatar in resize.ts, same face-aware square crop as a diary photo) resize.ts (processProductImage: sharp validates the real bytes, EXIF-rotates, re-encodes
                  to WebP full 1600 / medium 800 / thumb 400, strips metadata; ImageValidationError),
                  upload.ts (service-role writes to the public `product-images` bucket). The bucket has NO
                  client write policies — the only write path is POST /api/vendor/upload-image (a route
                  handler, because Server Actions cap at 1MB and Vercel bodies at 4.5MB; the client
                  downsizes files >1.5MB first). Display optimisation is next/image (remotePatterns in
                  next.config.ts), not a lib file.
/lib/seo        → **SEO (admin: /admin/seo).** pages.ts (pure, tested: the fixed pages' code defaults + `resolveSeo` — an admin override in `site_seo` only OVERRIDES, blank/no row = default; `truncateText`, `lengthState`), site.ts (`siteUrl()` from NEXT_PUBLIC_APP_URL, `baseOpenGraph()`), robots.ts (PRIVATE_PATHS — **robots Disallow is PREFIX matching, so `/vendor` would also hide the public `/vendors/*`; the portal is `/vendor/` + `/vendor$` and robots test proves no public page is blocked**; non-production Vercel envs disallow everything), sitemap.ts (pure builder), site-seo.ts (server: `pageMetadata(key)` — NEVER throws, falls back to defaults). `app/robots.ts` + `app/sitemap.ts` (sitemap is read with the visitor's own anon session so RLS decides what's listed — never the service role). Category/boutique/product/gifts-for pages set their own canonical + share card; **filtered category URLs are noindex**. **Gotcha: a page that sets no `openGraph` inherits the layout's WHOLE object, so the layout's `openGraph` carries only siteName/image — never a title (it showed the home title on every page).** Category `meta_title`/`meta_description` (edited in /admin/categories) were saved for a while but read by nothing until this — if you add an admin field, check something actually reads it.
/lib/search     → index.ts — searchProducts(), wraps the search_products() Postgres RPC (Stage 1) and
                  re-joins ranked ids against the vendor/category-joined product-card shape (the RPC
                  itself returns raw unjoined rows). Swappable for Algolia later without touching callers.
                  suggest.ts (pure, tested, shared by client + server: normaliseSuggestQuery, highlightParts, result types)
                  and suggestions.ts (server: getSuggestions — search-as-you-type via the suggest_product_ids() RPC, which
                  PREFIX-matches every typed word (`word:*`) because search_products()/websearch_to_tsquery only matches whole
                  words, plus name-contains matches on categories and approved boutiques). Served by GET /api/search/suggest
                  (public, searchRateLimit per IP); the client is components/shop/SearchBar.tsx (a combobox over a plain GET
                  form, so Enter still searches without JS or if the lookup fails).
/lib/diary      → recurrence.ts (pure date maths, Feb 29 → Feb 28, exact-day reminders), gifting-score.ts, suggestion-matcher.ts,
                  view.ts (dashboard view-model), reminder-email.ts (paper-look HTML email, HTML-escaped, safe-URL-only images), plans.ts (gift plan rules: Idea→Chosen→Ordered→Wrapped→Given),
                  memories.ts (last year's gift, year summary/review, "remembered" streak), present.ts (wording helpers), page-data.ts (rows → the plain shapes components take), ui-types.ts,
                  gift-links.ts — all pure + tested; candidates.ts (catalogue slice for ideas),
                  reminders.ts (the cron engine, exactly-once via diary_reminder_log), actions.ts (Server Actions), format.ts
/lib/validation → Zod schemas, one file per domain, shared by client forms and API routes
/lib/content    → banners.ts (pure, tested: bannerStatus / audienceMatches / visibleBanners / safeCtaUrl for the admin-managed homepage carousel); imagery.ts — central image-asset map (see "Image handoff" below) — not built yet
/lib/utils      → cn.ts (clsx + tailwind-merge), format.ts (formatCurrency — en-IN Intl formatter)
/emails         → not used: the diary reminder email is built by lib/diary/reminder-email.ts (plain HTML, no dependency); revisit React Email in Stage 10 if wanted
/app/api/cron   → diary-reminders/route.ts (built), invoked daily by Vercel Cron (vercel.json, Bearer CRON_SECRET); also runs the stale-unpaid-order
                  and stale-guest-cart cleanups. Not a Railway worker, per the cost constraint above
/scripts        → seed.ts (idempotent — categories, 2 vendors, 6 products w/ variants/images/reviews); seed-demo.ts (`npm run seed:images && npm run seed:demo [-- --reset]`: ~57 products, 14 demo shoppers, ~186 reviews, 43 back-dated orders through the real SQL functions, a diary for the test customer written like a real family — Mom, Dad, Riya, Nani…, taglines, notes, 3 years of gifts with what they said, moments already passed this year, 3 gift plans — plus wishlist/notifications; deterministic and safe to re-run; dev database only); make-seed-images.ts (product pictures cut from the client artwork)
/supabase/migrations → schema migrations, applied in order
/public/seed-images → dev-only seed photography cropped from the client's own approved ui-references
                  (see "Product imagery" below) — not meant to ship to production, Stage 4+ vendor photos
                  replace these
/public/images  → static site imagery (logo, hero art) — distinct from Supabase Storage, which holds
                  user/vendor-generated content (see "Image handoff" below)
/docs/progress  → dated per-stage log entries
```

`/vendor` (portal pages live in the `(portal)` group so `/vendor/register` stays public and outside the approved-vendor layout) and `/admin` are real route segments (not `(group)`s) since they need their own persistent
sidebar layout. `(shop)` and `(auth)` are route groups purely for organization. Watch for the collision
class of bug this caused once already: `pathname.startsWith("/vendor")` in `proxy.ts` also matched the
public `/vendors/*` shop routes — see "Auth" below.

## Product imagery (Stage 3 state — read before assuming every product has a real photo)

Two of the six seeded products (`luxe-memory-hamper`, `premium-gift-hamper`) use a real photo —
`public/seed-images/hamper.webp`, cropped with `sharp` from the client's own approved
`ui-references/7b1ef5fb-...png` (the original "Luxe Memory Hamper" PDP mockup). The rest deliberately have
`thumbnail_url = null` and render `components/shop/ProductImage.tsx`'s branded gradient+gift-icon
placeholder — not a fake stock photo. A lower-resolution mobile homepage screenshot was tried as a source
for 3 more crops and rejected: the source card images were only ~130×108px, and upscaling 6-7x to a usable
size produced visibly blurry results not worth shipping even as placeholders. Don't reuse those as-is if
revisited later — find a higher-resolution source or wait for real vendor photos in Stage 4.

## Database schema

The SRS's table list is a **floor, not a ceiling** — the developer explicitly wants richer data capture
(more tables/fields) wherever it improves the customer experience or gives the admin better analytics, not
a minimal schema. Add tables/fields freely as real needs surface; don't force new data into `jsonb` blobs
just to avoid a migration. The non-negotiable constraint is RLS on every table and no unnecessary PII
exposure — richness of data and tightness of access control both apply fully, always.

**Implemented in Stage 1** (27 tables, all RLS-enabled — see `supabase/migrations/` for the authoritative
definitions, and `docs/progress/2026-09-18-stage-1-database-schema-rls.md` for full reasoning): the SRS's
full table list, plus `cart`/`cart_items` (missing from the SRS entirely), `product_images` /
`product_variants` / `product_qna` as dedicated tables instead of a jsonb blob, `coupon_redemptions` (for
enforceable per-user coupon limits), `loyalty_ledger` ("GP Rewards", referenced in the UI), `audit_logs`,
`notification_preferences`. `products.vendor_id` is `NOT NULL` — in-house products belong to a real seeded
"GiftPing Originals" vendor row (`is_in_house = true`, 0% commission) rather than allowing a null vendor.
`orders.status` is a coarse rollup automatically recomputed from per-vendor `shipments.status` by a
trigger (`recompute_order_status()`) — never set directly. `public.users.id` references `auth.users(id)`
directly (Supabase Auth is the identity source of truth) via an auto-provisioning trigger
(`handle_new_auth_user()`) — there's no separate signup-time insert to write. Coupon validity is checked
exclusively through a `validate_coupon()` RPC, not raw table SELECT, so codes can't be enumerated by
customers. **The Personal Gifting Diary tables (`diary_contacts`/`diary_events`/`gift_history`)
deliberately have NO admin RLS bypass** — this is the one place `is_admin()` is intentionally absent,
matching the SRS's explicit privacy promise that admins see only an aggregate count, never diary content.
Full-text search (`products.search_vector`) is trigger-maintained, not a generated column — see the "Two
real Postgres bugs" note below for why. `users.timezone` (default `Asia/Kolkata`) is in place for the
Stage 9 diary cron. DPDP-style deletion uses `users.deleted_at`/`anonymized_at` rather than a hard delete.

### Two real Postgres bugs hit and fixed while building this (worth knowing before writing more RLS/triggers)

1. **A `GENERATED ... STORED` column must be strictly IMMUTABLE.** `array_to_string()` (used to fold
   `tags`/`occasion_tags`/`recipient_tags` into the search vector) is only `STABLE`, so
   `search_vector` couldn't be a generated column — it's a plain column kept in sync by a
   `BEFORE INSERT OR UPDATE` trigger (`products_set_search_vector()`) instead, which has no such
   restriction and behaves identically from the caller's side.
2. **`SECURITY DEFINER` masks `current_user` for the function's entire body, including nested calls.**
   The four ownership-enforcement triggers (`prevent_role_self_escalation`,
   `prevent_vendor_admin_field_tampering`, `enforce_product_status_transitions`,
   `enforce_review_update_scope`) were originally declared `SECURITY DEFINER`, which made
   `current_user` read as the function's *owner* (`postgres`) for every caller — silently letting a
   vendor's own authenticated session self-approve their own product or escalate their own role, since
   the "is this a trusted service-role context?" check (`is_service_role()`, which reads `current_user`)
   was always true from inside them. Fixed by making those four functions `SECURITY INVOKER` (they don't
   need elevated rights themselves — they only inspect `NEW`/`OLD` and delegate to already-privileged
   helpers like `is_admin()`), leaving `current_user` correctly reflecting the real caller
   (`authenticated`/`anon`/`service_role`). **Rule of thumb going forward: a trigger function that reads
   `current_user`/`session_user` to distinguish "trusted server" from "ordinary client" must never itself
   be `SECURITY DEFINER`,** or that distinction silently stops working — verified by hand-testing as a
   simulated vendor session (`SET LOCAL ROLE authenticated` + `request.jwt.claims`), not by reasoning
   about the SQL alone.

Also: a bare `CREATE TABLE` in this schema is **not** independently queryable by `anon`/`authenticated`
merely because an RLS policy allows it — Postgres denies access at the GRANT level first, before RLS
policies are even consulted. `supabase/migrations/20260917181523_grant_table_privileges.sql` grants the
baseline `SELECT/INSERT/UPDATE/DELETE` table privileges (Supabase's Studio does this automatically for
tables created through its UI; a raw SQL migration via the CLI does not) that every RLS policy in this
project depends on to have any effect at all.

### Two more gaps found while building Stage 3 (catalog) — same "denormalized column, nothing keeps it in
sync" and "RLS blocks an innocent-looking join" failure classes as above, worth scanning for elsewhere

1. **Denormalized rollup columns need their own trigger, every time — Stage 1 missed one.**
   `products.average_rating`/`review_count` existed from Stage 1 but nothing recomputed them when a
   review was added. Fixed with `recompute_product_rating()` (`supabase/migrations/
   20260918154410_maintain_product_rating_rollup.sql`), a trigger on `reviews` insert/update/delete. This
   one is correctly `SECURITY DEFINER` — unlike the four Stage 2 triggers, it never inspects
   `current_user`, so there's no masking bug risk; it genuinely needs the owner's elevated privilege
   because an ordinary customer leaving a review has no `UPDATE` grant on `products` otherwise. If a
   future stage adds another denormalized aggregate (e.g. a vendor-level rating rollup), it needs the
   exact same trigger pattern — it will not maintain itself.
2. **A privacy-correct RLS policy can silently block a legitimate-looking display need.** Showing "reviewed
   by Priya S." required joining `reviews` → `users`, but `users_select_own_or_admin` correctly refuses
   that join for anyone who isn't the reviewer or an admin — a stranger browsing products can't read
   another customer's `full_name`. The fix was not to loosen that RLS policy (a real privacy regression)
   but to denormalize a privacy-safe `reviews.reviewer_display_name` ("First L.") onto the review itself
   at insert time (`supabase/migrations/20260918154731_review_reviewer_display_name.sql`). This one is
   correctly `SECURITY INVOKER` (no `security definer` at all) — the inserting user always has read access
   to their own `users` row already, no elevated privilege needed. **Pattern to reuse**: when a public
   display need wants a field off a privacy-protected table, denormalize a display-safe derived value at
   write time rather than opening up the source table's RLS.

### Stage 4 (vendor portal) — four more failure classes found by probing before building on the schema

1. **RLS is row-level, not column-level.** `vendors` held PAN/GSTIN/bank/commission next to public storefront
   fields, so `anon` could read them. Sensitive fields now live in `vendor_private` (owner/admin RLS only);
   bank account numbers are additionally AES-256-GCM encrypted in the app layer (only last4 stored in clear).
   Rule: never put a private column on a table that has a public SELECT policy.
2. **A permissive INSERT policy is a privilege-escalation hole.** Any customer could insert an
   already-approved, featured, 0%-commission vendor or an `active` product with fake ratings.
   `vendors_insert_own_pending` / `products_insert_own_pending` force status pending and zeroed derived fields;
   the update-guard triggers (INVOKER, per the rule above) block status/vendor_id/counter/approved_at edits.
   Check INSERT policies as carefully as UPDATE ones for every new table a non-admin can write to.
3. **`INSERT … RETURNING` must also pass the SELECT policy.** A SELECT policy that re-looks the row up by id
   (`owns_product(id)`) can't see a row mid-insert, so the vendor's own insert failed. Compare the row's own
   column instead (`is_vendor_owner(vendor_id)`).
4. **Column names differ across tables**: `vendors.total_sales` but `products.total_sold` — check
   `lib/db/types.ts` before writing triggers/policies that touch counters.

Commission: `vendor_private.commission_rate` (nullable override) → `categories.commission_rate` (nullable) →
`platform_settings.default_commission_rate`. Applied at order time (Stage 5–7), not at listing time.
Testing: `npm test` (Vitest; needs `@types/node@^22`). Migration push: `supabase db push --password …` with
stdin closed (`< /dev/null`) — a hung nested-heredoc one-liner once left a migration file empty; write SQL
files with the editor tool.

### Stage 5 (cart) — how carts are stored and what the DB enforces

- **Two storage paths, one code path**: a signed-in cart uses the shopper's session client (RLS enforces ownership); a guest
  cart has no RLS path by design and uses the service-role client, reachable ONLY via the token in the httpOnly `gp_cart`
  cookie. Never add a way to look a guest cart up by anything a client can send other than that cookie.
- `cart_items_enforce_catalog` (INVOKER trigger) makes the DB the authority: product must be active, `vendor_id` is copied
  from the product, variants must belong to it / be active / be one per group. `unit_price_snapshot` is display-only and
  must never be trusted — Stage 6 recomputes every price via `lib/commerce/pricing.ts`.
- `cart_items.variant_ids uuid[]` holds the full option selection (`variant_id` mirrors the first for the FK). `order_items`
  needs the same array in Stage 6.
- `merge_guest_cart()` is service_role-only SECURITY DEFINER (it never reads `current_user`, so the Stage 2 masking rule
  doesn't apply). Merge runs from sign-in / sign-up / OAuth callback; cookies can only be cleared in actions/route
  handlers, never during render — hence the `GuestCartMerger` client safety net on `/cart`.
- **PostgREST batch inserts fill keys missing from some rows with NULL, not the column DEFAULT** — a bulk insert where only
  one row sets `personalization` violates NOT NULL. Set every key on every row (same lesson as the seed script).

### Stage 6 (checkout) — order creation, money rules, and two more schema lessons

- **Orders are created only by `place_order()`** (SQL, service_role-only, atomic; see the Stage 6 log). The TS side computes amounts from
  the catalogue via `lib/commerce/checkout.ts` + `totals.ts`; the SQL function refuses internally inconsistent numbers
  (`TOTALS_MISMATCH`). The client sends only address id / gift options / idempotency key — never a price. `unit_price_snapshot` is never read.
- **Money rules** (all in `totals.ts`): prices are GST-inclusive; coupons apply to eligible (vendor/category) lines and are allocated in whole
  paise; vendor-scoped coupons are vendor-funded, platform-wide ones platform-funded; delivery is per vendor shipment with a free threshold.
  Delivery/gift-wrap/threshold live in `platform_settings`.
- **Financial columns never go on a customer-readable table.** Commission/payout live in `order_item_financials` (vendor-own + admin
  SELECT). Same rule as `vendor_private`: RLS is row-level, so a row a customer may read exposes every column of it.
- **Every new function is EXECUTE-able by `anon`/`authenticated` unless you revoke it** — the Stage 1 grants migration set
  `alter default privileges … grant execute on functions`. Always `revoke all … from public, anon, authenticated` and grant to `service_role`
  for anything that isn't meant to be called from the client.
- Checkout only *checks* stock; it reserves nothing. Stage 7 decrements stock atomically on payment capture and clears the cart.
- An unpaid `created` order is a draft: the shopper's next checkout supersedes it and returns its coupon use. Stale drafts from shoppers who
  never come back need a cron (Stage 9).
- Route-prefix check for the new `/orders` protected segment: it doesn't prefix-match `/vendor/orders` (which starts with `/vendor`).

### Stage 7 (payments) — where payment truth lives, and what was NOT verified against the real gateway

- **The webhook is the source of truth; the browser callback is only a fast path.** Both call `confirmCaptured()` → SQL `confirm_order_payment()`
  (service_role-only, atomic, idempotent, row-locks the order). Never fulfil an order from anything else. The amount always comes from the
  server-stored `orders.total_amount` when creating the Razorpay order, and from Razorpay itself (re-fetched / signed webhook) when confirming.
- **Webhook rules** (`app/api/webhooks/razorpay/route.ts`): verify the HMAC of the RAW body before parsing; empty secret never validates; claim the
  event id in `webhook_events` for idempotency; answer 5xx on failure so Razorpay retries (all steps are idempotent); a 200 for unknown orders.
- `payment.authorized` is also sent for auto-captured payments — look up the payment's real state before calling capture (a second capture errors and
  would loop the webhook).
- If a captured payment can't be fulfilled (sold out, wrong amount, cancelled/superseded order, duplicate payment) the money is refunded automatically
  and audit-logged — the SQL function returns `refund_needed` rather than keeping the money. Stock decrements happen inside a sub-transaction so a
  partial multi-item failure rolls every decrement back.
- **Vendors see only paid orders** (`order_visible_to_vendors()`): an RLS policy that was fine for Stage 1's empty tables leaked buyers' addresses for
  unpaid drafts once orders existed. Re-check vendor/customer visibility whenever a new order state is introduced.
- Next.js treats folders starting with `_` as private (not routable) — don't name route folders `_something`.
- **Unverified with real Razorpay** (built + tested against a local mock only): the Checkout modal completing a payment, real webhook payload shapes,
  real capture/refund responses. See "First real test" in `docs/progress/2026-09-19-stage-7-payments.md`. Razorpay Route split settlement is not built.

### Stage 8 (delivery) — shipment truth, rollups, and what was NOT verified against real Shiprocket

- **Courier status changes go through `apply_shipment_update()` only** (SQL, service_role-only): idempotent (timeline events dedupe on shipment+time+status)
  and MONOTONIC — couriers send events late and out of order, so a status only moves forward (pending < confirmed < picked_up < in_transit <
  out_for_delivery < delivered); delivered/cancelled are terminal; RTO sticks. Never set `shipments.status` from anywhere else.
- **A rollup over child rows must include children that don't exist yet.** `recompute_order_status()` counted only vendors that already had a shipment,
  so a two-vendor order looked "shipped" when one vendor hadn't booked. It now treats a vendor with no live shipment as `pending`. Re-check any similar
  aggregate when a multi-party flow is added.
- **External-API sagas must be resumable.** Vendor booking claims a `shipments` row first (partial unique index), saves each Shiprocket id as it arrives, and a
  retry skips completed steps; a failure before anything is created releases the claim. Don't create a second external order on retry.
- Serviceability GATES checkout and gives an ETA but does NOT price delivery (flat + free-threshold from Stage 6 stays). It fails open (unknown ⇒ allowed);
  the server re-checks in `placeOrderAction`. A disabled button is never the control — React also suppresses `onClick` on a disabled button, so test server
  checks by invoking the handler (`el[reactPropsKey].onClick()`), not by re-enabling the DOM attribute.
- Shiprocket login tokens are cached in `integration_tokens` with a single-flight login and a "reuse a token someone else already refreshed" 401 path — parallel
  lookups must not each log in. Shiprocket rejects webhook URLs containing "shiprocket"/"kartrocket"/"sr"/"kr": the route is `/api/webhooks/courier-tracking`.
- Vitest has no `@` path alias configured: pure modules that tests import must use relative imports.
- **Unverified with real Shiprocket** (mock only): payload/response field names, pickup-location onboarding, real status strings. See "First real test" in
  `docs/progress/2026-09-19-stage-8-delivery.md`.

### Stage 9 (diary) — privacy that survives copying, and how the cron stays exactly-once

- **Diary privacy travels with the data.** Anything that copies diary content into another table inherits its privacy: reminders put a contact's name in
  `notifications`, whose admin-read policy would have leaked it. Diary reminders are now owner-only there (`type <> 'diary_reminder'` on the admin branch).
  When you add a new place diary content can land (emails aside), check who can read it.
- **`user_id = auth.uid()` does not validate foreign keys.** A user could point their event at another user's `contact_id`. Guard triggers (SECURITY INVOKER, so the
  lookup runs under the caller's RLS and a foreign row is invisible) require referenced rows to belong to the same user. Apply this to every owner-only table that references another.
- **A `"use server"` file may only export async functions** (not constants or types-as-values) — it crashes at request time, not at build. Put shared constants in a plain module.
- Reminders are **exactly-once by claim**: insert into `diary_reminder_log` (unique on event + occurrence + lead time + channel) BEFORE sending; conflict ⇒ already sent. Failed email ⇒ release the claim.
  A reminder is due on exactly one calendar day (`daysUntil === leadTime`), never "within N days", so a daily run and its re-runs are safe. "Today" is the owner's timezone (`users.timezone`).
- Vitest now has `vitest.config.ts` (`@` alias) — pure modules can use `@/` imports in tests.
- Not verified with real Resend (no key at the time of writing); web push is Stage 10.

### Stage 12 — the diary redesign (read `docs/progress/2026-09-25-stage-12-diary-redesign.md`)

- **The diary is a book on a desk**, built from parts (CSS paper/leather/tape/seal, SVG florals and occasion stickers), never from a flat picture of a page. Reference screens: `ui-references/diary/`. **See it without signing in:** `/design/diary?screen=home|first|person|year|review` and `/design/diary/email` (development only, 404 in production) render the real components over `app/(shop)/design/diary/fixtures.ts`.
- **Diary CSS is in `@layer components` on purpose.** Unlayered CSS beats every Tailwind utility, so `absolute` on a `dy-note` silently lost. Anything overriding a `dy-*` rule must be a utility. Container-scoped variables don't reach a Radix portal: dialogs carry `dy-scope` + the font class; sticker colours live on `:root` (`diary-tokens.css`) so a sticker also works in the bell and inbox.
- **A Server Component cannot pass a function prop to a Client Component** (crashes at request time, tsc doesn't see it). Dialogs take a render-prop `trigger`, so pages use the exported ready-made buttons (`AddPersonButton`, `EditDateButton`…).
- **Photos of the people in a diary are private.** `diary_contacts.photo_url` holds a storage PATH, CHECK-pinned to `<owner>/<person>-<uuid>.webp`; the `diary-photos` bucket has no client policies; upload = `POST /api/diary/photo` (session-proven ownership, sharp re-encode, service-role write); display = 1-hour signed URLs and a plain `<img>` (never `next/image` — the optimiser must not cache a private picture). `eraseUser` and removing a person delete the files; a future feature that adds another place personal files can land must do the same.
- **`diary_gift_plans`** (owner-only, no admin bypass, INVOKER guard trigger): one plan per (date, occurrence). "Ordered" is inferred from the user's own paid order for the chosen product; "Given" writes the gift into history once. `export_user_data()` includes it.
- **`/diary` is a flip book** (`docs/progress/2026-09-27-stage-12-diary-flip-book.md`): `components/diary/flip/DiaryBook.tsx` (client — hinged leaf, pager, tabs, keys, swipe, `?p=<spread>`) takes `SpreadDef[]` built on the server by `components/diary/pages/buildSpreads.tsx` from `lib/diary/home-book.ts`. Each page is its own component in `components/diary/pages/`; people go six to a page, so the book grows as the diary does. Big screens (≥1280×720) show two pages and never scroll; phones/tablets show one page and scroll inside it. `flip/FitPage.tsx` wraps every two-page-mode page: if the page is taller than the window it draws the page smaller (a `1/scale` box + `transform: scale`, not `zoom`) and drops `.dy-drop-1` then `.dy-drop-2` extras first — so pages are built at full size and never need scrollbars. **Nothing sits under the book**: turning is the index tabs, `Turn the page →` + a folded paper corner (`.dy-turn`/`.dy-curl`) written on each page, arrow keys, swipe, and `TurnLink` "See more →" links on the front spread (`pages/FrontPages.tsx`: everything in small — tickets, ideas, score, month, people). Shared constants (`TAB_META`, `tabHref`) live in `flip/tabs.ts`, because a `"use client"` module's exports aren't usable from a server component. The person / year / review pages still use the older `book/Book.tsx`.
- **A moment can only be "missed" if it was already in the diary** (`created_at`); "remembered" = a gift within the 45 days before or the day after. No pronouns are guessed anywhere in the copy ("Things Mom loves"). Sharing sends numbers only.

### Stage 11 (admin) — money-moving admin actions

- **Undo the physical side before the financial side.** Admin cancel = `cancel_order_and_restock()` (atomic) THEN the gateway refund; a refund failure leaves a cancelled order + captured payment
  that the admin can retry, never a refunded order that can still ship. Any future money-moving action (partial refunds, returns, settlements) should keep this ordering and stay idempotent.
- Admin pages read with the admin's OWN session so RLS `is_admin()` is the enforcement, and every admin Server Action re-checks `role === "admin"` from the DB — never a client claim.
- Diary tables have no admin policy, so admin queries can't reach diary content even by accident.

### Stage 11 (admin suite) — lessons worth reusing

- **A status flag must be enforced where the data is read, not only where it's written.** Suspended vendors' products stayed public because only checkout checked vendor status; the products SELECT policy now includes `vendor_is_approved(vendor_id)`.
  Re-check public SELECT policies whenever a new "hidden" state is introduced.
- **Payouts**: each delivered line is settled exactly once via `order_item_financials.settlement_id`, after `platform_settings.payout_hold_days`. Only `create_settlement` / `mark_settlement_paid` / `void_settlement` (service_role, row-locked) move money state;
  a settled settlement is never voided. Bank numbers are decrypted only in `lib/admin/payouts.ts` `revealBankDetails` (audit-logged). CSV exports must go through `csvCell` (formula-injection safe).
- **Vendor-editable columns that name external resources** (Shiprocket pickup location) are admin/service-only via the guard trigger — a free-text external identifier is a cross-tenant pointer.
- A **counter a tenant can edit** (`coupons.used_count`) must be locked by trigger, not just hidden in the UI; `"use server"` files may only export async functions (constants crash at runtime).

### Stage 11 (returns & refunds) — money that comes back

- **Refunds are reserve → gateway → apply.** `begin_refund()` row-locks the order and RESERVES the amount (a pending refund counts against the line), the gateway refund is tagged with our refund id (`notes.gp_refund_id`), then `complete_refund()` applies every consequence atomically. Razorpay has no idempotency key for refunds: before any retry, look the tag up at the gateway (`findRazorpayRefundByTag`) so a lost reply can't refund twice. A line is never refunded above what the customer paid for it.
- **Vendor/commission effect is cumulative** (`refunded_payout`/`refunded_commission` on `order_item_financials`, originals untouched). A line already in a settlement gets a `vendor_adjustments` debit netted off the next payout (carried forward if larger); statements use the per-line snapshot taken when the settlement was created. Voiding a settlement must drop the debits on its lines (else they're deducted twice) and is refused if one was already netted elsewhere.
- Anything that stores customer free text (return notes) must be scrubbed in `anonymize_user`; erasure is refused while a return/refund is open.

### Stage 11 (banners) — admin-managed public content

- **Public read of scheduled content must be time-gated in RLS, not just in the query.** A policy of `is_active` alone leaks a not-yet-live campaign through the API; `banners` now exposes only rows live right now (active AND inside start/end), admins see everything. Do the same for any future scheduled content (promotions, announcements).
- **A string that becomes an `href` is validated at every layer**: form schema + server action + a DB CHECK (`safeCtaUrl`: site path or https only). Images uploaded by admins follow the product-image model: the form returns only a server-generated storage path, the action rebuilds URLs from it; buckets have no client write policies, even for admins.

- **User-supplied image URLs stored in a public table are constrained in the database, not just in the UI**: `vendors.logo_url`/`banner_url` are CHECK-pinned to that vendor's own folder in `vendor-branding`, so no write path (form, API, a direct RLS update) can point them elsewhere. Do the same for any future column that holds an uploaded-file URL.

### Stage 11 (bulk import) — user-supplied files

- **Parse and validate uploaded files with the same schema as the manual form, twice**: a preview for the user and again inside the commit — the browser's preview is never trusted. Preserve the file's own row numbers in errors (blank lines count), or messages point at the wrong row.
- **Bulk writes are one SQL transaction with a ledger row keyed on a hash of the input**, so a retry/double-submit can't duplicate data and a failure leaves nothing behind (the ledger row rolls back too, so the corrected file can be re-sent). Source files must not contain raw control characters — build such regexes from string escapes (`new RegExp("[\\u0000-…]")`).

### Stage 11 (data export) — right of access

- **Build a personal-data export from an explicit column list inside one SQL function** (`export_user_data`), never `select *` or a generic dump, and test it with a second user's data present. Anything that adds a new table holding personal data must be added to that function (and to `anonymize_user`).
- **Sensitive-but-harmless-looking endpoints are POST-only, scoped to the session user, throttled from the audit log, audit-logged without personal data, and announced to the account holder.**

### Profile management, review management, vendor communication — three spec features, DB layer was already ready

- **A schema's own OUTPUT must survive being re-parsed as its own INPUT** — `updateProfileAction`'s phone
  field is genuinely validated twice (once client-side via `react-hook-form`'s `zodResolver`, again
  server-side, independently), and a `z.union([z.literal(""), z.string().regex(...)])` reported a bare
  "Invalid input" specifically on that second pass in Zod v4, caught only by live-testing (unit tests
  written *before* the bug wasn't enough — the schema was tested standalone, not round-tripped through
  itself the way real use actually exercises it). Fixed by preprocessing straight to `null |
  normalised-string` and validating with `.nullable()` instead of a union with the empty-string literal.
  Any schema whose value gets parsed more than once in the same request (client + server, or upsert +
  re-read) should have a test that re-parses its own successful output, not just fresh input.
- **`users.avatar_url`** now follows the exact same rule Stage 11 established for `vendors.logo_url`: a
  CHECK constraint pinning it to `<userId>/avatar-<uuid>.webp` in a new public `user-avatars` bucket with no
  client write policies (`supabase/migrations/20260928190000_user_avatar.sql`) — it existed as a plain,
  completely unused `text` column before this.
- **`reviews_product_user_unique` (product_id, user_id)** didn't exist before this — nothing stopped a
  customer submitting unlimited reviews for the same product, each counted separately by
  `recompute_product_rating()`'s trigger. Added in `supabase/migrations/20260928191000_reviews_unique_
  per_product.sql`, which also cleans up one real pre-existing duplicate pair found in the demo seed data
  (checked live before writing the migration) — a migration adding a new uniqueness constraint should
  always check the real database for existing violations first, not assume there are none.
- Full write-up: `docs/progress/2026-09-29-profile-reviews-vendor-messaging.md`.

## Auth

`lib/auth/session.ts` (`getServerUser`/`requireRole`) and `proxy.ts` are two independent layers —
`proxy.ts` is an *optimistic* UI-level redirect (fast, better UX, matches Next's own docs on this
pattern), `requireRole()` is the actual enforcement, re-reading role from the DB every time. This was
deliberately verified as two independent layers in Stage 2 (temporarily disabled `proxy.ts`'s admin check
and confirmed `requireRole()` alone still blocked a customer session) — don't assume one makes the other
redundant when adding new protected routes; every protected Server Component/Server Action/Route Handler
still needs its own `requireRole()` call.

Two things worth knowing before touching auth UI again:
- **A `<button type="submit">` inside a Radix `DropdownMenu.Item` does not reliably submit its wrapping
  `<form>`** — Radix intercepts the click for its own selection/close handling first. Confirmed by
  hand-testing (`AccountMenu`'s sign-out silently did nothing until fixed). Use `onSelect` on the
  `DropdownMenu.Item` to call a Server Action directly instead (Server Actions are plain async functions —
  calling them directly from a client event handler works exactly like a form action does).
- **Supabase's default/shared SMTP has a strict built-in rate limit on auth emails** (confirmed by
  hitting `429 over_email_send_rate_limit` during ordinary manual testing in Stage 2). This is expected to
  bite again anywhere real signups/password-resets get tested repeatedly, and **must be fixed with custom
  SMTP before go-live** or real users will hit it too — Resend (already planned for Stage 9) is the
  natural fit. For local testing without waiting on real email, create confirmed accounts directly via
  the Supabase admin client (`auth.admin.createUser({ email_confirm: true, ... })`) rather than going
  through the UI signup flow.
- **An env var meant for production can silently redirect local dev to production.** `.env.local` sets
  `NEXT_PUBLIC_APP_URL` to the deployed Vercel URL (so the same file also works for a `vercel env pull`),
  and `lib/auth/actions.ts`'s `getAppUrl()` used to check that unconditionally before the request's own
  origin — so on `localhost`, Google OAuth/signup-confirmation/password-reset all redirected back to
  *production*, establishing the session on production's cookies while the `localhost` tab's own cookie
  never changed (looking exactly like "another account's data" showing up locally, when nothing ever
  crossed accounts in the database). Fixed: `getAppUrl()` now checks the request's `Origin` header first,
  falling back to `NEXT_PUBLIC_APP_URL` only when that header is absent — this also protects Vercel
  **preview** deployments, which would otherwise have been bounced to the fixed production URL too.
- **`pathname.startsWith(prefix)` route-matching in `proxy.ts` is a real footgun once a second route
  starts with the same prefix.** `isVendorPath()` used `pathname.startsWith("/vendor")` to gate the
  vendor-portal routes — which also matches `/vendors/aurelia-gifts`, Stage 3's public shop storefront
  route, since `"/vendors/..."` starts with the substring `"/vendor"` too. A signed-in customer got
  silently bounced from a vendor storefront page back to `/`, because proxy thought they were trying to
  reach the portal. Confirmed only by actually clicking through as a customer — build/lint/types all
  passed. Fixed to `pathname === "/vendor" || pathname.startsWith("/vendor/")`. **Check this exact
  pattern before adding any new top-level route segment**: does its name prefix-match an existing
  protected segment's `startsWith()` check? `/admin` vs. a hypothetical `/administration` page would have
  the same bug in the other direction.

Test accounts exist in the dev database for exactly this reason — `test-customer@giftping.test`,
`test-vendor@giftping.test`, `test-admin@giftping.test`, all password `TestPass123!`. Not real user data;
reuse them for manual testing in later stages rather than creating new ones each time, and delete them
before go-live.

## Image handoff workflow

The client generates new reference/hero images via ChatGPT over time and hands them to the developer.
`lib/content/imagery.ts` (created in the visual-polish stage) is the single place components reference
image assets from, so swapping in a new image never requires touching component code — just update the
map and drop the file in `public/images/` (static site imagery — logo, hero art, illustrations) or upload
it to Supabase Storage (user/vendor-generated content — product photos, avatars). See the "Cost
constraint" section above and `/lib/storage` for the image pipeline itself.

## Progress tracking convention

- `PROGRESS.md` (repo root) — overwritten every session, not appended. Read this first, always.
- `/docs/progress/YYYY-MM-DD-stage-N-<slug>.md` — one entry per completed stage or major milestone,
  append-only, holds the "why" behind decisions.
- This file (`CLAUDE.md`) — static reference, update only when a structural/stack decision actually
  changes, not for day-to-day status.
