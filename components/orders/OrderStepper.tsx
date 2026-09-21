import { Check } from "lucide-react";
import { ORDER_STEPS } from "@/lib/shop/order-progress";
import { cn } from "@/lib/utils/cn";

/** Placed → Confirmed → Packed → On the way → Delivered. Finished steps are filled, the current one pulses, the rest are quiet. */
export function OrderStepper({ completed }: { completed: number }) {
  return (
    <ol className="grid grid-cols-5" aria-label="Order progress">
      {ORDER_STEPS.map((label, i) => {
        const done = i < completed;
        const current = i === completed;
        return (
          <li key={label} className="relative flex flex-col items-center text-center" aria-current={current ? "step" : undefined}>
            {i > 0 ? (
              <span className={cn("absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 transition-colors duration-700", i <= completed ? "bg-brand-secondary" : "bg-brand-dark/10")} aria-hidden="true" />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors duration-500",
                done ? "border-brand-secondary bg-brand-secondary text-brand-on-secondary" : current ? "border-brand-secondary bg-brand-surface text-brand-secondary-dark" : "border-brand-dark/15 bg-brand-surface text-brand-dark/35",
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              {current ? <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand-secondary/30" aria-hidden="true" /> : null}
            </span>
            <span className={cn("mt-2 text-[11px] leading-tight sm:text-xs", done || current ? "font-medium text-brand-dark" : "text-brand-dark/45")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
