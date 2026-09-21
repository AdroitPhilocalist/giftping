import { Truck } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

/** "Add ₹X more for free delivery" with a progress bar — free delivery is decided per boutique, so this is shown per boutique. */
export function FreeDeliveryNudge({ subtotal, threshold, boutique }: { subtotal: number; threshold: number; boutique: string }) {
  if (threshold <= 0) return null;
  const reached = subtotal >= threshold;
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  return (
    <div className="rounded-button bg-brand-accent/60 px-4 py-3 text-sm">
      <p className="flex items-center gap-2 text-brand-dark/80">
        <Truck className="h-4 w-4 shrink-0 text-brand-secondary-dark" aria-hidden="true" />
        {reached ? (
          <span>Free delivery on your {boutique} items.</span>
        ) : (
          <span>Add <span className="font-medium text-brand-dark">{formatCurrency(threshold - subtotal)}</span> more from {boutique} for free delivery.</span>
        )}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-dark/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to free delivery from ${boutique}`}>
        <div className="h-full rounded-full bg-brand-secondary transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
