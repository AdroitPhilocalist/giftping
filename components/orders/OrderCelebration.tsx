"use client";

import { useEffect, useState } from "react";
import { Robin, hasRobinArt } from "@/components/art/Robin";

export const PAYMENT_CONFIRMED_EVENT = "gp:payment-confirmed";
/** Fired by the diary's gift plan when a gift is marked as given — the same burst, a different sentence for screen readers. */
export const GIFT_GIVEN_EVENT = "gp:gift-given";

const SPARKS: { dx: number; dy: number; delay: number }[] = [
  { dx: 70, dy: -46, delay: 0.05 },
  { dx: -68, dy: -50, delay: 0.12 },
  { dx: 84, dy: 18, delay: 0.02 },
  { dx: -80, dy: 22, delay: 0.18 },
  { dx: 22, dy: -78, delay: 0.09 },
  { dx: -20, dy: 76, delay: 0.15 },
];

/**
 * Two celebrations behind one event listener:
 *  - "unwrap" (the default for a confirmed PAYMENT): a gift box pops in, its ribbon-tied lid lifts off, and the robin rises out of it with a burst of the
 *    site's own ornament and a one-line caption — the order was a gift being wrapped, and now it's opened.
 *  - "burst" (the diary's "gift given" moment, and any other event): the original quick robin-and-sparks pop.
 * Mounted once on the page; listens for a plain window event rather than props, since the thing that fires it (PayNowButton, the diary's gift plan) isn't a
 * relative of this component worth threading state through. It never blocks the page (pointer-events-none) and dismisses itself. For anyone who has asked
 * for reduced motion the scene is skipped entirely and only the screen-reader announcement is made.
 */
export function OrderCelebration({
  eventName = PAYMENT_CONFIRMED_EVENT,
  message = "Payment confirmed — thank you for your order!",
  scene,
}: { eventName?: string; message?: string; scene?: "unwrap" | "burst" } = {}) {
  const [phase, setPhase] = useState<"idle" | "in" | "out" | "quiet">("idle");
  const kind = scene ?? (eventName === PAYMENT_CONFIRMED_EVENT ? "unwrap" : "burst");
  const holdMs = kind === "unwrap" ? 3600 : 2100;

  useEffect(() => {
    function onConfirmed() {
      setPhase(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "quiet" : "in");
    }
    window.addEventListener(eventName, onConfirmed);
    return () => window.removeEventListener(eventName, onConfirmed);
  }, [eventName]);

  useEffect(() => {
    if (phase === "idle") return;
    const toOut = setTimeout(() => setPhase(phase === "quiet" ? "idle" : "out"), phase === "quiet" ? 3000 : holdMs);
    const toIdle = setTimeout(() => setPhase("idle"), phase === "quiet" ? 3000 : holdMs + 400);
    return () => {
      clearTimeout(toOut);
      clearTimeout(toIdle);
    };
  }, [phase, holdMs]);

  if (phase === "idle") return null;
  if (phase === "quiet") return <p role="status" aria-live="polite" className="sr-only">{message}</p>;

  if (kind === "unwrap") {
    const robinPose = hasRobinArt("celebrating") ? "celebrating" : "perched";
    return (
      <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-brand-dark/25" aria-hidden="true">
        <div className="gp-unwrap-stage flex flex-col items-center" data-leaving={phase === "out"}>
          <div className="gp-unwrap-box relative w-56 sm:w-72">
            <div className="absolute inset-0 flex items-center justify-center"><div className="gp-unwrap-glow h-64 w-64 rounded-full bg-brand-secondary/40 blur-2xl" /></div>
            {/* the robin sits BEHIND the box drawing, so as it rises its lower half stays tucked inside the box */}
            <div className="absolute inset-x-0 bottom-[44%] flex justify-center"><div className="gp-unwrap-robin w-28 sm:w-36"><Robin pose={robinPose} className="drop-shadow-[0_12px_30px_rgb(28_25_22_/_0.25)]" /></div></div>
            <svg viewBox="0 0 200 200" className="relative h-auto w-full" focusable="false">
              <ellipse cx="100" cy="188" rx="62" ry="7" fill="var(--gp-ink)" opacity="0.18" />
              <rect x="40" y="102" width="120" height="82" rx="6" fill="var(--gp-primary)" />
              <rect x="40" y="102" width="120" height="12" fill="var(--gp-ink)" opacity="0.14" />
              <rect x="92" y="102" width="16" height="82" fill="var(--gp-copper)" />
              <rect x="92" y="102" width="5" height="82" fill="var(--gp-surface)" opacity="0.22" />
              {/* the lid, with the ribbon and bow riding on it — it shakes, then lifts away */}
              <g className="gp-unwrap-lid">
                <rect x="32" y="72" width="136" height="36" rx="6" fill="var(--gp-primary-dark)" />
                <rect x="32" y="72" width="136" height="7" rx="3" fill="var(--gp-surface)" opacity="0.18" />
                <rect x="92" y="72" width="16" height="36" fill="var(--gp-copper)" />
                <g transform="translate(100 72)">
                  <path d="M0 0c-6-22-34-28-38-14s18 22 38 14z" fill="var(--gp-copper)" />
                  <path d="M0 0c6-22 34-28 38-14s-18 22-38 14z" fill="var(--gp-copper)" />
                  <path d="M0 0c-6-22-34-28-38-14s18 22 38 14z" fill="var(--gp-ink)" opacity="0.1" />
                  <ellipse cx="0" cy="0" rx="9" ry="8" fill="var(--gp-copper-dark)" />
                </g>
              </g>
            </svg>
            {SPARKS.map((sp, i) => (
              <svg key={i} viewBox="0 0 14 14" className="gp-celebrate-spark absolute left-1/2 top-[44%] -ml-2 -mt-2 h-4 w-4 text-brand-secondary" style={{ "--spark-x": `${sp.dx * 1.4}px`, "--spark-y": `${sp.dy * 1.4}px`, "--spark-delay": `${1.3 + sp.delay}s` } as React.CSSProperties}>
                <path d="M7 0l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="currentColor" />
              </svg>
            ))}
          </div>
          <p className="gp-unwrap-caption mt-4 rounded-full bg-brand-surface px-5 py-2 text-sm font-medium text-brand-dark shadow-lift">{message}</p>
        </div>
        <p role="status" aria-live="polite" className="sr-only">{message}</p>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center" aria-hidden="true">
      <div className="gp-celebrate-mark" data-leaving={phase === "out"}>
        {hasRobinArt("celebrating") || hasRobinArt("on-gift") ? <Robin pose={hasRobinArt("celebrating") ? "celebrating" : "on-gift"} className="w-36 drop-shadow-[0_12px_30px_rgb(28_25_22_/_0.25)] sm:w-48" /> : <Robin className="w-28 drop-shadow-[0_12px_30px_rgb(28_25_22_/_0.25)] sm:w-36" />}
        {SPARKS.map((s, i) => (
          <svg key={i} viewBox="0 0 14 14" className="gp-celebrate-spark absolute left-1/2 top-1/2 -ml-2 -mt-2 h-4 w-4 text-brand-secondary" style={{ "--spark-x": `${s.dx}px`, "--spark-y": `${s.dy}px`, "--spark-delay": `${s.delay}s` } as React.CSSProperties}>
            <path d="M7 0l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="currentColor" />
          </svg>
        ))}
      </div>
      <p role="status" aria-live="polite" className="sr-only">{message}</p>
    </div>
  );
}
