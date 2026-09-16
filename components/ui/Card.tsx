import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-brand-dark/10 bg-white/70 p-5 shadow-sm shadow-brand-dark/5",
        className,
      )}
      {...props}
    />
  );
}
