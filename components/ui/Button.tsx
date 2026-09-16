import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils/cn";

const variantClasses = {
  primary:
    "bg-brand-primary text-brand-light hover:bg-brand-primary-dark disabled:bg-brand-primary/50",
  secondary:
    "border border-brand-primary/20 bg-transparent text-brand-dark hover:bg-brand-primary/5 disabled:opacity-50",
  gold: "bg-brand-secondary text-brand-dark hover:bg-brand-secondary-dark disabled:opacity-50",
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
          "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2 disabled:cursor-not-allowed",
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
