import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const variantClasses = {
  /** Very subtle — order is waiting on the customer (awaiting payment) */
  waiting: "bg-brand-dark/5 text-brand-dark/50",
  /** Generic low-key — fallback */
  neutral: "bg-brand-dark/10 text-brand-dark/60",
  /** Forest green — order is being prepared / processed */
  progress: "bg-brand-primary/10 text-brand-primary",
  /** Copper — order is in transit with the courier */
  shipped: "bg-brand-secondary/15 text-brand-secondary-dark",
  /** Solid forest green with white text — order fully delivered */
  done: "bg-brand-primary text-brand-surface",
  /** Darker gray — order cancelled or refunded */
  cancelled: "bg-brand-dark/15 text-brand-dark/60",
  /** Legacy alias for progress */
  primary: "bg-brand-primary/10 text-brand-primary",
  /** Legacy alias for shipped */
  gold: "bg-brand-secondary/15 text-brand-secondary-dark",
} as const;

export type BadgeVariant = keyof typeof variantClasses;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
