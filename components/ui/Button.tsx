import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils/cn";

const variantClasses = {
  /** the main action: deep green */
  primary:
    "bg-brand-primary text-brand-on-primary shadow-sm hover:-translate-y-px hover:bg-brand-primary-dark hover:shadow-card disabled:bg-brand-primary/50",
  /** a quiet outlined action (Continue shopping, Buy now) */
  secondary:
    "border border-brand-dark/20 bg-transparent text-brand-dark hover:border-brand-dark/35 hover:bg-brand-accent/60 disabled:opacity-50",
  /** an outlined accent action (Watch our story, About the brand) */
  outline:
    "border border-brand-secondary/50 bg-transparent text-brand-secondary-dark hover:bg-brand-secondary/10 disabled:opacity-50",
  /** the accent fill — kept under its historical name "gold"; it is the theme's accent colour (copper by default) */
  gold: "bg-brand-secondary text-brand-on-secondary hover:-translate-y-px hover:bg-brand-secondary-dark hover:shadow-card disabled:opacity-50",
  ghost: "bg-transparent text-brand-dark hover:bg-brand-dark/5 disabled:opacity-50",
} as const;

const sizeClasses = {
  sm: "min-h-9 px-4 py-1.5 text-sm",
  md: "min-h-11 px-6 py-2.5 text-sm",
  lg: "min-h-13 px-8 py-3 text-base",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-button font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-light disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
