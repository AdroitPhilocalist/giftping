"use client";

import type { PointerEvent, ReactNode } from "react";
import "../shop/shop.css";
import { cn } from "@/lib/utils/cn";

const MAX_TILT = 5; // degrees — enough to feel like a window you lean toward, not a trading card

/**
 * "Shop-window" card: with a mouse over it, the card leans slightly toward the cursor and a warm light follows the pointer across it, like a lit window.
 * Only a real mouse on a device that can hover — never touch (it would fight scrolling) — and never under `prefers-reduced-motion`. The effect is two CSS
 * variables written straight onto the element (no React state, so moving the mouse never re-renders anything); the leaning lives on THIS wrapper while the card
 * inside keeps its own hover lift, so the two transforms never multiply each other (CLAUDE.md's placement-transform gotcha).
 */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget;
    const box = el.getBoundingClientRect();
    const px = (e.clientX - box.left) / box.width;
    const py = (e.clientY - box.top) / box.height;
    el.style.setProperty("--ry", `${((px - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - py) * 2 * MAX_TILT).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--glow", "1");
  };
  const leave = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--glow", "0");
  };
  return (
    <div onPointerMove={move} onPointerLeave={leave} className={cn("gp-tilt", className)}>
      {children}
    </div>
  );
}
