import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import "./shop.css";

/** A grid of product cards hung on a length of twine — each row is a line of gift tags (the twine and the loops are drawn by the slots). */
export function ProductGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("gift-grid grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-4", className)}>
      {Children.map(children, (child) => (
        <div className="gift-slot">{child}</div>
      ))}
    </div>
  );
}
