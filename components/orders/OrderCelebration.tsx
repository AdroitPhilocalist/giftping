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
 * The moment PayNowButton confirms a real payment (not just an order draft — see its handler), the robin
 * pops up with a small burst of the site's own ornament — no generic confetti squares, the same copper
 * diamond used in OrnamentDivider. Mounted once on the order page; listens for a plain window event rather
 * than props, since PayNowButton and this component don't otherwise share a parent worth threading state
 * through. Auto-dismisses itself; never blocks the page underneath (pointer-events-none throughout).
 */
export function OrderCelebration({ eventName = PAYMENT_CONFIRMED_EVENT, message = "Payment confirmed — thank you for your order!" }: { eventName?: string; message?: string } = {}) {
  const [phase, setPhase] = useState<"idle" | "in" | "out">("idle");

  useEffect(() => {
    function onConfirmed() {
      setPhase("in");
    }
    window.addEventListener(eventName, onConfirmed);
    return () => window.removeEventListener(eventName, onConfirmed);
  }, [eventName]);

  useEffect(() => {
    if (phase !== "in") return;
    const toOut = setTimeout(() => setPhase("out"), 2100);
    const toIdle = setTimeout(() => setPhase("idle"), 2500);
    return () => {
      clearTimeout(toOut);
      clearTimeout(toIdle);
    };
  }, [phase]);

  if (phase === "idle") return null;

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
