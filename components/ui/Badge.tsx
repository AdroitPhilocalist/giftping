import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const variantClasses = {
  neutral: "bg-brand-dark/5 text-brand-dark/70",
  gold: "bg-brand-secondary/15 text-brand-secondary-dark",
  primary: "bg-brand-primary/10 text-brand-primary",
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantClasses;
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
