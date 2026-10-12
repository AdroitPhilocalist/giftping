# Upgrading the "add to cart" flight animation — 12 Oct

Client ran the manual test guide's 1.10 ("Add to cart as a guest") and reported the animation worked
correctly but looked "naive and amateur" — asked for it to feel premium, designed by a real motion/UX
specialist, without adding real weight to the page (no animation library, nothing heavier at runtime).

## What was actually weak about it

The original (`components/motion/CartFlyLayer.tsx` + `globals.css`'s `gp-cart-fly`/`gp-cart-bounce`) was
functionally fine but thin: one element, a 3-stop arc (start/midpoint/end), uniform scale, a single gentle
rotation, and a generic scale-pulse where it landed. No sense of speed, no sense of weight, and the one
visible payoff (the icon bouncing) did double duty for both "something arrived" and "the count went up" —
nothing distinguished those two separate facts.

## What changed

Still zero new dependencies (confirmed again: no animation library installed in this project) and still a
handful of short-lived plain DOM nodes animated with CSS `transform`/`opacity` — nothing added that costs
anything once the sequence finishes (under ~1.2s end to end, same order of magnitude as before):

- **A real arc, not three points.** `gp-cart-fly` now has five keyframe stops: a quick spring-launch squash
  (non-uniform `scale(1.22, 0.8)`) right after liftoff, a high midpoint, a fast descent, and a settle into
  the icon — plus continuous rotation to just past 360° so the gift genuinely *tumbles* through the air
  instead of gently wobbling.
- **A motion trail.** Two faint, blurred echoes of the same icon (`gp-cart-fly-ghost`) are created alongside
  the lead and started 45ms/95ms later, so they visibly lag behind it — a classic cheap way to sell speed
  (same technique as a comet trail), costing two extra small `<div>`s that exist for well under a second.
- **A landing moment that's actually three separate payoffs, not one.** The instant the lead arrives:
  the icon still bounces (slightly re-tuned, a touch more elastic), the count **badge gets its own sharper,
  independent pop** (`gp-badge-pop` — the same instinct as a Slack/Gmail unread-count bump, so "the count
  changed" reads as its own event rather than being absorbed into "the icon moved"), and **six small copper
  sparks burst outward** from the point of impact and fade within half a second.
- Both new effects automatically respect the site's existing blanket `prefers-reduced-motion` rule (every
  `animation-duration` already gets clamped to ~0 there) — no new guard code needed.

## Verification

Typecheck/lint/540 tests/build all clean. Live-verified as a signed-out guest end to end, and — because the
animation is genuinely fast (~0.7s) and this dev server's server-action round trip made it hard to catch a
screenshot mid-flight on the first few tries — verified properly instead by driving the sequence
programmatically and sampling its actual computed `transform`/class state over time (the equivalent of
stepping through DevTools' Animations panel): confirmed the lead element's transform matrix genuinely
rotates and changes scale/position throughout the arc (not just at the two endpoints), confirmed both ghost
trail elements exist simultaneously with the lead, and confirmed the landing moment fires all three payoffs
in the same frame — lead/ghosts removed, `gp-cart-bounce` and `gp-badge-pop` both active, and exactly six
spark elements created — followed by a fully clean teardown with no leftover DOM nodes. Confirmed end to end
against the real add-to-cart flow (cart count incremented correctly, the item appeared correctly on `/cart`)
and confirmed no console errors across many repeated test adds.
