import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-brand-dark/[0.07] bg-brand-surface p-5 shadow-card", className)}
      {...props}
    />
  );
}
