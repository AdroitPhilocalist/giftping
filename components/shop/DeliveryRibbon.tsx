import { Truck } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** A small bow, drawn in theme tokens, that rides the tip of the filled ribbon. */
function Bow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={cn("h-5 w-7", className)} aria-hidden="true" focusable="false">
      <path d="M14 10C10 2 2 1 1 6s6 6 13 4z" fill="var(--gp-copper-dark)" />
      <path d="M14 10c4-8 12-9 13-4s-6 6-13 4z" fill="var(--gp-copper-dark)" />
      <path d="M14 10C10 17 4 19 2 15s5-5 12-5z" fill="var(--gp-copper)" opacity="0.85" />
      <path d="M14 10c4 7 10 9 12 5s-5-5-12-5z" fill="var(--gp-copper)" opacity="0.85" />
      <circle cx="14" cy="10" r="3.2" fill="var(--gp-copper-dark)" />
      <circle cx="13" cy="9" r="1" fill="var(--gp-surface)" opacity="0.5" />
    </svg>
  );
}

/**
 * "Add ₹X more for free delivery" as a gift ribbon filling up, with a bow at its tip that gets tied when delivery unlocks. Pure presentation — the
 * numbers come from the caller (the cart page per boutique, the mini-basket for the boutique closest to unlocking it). Works without JavaScript.
 */
export function DeliveryRibbon({ pct, reached, remaining, boutique, className }: { pct: number; reached: boolean; remaining?: number; boutique?: string; className?: string }) {
  const filled = reached ? 100 : Math.max(0, Math.min(100, pct));
  const from = boutique ? ` from ${boutique}` : "";
  return (
    <div className={cn("rounded-button bg-brand-accent/60 px-4 py-3 text-sm", className)}>
      <p className="flex items-center gap-2 text-brand-dark/80">
        <Truck className="h-4 w-4 shrink-0 text-brand-secondary-dark" aria-hidden="true" />
        {reached ? (
          <span>Free delivery unlocked{boutique ? ` on your ${boutique} items` : ""} 🎀</span>
        ) : (
          <span>Add <span className="font-medium text-brand-dark">{formatCurrency(remaining ?? 0)}</span> more{from} for free delivery.</span>
        )}
      </p>
      <div
        className="relative mt-3 h-2.5 rounded-full border border-dashed border-brand-secondary/45 bg-brand-secondary/10"
        role="progressbar"
        aria-valuenow={filled}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress to free delivery${from}`}
      >
        <div className="gp-ribbon-fill h-full rounded-full bg-brand-secondary" style={{ width: `${filled}%` }} />
        {/* the bow rides the tip; clamped so it never hangs off either end of the track */}
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `clamp(0.9rem, ${filled}%, calc(100% - 0.9rem))` }} aria-hidden="true">
          {reached ? <Bow key="tied" className="gp-ribbon-bow" /> : <Bow />}
        </span>
      </div>
    </div>
  );
}
