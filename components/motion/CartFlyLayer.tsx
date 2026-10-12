"use client";

import { useEffect, useRef } from "react";
import type { AddedItem } from "@/lib/shop/basket";

export const ADD_TO_CART_FLY_EVENT = "gp:add-to-cart";

/** Sent with the event: where the gift starts, and (when known) what was added — so the header's mini-basket can show it before the cart is re-read. */
export interface AddToCartFlyDetail {
  x: number;
  y: number;
  added?: AddedItem;
}

// A small trusted, hand-authored SVG (no interpolated data) — a gift box with a ribbon, in theme tokens.
// Built as a string because the flying element is created outside React's tree (see the comment below).
const FLY_ICON_SVG = `
<svg viewBox="0 0 40 40" width="40" height="40">
  <rect x="6" y="17" width="28" height="19" rx="2" fill="var(--gp-primary)" />
  <rect x="3" y="10" width="34" height="9" rx="2.5" fill="var(--gp-copper)" />
  <rect x="17" y="10" width="6" height="26" fill="var(--gp-peach)" />
  <path d="M20 10c-3-7-11-9-13-4s5 6 13 4z" fill="var(--gp-copper-dark)" />
  <path d="M20 10c3-7 11-9 13-4s-5 6-13 4z" fill="var(--gp-copper-dark)" />
</svg>`.trim();

// The landing burst: a handful of small copper sparks thrown out from the point of impact, each just a styled
// div positioned/removed by JS — no SVG needed for something this small and short-lived.
const SPARK_COUNT = 6;
const SPARK_RADIUS = 15;

/**
 * "Add to cart": a gift tumbles from wherever the Add to Cart button was clicked to the cart icon, trailed by
 * two faint echoes of itself, then three small payoffs fire together where it lands — the icon bounces, the
 * count badge gives its own sharper pop, and a few copper sparks burst outward. Mounted once near the root
 * (app/layout.tsx) so it works from any product page without prop-drilling; components/shop/ProductBuyBox.tsx
 * triggers it with a plain `window.dispatchEvent` rather than React context, since the two live on opposite
 * sides of the tree.
 *
 * Every element here is a real DOM node created and removed imperatively (not React state) — this is a
 * one-shot visual effect with no data of its own, so animating it outside React avoids a render for something
 * React never needs to know happened. The whole sequence is still only a handful of small, short-lived nodes
 * (the leader, two ghosts, six sparks — all gone within about a second) animated with plain CSS transform/
 * opacity, not a physics or animation library.
 */
export function CartFlyLayer() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function findCartIcon(): HTMLElement | null {
      const mobile = document.getElementById("gp-cart-icon-mobile");
      if (mobile) {
        const r = mobile.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return mobile;
      }
      return document.getElementById("gp-cart-icon");
    }

    function onFly(e: Event) {
      const layer = layerRef.current;
      const cartIcon = findCartIcon();
      if (!layer || !cartIcon) return;
      const { x, y } = (e as CustomEvent<AddToCartFlyDetail>).detail;
      const target = cartIcon.getBoundingClientRect();
      const dx = `${target.left + target.width / 2 - x}px`;
      const dy = `${target.top + target.height / 2 - y}px`;

      const makeFlyer = (className: string, delayMs: number) => {
        const el = document.createElement("div");
        el.className = className;
        el.style.transform = `translate(${x - 20}px, ${y - 20}px)`;
        el.style.setProperty("--fly-dx", dx);
        el.style.setProperty("--fly-dy", dy);
        if (delayMs) el.style.animationDelay = `${delayMs}ms`;
        el.innerHTML = FLY_ICON_SVG;
        layer.appendChild(el);
        return el;
      };

      // Two trailing echoes, started a beat after the leader so they visibly lag behind it — cheap sense of
      // real motion without any extra JS per frame.
      makeFlyer("gp-cart-fly-ghost pointer-events-none fixed left-0 top-0 z-[69]", 45);
      makeFlyer("gp-cart-fly-ghost pointer-events-none fixed left-0 top-0 z-[69]", 95);
      const lead = makeFlyer("gp-cart-fly pointer-events-none fixed left-0 top-0 z-[70]", 0);

      const spark = () => {
        const center = cartIcon.getBoundingClientRect();
        const burst = document.createElement("div");
        burst.className = "pointer-events-none fixed z-[71]";
        burst.style.left = `${center.left + center.width / 2}px`;
        burst.style.top = `${center.top + center.height / 2}px`;
        for (let i = 0; i < SPARK_COUNT; i++) {
          const angle = (i / SPARK_COUNT) * Math.PI * 2 + (i % 2 ? 0.25 : -0.15); // a slight stagger so it doesn't look like a perfect snowflake
          const dist = SPARK_RADIUS + (i % 3) * 4;
          const dot = document.createElement("span");
          dot.className = "gp-cart-spark absolute h-[5px] w-[5px] rounded-full bg-[var(--gp-copper)]";
          dot.style.setProperty("--spark-dx", `${Math.cos(angle) * dist}px`);
          dot.style.setProperty("--spark-dy", `${Math.sin(angle) * dist}px`);
          burst.appendChild(dot);
        }
        layer.appendChild(burst);
        setTimeout(() => burst.remove(), 550);
      };

      const bounce = () => {
        cartIcon.classList.remove("gp-cart-bounce");
        // reflow so re-adding the class restarts the animation even if it's still mid-bounce from a fast double-add
        void cartIcon.offsetWidth;
        cartIcon.classList.add("gp-cart-bounce");
        cartIcon.addEventListener("animationend", () => cartIcon.classList.remove("gp-cart-bounce"), { once: true });

        // The count badge may not exist yet on the very first item (it only renders once cartCount > 0, and
        // that prop hasn't necessarily re-rendered by the time the flight lands) — skip gracefully, never throw.
        const badge = cartIcon.querySelector("span");
        if (badge) {
          badge.classList.remove("gp-badge-pop");
          void badge.offsetWidth;
          badge.classList.add("gp-badge-pop");
          badge.addEventListener("animationend", () => badge.classList.remove("gp-badge-pop"), { once: true });
        }
        spark();
      };

      const cleanup = () => {
        layer.querySelectorAll(".gp-cart-fly, .gp-cart-fly-ghost").forEach((n) => n.remove());
        bounce();
      };
      lead.addEventListener("animationend", cleanup, { once: true });
      // belt-and-braces: if the animation event never fires (e.g. reduced motion clamps duration to ~0 and the
      // browser coalesces it away), don't leave stray nodes behind.
      setTimeout(() => { if (lead.isConnected) cleanup(); }, 900);
    }

    window.addEventListener(ADD_TO_CART_FLY_EVENT, onFly);
    return () => window.removeEventListener(ADD_TO_CART_FLY_EVENT, onFly);
  }, []);

  return <div ref={layerRef} aria-hidden="true" />;
}
