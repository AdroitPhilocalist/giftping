"use client";

import type { PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * "World window" occasion cards (components/shop/CategoryCard.tsx) — the counterpart to the "lit glass" GlowCard, and deliberately a DIFFERENT experience.
 * A boutique card is an object that leans toward you; an occasion card is a WINDOW into a place, so the frame holds perfectly still and instead the world
 * inside answers you: the photo drifts a little toward where you look and zooms in, light spills out of the frame onto the page, the occasion's own ambience
 * (components/shop/Ambience.tsx) drifts down inside the glass, and a sheen crosses the pane. This wrapper only writes --wpx/--wpy (−1…1: how far the pointer
 * is from the card's centre) straight onto the element — no React state, so moving the mouse never re-renders. All the colour and motion lives in
 * globals.css (`.gp-world`), from the theme tokens; mouse only, so it never fights scrolling on a phone.
 */
export function WorldCard({ children, className }: { children: ReactNode; className?: string }) {
  const look = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const box = el.getBoundingClientRect();
    el.style.setProperty("--wpx", (((e.clientX - box.left) / box.width - 0.5) * 2).toFixed(3));
    el.style.setProperty("--wpy", (((e.clientY - box.top) / box.height - 0.5) * 2).toFixed(3));
  };
  const rest = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--wpx", "0");
    e.currentTarget.style.setProperty("--wpy", "0");
  };
  return (
    <div onPointerMove={look} onPointerLeave={rest} className={cn("gp-world", className)}>
      {children}
    </div>
  );
}
