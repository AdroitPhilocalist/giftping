"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BasketBody, BasketHandle, BasketWeaveDefs } from "@/components/art/BasketArt";
import { GiftBoxShape } from "@/components/art/GiftBoxArt";
import { layoutBasket, optimizedImageUrl, type BasketItem } from "@/lib/shop/basket";
import { cn } from "@/lib/utils/cn";

// Drawing coordinates (the basket's viewBox is 200×172, rim at y≈82). Each item is a small photo "card" tucked into the basket: only its top part shows
// above the front rim, so it reads as standing in the basket rather than floating over it.
const CARD_W = 46;
const CARD_TOP = 24;
const CARD_H = 64;
const PIVOT_Y = 72;

/**
 * The shopper's REAL cart, drawn as a woven basket: each product's own photo tucked in over the rim (newest on the right), a quantity badge when
 * it's more than one, "+N" when more items than fit, and a stand-in gift box for a product with no photo yet. When something is added the new photo
 * drops in and the whole basket gives a little jiggle.
 *
 * `animateOnMount` drops every photo in (staggered) the first time it appears; `highlightId` drops in just that one (the item that was just added).
 * Later changes always animate whatever is newly added. Under `prefers-reduced-motion` the global rule collapses every animation to nothing.
 */
export function LiveBasket({ items, className, animateOnMount = false, highlightId, label }: { items: BasketItem[]; className?: string; animateOnMount?: boolean; highlightId?: string; label?: string }) {
  const uid = useId().replace(/:/g, "");
  const layout = layoutBasket(items);
  const key = items.map((i) => `${i.id}:${i.quantity}`).join("|");

  // "Adjust state when props change" — compared during render (React's documented pattern), so no effect has to set state.
  const [seen, setSeen] = useState(() => ({
    key,
    ids: new Set(items.map((i) => i.id)),
    units: layout.units,
    fresh: animateOnMount ? new Set(items.map((i) => i.id)) : highlightId ? new Set([highlightId]) : new Set<string>(),
    bump: 0,
  }));
  if (seen.key !== key) {
    const added = items.filter((i) => !seen.ids.has(i.id)).map((i) => i.id);
    setSeen({ key, ids: new Set(items.map((i) => i.id)), units: layout.units, fresh: new Set(added), bump: layout.units > seen.units ? seen.bump + 1 : seen.bump });
  }

  // The jiggle restarts by removing and re-adding the class (a reflow in between) — plain DOM, no state, same trick as the cart icon bounce.
  const jiggleRef = useRef<SVGGElement>(null);
  useEffect(() => {
    if (seen.bump === 0) return;
    const el = jiggleRef.current;
    if (!el) return;
    el.classList.remove("gp-basket-jiggle");
    void el.getBoundingClientRect();
    el.classList.add("gp-basket-jiggle");
  }, [seen.bump]);

  const freshOrder = layout.tiles.filter((t) => seen.fresh.has(t.id));

  return (
    <svg viewBox="0 0 200 172" className={cn("h-auto w-full overflow-visible", className)} role="img" aria-label={label ?? `Your basket: ${layout.units} ${layout.units === 1 ? "item" : "items"}`} focusable="false">
      <BasketWeaveDefs id={`${uid}-weave`} />
      <g ref={jiggleRef} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        <BasketHandle />

        {layout.tiles.map((t) => {
          const dropIndex = freshOrder.findIndex((f) => f.id === t.id);
          const clipId = `${uid}-clip-${t.id}`;
          return (
            <g key={t.id} transform={`rotate(${t.tilt} ${t.x} ${PIVOT_Y})`}>
              <g className={dropIndex >= 0 ? "gp-basket-drop" : undefined} style={dropIndex >= 0 ? { animationDelay: `${dropIndex * 90}ms` } : undefined}>
                <clipPath id={clipId}>
                  <rect x={t.x - CARD_W / 2} y={CARD_TOP} width={CARD_W} height={CARD_H} rx="4" />
                </clipPath>
                {/* the "photo card": a surface-coloured border with a soft edge, then the picture */}
                <rect x={t.x - CARD_W / 2 - 3} y={CARD_TOP - 3} width={CARD_W + 6} height={CARD_H + 6} rx="7" fill="var(--gp-surface)" stroke="var(--gp-copper-dark)" strokeOpacity="0.3" strokeWidth="1" />
                {t.imageUrl ? (
                  <image href={optimizedImageUrl(t.imageUrl)} x={t.x - CARD_W / 2} y={CARD_TOP} width={CARD_W} height={CARD_H} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
                ) : (
                  <g transform={`translate(${t.x - CARD_W / 2 - 3} ${CARD_TOP - 2}) scale(0.44)`}><GiftBoxShape tone={t.tone} /></g>
                )}
                {t.quantity > 1 ? (
                  <g>
                    <circle cx={t.x + CARD_W / 2 - 2} cy={CARD_TOP + 4} r="8" fill="var(--gp-primary)" stroke="var(--gp-surface)" strokeWidth="1.5" />
                    <text x={t.x + CARD_W / 2 - 2} y={CARD_TOP + 4} textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" fill="var(--gp-on-primary)">{t.quantity > 9 ? "9+" : t.quantity}</text>
                  </g>
                ) : null}
              </g>
            </g>
          );
        })}

        <BasketBody weaveId={`${uid}-weave`} />

        {layout.hidden > 0 ? (
          <g>
            <rect x="140" y="92" width="34" height="18" rx="9" fill="var(--gp-primary)" stroke="var(--gp-surface)" strokeWidth="1.5" />
            <text x="157" y="101.5" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fill="var(--gp-on-primary)">+{layout.hidden}</text>
          </g>
        ) : null}
      </g>
    </svg>
  );
}
