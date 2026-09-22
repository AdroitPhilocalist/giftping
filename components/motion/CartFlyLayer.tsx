"use client";

import { useEffect, useRef } from "react";

export const ADD_TO_CART_FLY_EVENT = "gp:add-to-cart";

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

/**
 * "Add to cart": a small gift arcs from wherever the Add to Cart button was clicked to the cart icon, then
 * the cart icon gives a little bounce. Mounted once near the root (app/layout.tsx) so it works from any
 * product page without prop-drilling; components/shop/ProductBuyBox.tsx triggers it with a plain
 * `window.dispatchEvent` rather than React context, since the two live on opposite sides of the tree.
 *
 * The flying element is a real DOM node created and removed imperatively (not React state) — it's a
 * one-shot visual effect with no data of its own, so animating it outside React avoids a render on every
 * add-to-cart click for something React never needs to know happened.
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
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      const target = cartIcon.getBoundingClientRect();

      const el = document.createElement("div");
      el.className = "gp-cart-fly pointer-events-none fixed left-0 top-0 z-[70]";
      el.style.transform = `translate(${x - 20}px, ${y - 20}px)`;
      el.style.setProperty("--fly-dx", `${target.left + target.width / 2 - x}px`);
      el.style.setProperty("--fly-dy", `${target.top + target.height / 2 - y}px`);
      el.innerHTML = FLY_ICON_SVG;
      layer.appendChild(el);

      const bounce = () => {
        cartIcon.classList.remove("gp-cart-bounce");
        // reflow so re-adding the class restarts the animation even if it's still mid-bounce from a fast double-add
        void cartIcon.offsetWidth;
        cartIcon.classList.add("gp-cart-bounce");
        cartIcon.addEventListener("animationend", () => cartIcon.classList.remove("gp-cart-bounce"), { once: true });
      };
      el.addEventListener("animationend", () => { el.remove(); bounce(); }, { once: true });
      // belt-and-braces: if the animation event never fires (e.g. reduced motion clamps duration to ~0 and the
      // browser coalesces it away), don't leave a stray node behind.
      setTimeout(() => { if (el.isConnected) { el.remove(); bounce(); } }, 900);
    }

    window.addEventListener(ADD_TO_CART_FLY_EVENT, onFly);
    return () => window.removeEventListener(ADD_TO_CART_FLY_EVENT, onFly);
  }, []);

  return <div ref={layerRef} aria-hidden="true" />;
}
