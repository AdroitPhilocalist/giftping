# GiftPing — Delight & Feature Ideas Menu

**How to use this:** every idea has an ID (A1, B3, E2…). Tell me *"build A1 and A2"* or *"build the whole Sprint 1 bundle"* and I will. Anything you don't pick stays here for later.
Written 2 Oct 2026. Effort figures are **my rough estimates of build + live verification** in focused working days — treat them as ±50%, not promises.

Legend — **Effort:** S ≈ ≤1 day · M ≈ 2–4 days · L ≈ 1–2 weeks · XL ≈ 2+ weeks. **Wow:** how much a client demo notices it (★ to ★★★★★).
**Needs:** what I can't do alone (artwork, a decision, an account). **Cost:** ongoing ₹ beyond what we already pay (most are ₹0).

---

## 1. Where we are today (so we don't rebuild what exists)

The brief was "interactive, animated, real-life feel." Honest state:

| Already built | Where | Note |
|---|---|---|
| Entrance animations, scroll reveals | `.rise`, `Reveal` | CSS only |
| Robin mascot as a custom cursor + 11 art poses | `RobinCursor`, `Robin` | desktop only; poses: perched, waving, flying-gift, on-gift, peeking, celebrating, heart, reading, search, sleeping, bell… |
| Add-to-cart: a gift box arcs to the cart icon, icon bounces | `CartFlyLayer` | lands on the header icon, **not** in a basket |
| Basket-themed cart page: woven basket drawn in code, empty-basket state with robin peeking, basket-weave background | `BasketArt`, `/cart` | the three gifts inside are **fixed generic boxes**, not the shopper's products |
| Payment-success celebration | `OrderCelebration` | |
| Animated order progress (5-step stepper) + order hero art | `OrderStepper`, `OrderHero` | |
| Drifting confetti / hearts / petals / sparks on occasion headers | `Ambience`, `WorldHero` | per-occasion; **not yet** driven by the festival themes |
| Live handwritten gift-card preview as you type the note | `GiftCardPreview` (product page) | |
| Gift-wrap colour picker with artwork | checkout, `WRAP_STYLES` | five wraps; cosmetic |
| Festival/seasonal theme system (colours, fonts, artwork, scheduled) | `/admin/themes` | the foundation for "festival mode" |
| **The Diary as a page-turning flip book on a desk** | `/diary` | the strongest interactive piece we have |
| Search-as-you-type, wishlist heart, photo cards, page-aware glass navbar with gilded edge | various | |

**Not installed at all:** any animation library (`motion`/Framer, GSAP, Lottie) or 3D (Three.js). Early on we wrote "illustrated + Motion, not real 3D" — and then never installed Motion, so we have done *less* than that decision. The **cinematic mall entrance** is the piece that was shortchanged.
**Half-built backend with no front end:** rewards (`loyalty_ledger`, 0 rows, no UI), referral codes (column exists, never generated), `products.view_count` (never incremented).

---

## 2. Ground rules for anything we add (so "wow" doesn't become "broken")

1. **Phones first.** Most Indian shoppers are on mid-range Android. Every effect must stay smooth there; heavy things load lazily and have a static fallback. *I cannot test real-phone performance from here — each animated feature needs one human check on a real mid-range phone before we call it done.*
2. **Respect "reduce motion."** Already our convention; stays.
3. **One effect = one removable mount point** (the project convention: `RobinCursor`, `CartFlyLayer`). If the client dislikes something we delete one component.
4. **Theme-token driven** (no raw colours) so festival themes recolour everything automatically.
5. **No layout shift, no blocked buttons, no animation that delays checkout.** Delight lives *around* the money path, never in front of it.
6. **SEO/accessibility safe:** content stays real HTML text; animation never hides the only copy of something.
7. **Budget:** the ₹40–50k/yr API ceiling still rules. Anything with a per-use fee (WhatsApp, an LLM, video storage) is flagged in **Cost** and needs your explicit yes.

### Toolbox (what each tool is good for)

| Tool | Good for | Weight / catch |
|---|---|---|
| Plain CSS + SVG (what we use now) | Most micro-interactions, the basket, confetti, wraps | ₹0, ~0 KB, we already have the pipeline |
| **CSS scroll-driven animations + View Transitions API** | Scroll storytelling, "entering a shop" page transitions | no library; modern browsers (graceful fallback needed for older ones) |
| **`motion`** (successor to Framer Motion) | Orchestrated sequences, drag, layout animations (basket items settling) | roughly +15–30 KB gzip, loaded only where used |
| **Lottie** | Designer-made animations (needs an animator's files) | small files, but needs an artist |
| **Canvas confetti / particles** | Celebrations, festival effects | tiny |
| **Three.js / React Three Fiber** | Real 3D objects | **heavy** (~150 KB+ gzip *before* models), needs 3D model files (`.glb`), GPU-hungry on budget phones — use for **one** hero object at most, lazy-loaded, desktop/high-end only |

---

## 3. The menu

### A. Shopping & basket delight  *(closest to the client's own idea — the best first slice)*

| ID | Idea | What the customer sees | Effort | Wow | Status / Needs |
|---|---|---|---|---|---|
| **A1** ✅ | **Basket 2.0 — the basket really holds your gifts** | Add a product and its *actual photo* drops into a basket that fills up as you add more (nicely overlapping, count badge, gentle jiggle on each add). The cart page basket mirrors the real cart. | M | ★★★★★ | **BUILT 2 Oct (Sprint 1)** — see `docs/progress/2026-10-02-sprint-1-the-basket.md`. All 57 demo products have a (seed) photo; real vendor products show a gift-box stand-in until they upload one. |
| **A2** ✅ | **Mini-basket in the header** | Hover/tap the basket icon: a small basket drawer opens showing real items, total, a free-delivery ribbon, "Checkout". The add-to-cart gift now flies **into** the basket. | M | ★★★★ | **BUILT 2 Oct (Sprint 1).** Desktop mouse only; touch keeps the plain link + toast. |
| **A3** | **Live personalisation preview on the product** | Type "Aarav" and see it engraved on the actual name plate (or printed on a mug) in real time, in the chosen font. | M–L | ★★★★★ | Not built. **Needs:** per-product "where does the text go" setup (a vendor/admin field) and 2–3 nice fonts. Great for personalised products only. |
| **A4** | **Gift-wrap preview** | Picking a wrap colour re-dresses a little gift box on screen (ribbon colour, bow) along with the card text. | S–M | ★★★ | Wrap artwork exists; just not shown *on the gift*. |
| **A5** ✅ | **"Unwrap" order confirmation** | After paying, a gift box on screen opens, the robin pops out, details slide in. | S–M | ★★★★ | **BUILT 2 Oct (Sprint 1).** |
| **A6** ✅ | **Free-delivery ribbon fills as you shop** | A ribbon around the basket fills toward the free-delivery amount. | S | ★★★ | **BUILT 2 Oct (Sprint 1)** — ribbon with a bow that ties at the unlock; also in the mini-basket. |
| **A7** | **"Complete the gift" add-ons** | At the basket: tick-box add a greeting card, gift wrap, chocolates — each animates into the basket. | M | ★★★ | Also lifts average order value. **Needs:** a decision on which add-ons exist and who fulfils them. |
| **A8** | **Wishlist heart burst + "move to basket"** | The heart pops with a tiny burst; moving a wishlist item flies it into the basket. | S | ★★ | |

### B. Discovery & storytelling  *(the "it's a mall, not a catalogue" feeling)*

| ID | Idea | What the customer sees | Effort | Wow | Status / Needs |
|---|---|---|---|---|---|
| **B1** | **Gift-finder quiz** | "Who's it for? What do they love? Budget?" — animated cards, robin reacts, then a curated shelf. Also feeds the marketing segments and the diary. | M | ★★★★ | Not built. Uses existing tags/relationships. |
| **B2** | **Cinematic mall entrance** | Scrolling from the homepage "walks you in" through the atrium: layers move at different speeds, lights warm up, shop doors come into view. | L | ★★★★★ | Spec'd originally, never built. **Needs:** your direction on the sequence **and** artwork split into layers (foreground/mid/background) — one flat image can only fake it. |
| **B3** | **Interactive mall map** | The map is live: hover/tap a shopfront and it glows, the robin walks the path to it, a card shows the boutique. | M | ★★★★ | `mall-map` image exists. **Needs:** hotspot positions (I can place them). |
| **B4** | **"Entering the shop" transitions** | Going from the mall to a boutique feels like opening a door (smooth, shared-element transition) instead of a page flash. | M | ★★★★ | View Transitions; needs a fallback for older browsers. |
| **B5** | **Parallax atrium hero** | The homepage hero has depth: layers drift as you scroll or tilt the phone. | M | ★★★ | Same layered-art dependency as B2. |
| **B6** | **Robin as a guide** | The robin reacts to context: peeks into an empty basket, naps on a quiet diary, flies a gift across when you add one, waves hello at sign-in. | M | ★★★★ | 11 poses exist; may want 3–4 more (you'd generate). |
| **B7** | **Festival mode** | When Diwali/Rakhi/etc. is scheduled, the whole site changes: palette (exists), floating diyas/petals, a countdown ("order by 20 Oct for Diwali delivery"), festive banner. | S–M | ★★★★ | Theme system + `Ambience` exist. **Needs:** a decision on the delivery-cutoff rule per festival. |
| **B8** | **Shop-window cards** | Boutique/product cards tilt slightly toward the cursor and light up like lit windows. | S | ★★★ | Desktop only. |
| **B9** | **Search flourishes** | Robin "searching" animation while results load; recent searches; trending chips. | S | ★★ | Autocomplete already built. |

### C. The Gifting Diary  *(the signature feature — small touches go a long way)*

| ID | Idea | What the customer sees | Effort | Wow | Status / Needs |
|---|---|---|---|---|---|
| **C1** | **Wax-seal & stamp moments** | Marking a gift "given" stamps a wax seal on the page; adding a person lays a polaroid down with a tape-peel. | S | ★★★★ | Art components exist (WaxSeal, Polaroid). |
| **C2** | **Countdown ribbons** | "12 days to Mom's birthday" as a ribbon that tightens as the date nears; today's date confetti. | S | ★★★ | |
| **C3** | **Year-in-review "story"** | A swipeable, animated recap: gifts given, people remembered, your streak, a shareable card — **numbers only, never names/diary text**, so privacy is intact. | L | ★★★★★ | Review page exists; this is the story format. High shareability = free marketing. |
| **C4** | **Page-turn sound (off by default)** | A soft paper sound when turning pages. | S | ★★ | Needs a licensed sound; **opt-in only**. Optional. |

### D. Real 3D  *(impressive, but costly — read the cautions)*

| ID | Idea | What the customer sees | Effort | Wow | Status / Needs |
|---|---|---|---|---|---|
| **D1** | **One hero 3D gift box** | A 3D gift box on the homepage that opens as you scroll, revealing the first shelf. Lazy-loaded; phones/low-power get a flat image. | L | ★★★★★ | **Needs:** a 3D model (`.glb`) — someone has to make it (a freelancer, or we generate one from stock). Adds ~150 KB+ on desktop. |
| **D2** | **360° product spin** | Drag to rotate a product. Cheapest route is a *sequence of photos* (no 3D at all), done by the boutique; true 3D needs models. | M (photo spin) / L+ (3D) | ★★★★ | **Needs vendors to shoot ~24 photos per product.** Realistic for a few hero products only. |
| **D3** | **AR "see it in your room"** | Phone camera places the product on a table. | XL | ★★★★ | Needs a 3D model of *every* product; not realistic marketplace-wide. |
| **D4** | **3D mall walk-through** | Free-roam 3D mall. | XL | ★★★★★ | **I recommend against.** Huge asset cost, poor on budget phones, hurts SEO and checkout, and the illustrated mall already carries the charm. |

### E. Beyond animation — features that grow the business

| ID | Idea | What it does | Effort | Status / Needs / Cost |
|---|---|---|---|---|
| **E1** | **GP Rewards** | Points on purchases/reviews, redeem at checkout. | M | Table `loyalty_ledger` exists (0 rows), **no UI or rules**. **Needs:** earn/burn rules from the client. |
| **E2** | **Referral programme** | "Give ₹200, get ₹200" with a share link. | M | `users.referral_code` column exists, nothing generates/uses it. **Needs:** reward rules; fraud limits. |
| **E3** | **Gift cards / e-vouchers** | Buy credit, send by email with a card design. | L | **Needs** a decision on liability/expiry rules (legal/finance); Razorpay flows. |
| **E4** | **Scheduled & surprise delivery** | "Deliver on 14 Feb" tied to a diary date. | M–L | Constrained by courier capability (Shiprocket) — needs checking what dates it truly honours. |
| **E5** | **Group gifting ("chip in")** | Friends split the cost of one gift. | L | Payment-split complexity; likely needs Razorpay features/accounts. |
| **E6** | **Occasion registry** | A shareable wishlist for weddings/birthdays; guests buy items off it. | M | |
| **E7** | **WhatsApp updates** | Order and diary reminders on WhatsApp (where Indians actually look). | M | **Cost:** the WhatsApp Business API is paid per message — needs a budget yes. |
| **E8** | **Voice/video message by QR** | A QR on the card plays a recorded message. | L | **Cost:** file storage + bandwidth; moderation. |
| **E9** | **Corporate bulk gifting** | Upload a recipient list, one order, many addresses. | L | Real B2B demand in India. |
| **E10** | **Gift subscriptions** | Monthly hamper. | L | Recurring payments (Razorpay subscriptions). |
| **E11** | **Hindi / regional languages** | Switchable site language. | M–L | Translations need review; SEO implications. |
| **E12** | **Structured data for Google** | Price/stars/stock shown in search results (rich results). | S | **No cost.** Quick SEO win; pairs with the new SEO tools. |
| **E13** | **Reviews with photos** | Customers attach pictures. | M | Image-moderation + storage. |
| **E14** | **Boutique analytics** | Views → carts → sales per product for vendors. | M | `products.view_count` exists unused; need to start counting. |
| **E15** | **Installable app (PWA)** | "Add to home screen", offline diary reading. | M | No app-store cost. |
| **E16** | **Real AI assistant** | "Ask GiftPing AI" backed by a live model. | M | Deliberately rule-based today. **Cost:** per-question fee — needs a budget decision. |

### F. Before go-live — not exciting, but they gate launch

Real-service testing (Razorpay payment, Shiprocket booking, a real Resend email) · legal review of Privacy/Terms/Refund + marketing-consent wording · Resend paid plan + verified domain + DMARC · bounce/complaint handling for marketing mail · a real-phone performance & accessibility pass · the 4 flagged artwork regenerations and product photos · Sentry/source maps · remove demo accounts. Details: `PROGRESS.md` and `docs/compliance/marketing-email-dpdp.md`.

---

## 4. Suggested bundles (pick a whole sprint, or mix)

| Bundle | Contains | Effort | Why this order |
|---|---|---|---|
| **Sprint 1 — "The Basket"** ✅ *done 2 Oct* | A1, A2, A6, A5 (A8 not done — still available) | ~1–1.5 weeks est. | The client's own idea and the most demo-able change. |
| **Sprint 2 — "Make it personal"** | A3, A4, B1 | ~1.5–2 weeks | Personalisation preview + gift-finder are unusual and sell *gifts*, not just products. |
| **Sprint 3 — "The mall as a place"** | B3, B4, B6, B7, B8 | ~2 weeks | Makes it feel like walking through a mall without needing new layered art. |
| **Sprint 4 — "Cinematic"** | B2 (+B5), optionally D1 | ~2–3 weeks | Only after you/the client choose the direction and layered artwork exists. |
| **Diary polish** (anytime, small) | C1, C2, then C3 | S, S, L | Strengthens the signature feature; C3 is highly shareable. |
| **Quick business wins** (anytime) | E12, then E1 + E2 | S, M, M | E12 is nearly free SEO. Rewards/referral need the client's rules first. |

**My own recommendation:** Sprint 1 → E12 → Sprint 2 → Diary polish → Sprint 3 → (decide on Sprint 4 once the client has seen the rest). Keep **D4 off the table**, and treat D1 as an optional garnish, not a foundation.

---

## 5. Decisions & inputs I'll need from you (so nothing blocks later)

1. **Product photos** — A1 now works with the demo catalogue's seed photos; real photography still matters for the client demo and launch. Which products matter most?
2. **Layered artwork** — foreground/mid/background versions of the atrium hero for B2/B5 (or a decision to skip them).
3. **Festival delivery cutoffs** — for B7's countdown (e.g. "order by 20 Oct for Diwali").
4. **Rewards and referral rules** — for E1/E2.
5. **Any per-message budget** (WhatsApp E7, AI E16) — a yes/no and a ceiling.
6. **Which products are personalisable in a visual way** — for A3 (name plates, mugs…).
7. **3D appetite** — if you want D1, who makes the model?

---

## 6. Things I'd advise against (and why)

- **A full 3D mall (D4)** — see above; the cost/benefit is poor and it threatens the parts that earn money.
- **Cursor effects everywhere** — we already have the robin cursor; more would feel gimmicky and tire people.
- **Heavy page-transition animation on every click** — only the "enter a shop" moment (B4); everywhere else it slows people down.
- **Autoplay sound** — only ever opt-in (C4).
- **Fake social proof** ("12 people are viewing this!") — erodes trust and is poor practice; real data only, if at all.

---

## 7. How to ask

> "Build **A1 + A2**." · "Do **Sprint 1**." · "Do **B1** now, and put **B2** on hold until I get the layered images." · "Show me options for **A3** before building."

I'll confirm scope in a line, build it, verify it live (and say plainly what I could *not* verify, such as real-phone speed), document it, and keep this list updated.
