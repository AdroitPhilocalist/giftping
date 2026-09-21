import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STEPS = ["Cart", "Delivery & gift", "Payment"] as const;

/** Where you are in buying: Cart → Delivery & gift → Payment. `current` is the 0-based step being shown. */
export function CheckoutSteps({ current, className }: { current: 0 | 1 | 2; className?: string }) {
  return (
    <ol className={cn("flex items-center gap-2 text-xs sm:gap-3 sm:text-sm", className)} aria-label="Checkout progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3" aria-current={on ? "step" : undefined}>
            <span className="flex items-center gap-2">
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors", done ? "bg-brand-secondary text-brand-on-secondary" : on ? "bg-brand-primary text-brand-on-primary" : "bg-brand-dark/10 text-brand-dark/50")}>
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn(on ? "font-medium text-brand-dark" : done ? "text-brand-dark/70" : "text-brand-dark/45")}>{label}</span>
            </span>
            {i < STEPS.length - 1 ? <span className={cn("h-px w-6 sm:w-10", done ? "bg-brand-secondary" : "bg-brand-dark/15")} aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
