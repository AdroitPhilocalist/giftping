"use client";

import type { PointerEvent, ReactNode } from "react";
import "../shop/shop.css";
import { cn } from "@/lib/utils/cn";

/**
 * A soft warm light that follows the cursor across an entire section of cards — like walking under a boutique's track lighting, rather than one card's own
 * glow (components/motion/TiltCard.tsx is the per-card version of this same idea; this is the room-scale one). Same technique: two CSS variables written
 * straight onto the element via a ref (no React state, so moving the mouse never re-renders the grid underneath), mouse-only, off under
 * `prefers-reduced-motion`. The glow sits in its own `::before` layer with `pointer-events: none`, so it never intercepts a click on a card beneath it.
 */
export function SpotlightSection({ children, className }: { children: ReactNode; className?: string }) {
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget;
    const box = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${(((e.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
    el.style.setProperty("--sy", `${(((e.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
    el.style.setProperty("--spot", "1");
  };
  const leave = (e: PointerEvent<HTMLDivElement>) => e.currentTarget.style.setProperty("--spot", "0");
  return (
    <div onPointerMove={move} onPointerLeave={leave} className={cn("gp-spotlight", className)}>
      {children}
    </div>
  );
}
