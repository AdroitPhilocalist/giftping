"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** A clickable 1-5 star input. No native `<input>` equivalent exists for this, so callers wire it up with
 * react-hook-form's `Controller` rather than `register()`. */
export function StarRatingInput({ value, onChange, disabled }: { value: number; onChange: (rating: number) => void; disabled?: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value;

  return (
    <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          disabled={disabled}
          onMouseEnter={() => setHovered(n)}
          onClick={() => onChange(n)}
          className="p-0.5 disabled:cursor-not-allowed"
        >
          <Star className={cn("h-7 w-7 transition-colors", n <= shown ? "fill-brand-secondary text-brand-secondary" : "fill-transparent text-brand-dark/25")} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
