"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils/cn";

const MAX_TILT = 6; // degrees
const TILT_SPRING = { stiffness: 240, damping: 20, mass: 0.7 };
const LIFT_SPRING = { stiffness: 320, damping: 24 };
const LIFT = -6; // px the card rises while a mouse is over it
const PRESS = 0.985; // what it shrinks to while held down

/**
 * The shared "lit glass" card shell. Wrap a card in it and, with a mouse:
 *  - it leans toward the cursor and rises on springs (physics, so it settles and can be interrupted mid-move — the old CSS tilt could only ease),
 *  - a warm light follows the pointer across its surface and catches a thin gold edge right where the cursor is,
 *  - anything inside marked `.gp-glow-parallax` drifts a few pixels against the pointer, so a photo seems to sit behind the glass.
 * With a finger it simply presses in a little. Under `prefers-reduced-motion` the leaning, lift, press and drift are all switched off (the light and
 * the edge stay — they don't move anything). The pointer position is written straight onto the element as CSS variables and into spring motion values, so
 * moving the mouse never re-renders React. Only motion's springs are used — their values are written to the element's transform once per frame here — not its
 * components or gesture/animation feature bundle, which would add ~30 KB for hover and tap handling a few pointer events do just as well. Colours live in globals.css (`.gp-glow`, from the theme tokens), none here.
 *
 * It does not draw the card — the card inside keeps its own surface, radius, shadow and `overflow-hidden`; the card inside must NOT lift on hover itself, or the
 * two movements would stack (CLAUDE.md's placement-transform gotcha).
 */
export function GlowCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rotateX = useSpring(0, TILT_SPRING);
  const rotateY = useSpring(0, TILT_SPRING);
  const y = useSpring(0, LIFT_SPRING);
  const scale = useSpring(1, LIFT_SPRING);

  const enter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && !reduce) y.set(LIFT);
  };
  const down = () => {
    if (!reduce) scale.set(PRESS);
  };
  const up = () => scale.set(1);

  // Paint the springs: one transform write per animation frame, however many of the four values moved in it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let queued = 0;
    const paint = () => {
      queued = 0;
      el.style.transform = `perspective(900px) translate3d(0, ${y.get().toFixed(2)}px, 0) rotateX(${rotateX.get().toFixed(2)}deg) rotateY(${rotateY.get().toFixed(2)}deg) scale(${scale.get().toFixed(4)})`;
    };
    const queue = () => {
      if (!queued) queued = requestAnimationFrame(paint);
    };
    const stops = [rotateX, rotateY, y, scale].map((v) => v.on("change", queue));
    return () => {
      stops.forEach((stop) => stop());
      cancelAnimationFrame(queued);
    };
  }, [rotateX, rotateY, y, scale]);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (e.pointerType !== "mouse" || !el) return; // a finger would fight scrolling
    const box = el.getBoundingClientRect();
    const px = (e.clientX - box.left) / box.width;
    const py = (e.clientY - box.top) / box.height;
    el.style.setProperty("--gx", `${(e.clientX - box.left).toFixed(0)}px`);
    el.style.setProperty("--gy", `${(e.clientY - box.top).toFixed(0)}px`);
    el.style.setProperty("--gpx", ((px - 0.5) * 2).toFixed(3));
    el.style.setProperty("--gpy", ((py - 0.5) * 2).toFixed(3));
    if (!reduce) {
      rotateY.set((px - 0.5) * 2 * MAX_TILT);
      rotateX.set((0.5 - py) * 2 * MAX_TILT);
    }
  };
  const leave = () => {
    rotateX.set(0);
    rotateY.set(0);
    y.set(0);
    scale.set(1);
    const el = ref.current;
    if (el) for (const v of ["--gpx", "--gpy"]) el.style.setProperty(v, "0");
  };

  return (
    <div
      ref={ref}
      onPointerEnter={enter}
      onPointerMove={move}
      onPointerLeave={leave}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      className={cn("gp-glow", className)}
    >
      {children}
    </div>
  );
}
