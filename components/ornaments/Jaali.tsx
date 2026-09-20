import { useId } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A jaali-inspired lattice (eight-point stars and circles) as a background pattern. Pure SVG, coloured by currentColor / the theme's ornament colour,
 * so a festival theme recolours it for free. Lay it over a section with low opacity; it never carries meaning, so it is hidden from assistive tech.
 */
export function Jaali({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg className={cn("pointer-events-none absolute inset-0 h-full w-full text-brand-ornament", className)} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="0.8">
            <path d="M24 4l4.6 11.2L40 20l-11.4 4.8L24 36l-4.6-11.2L8 20l11.4-4.8z" />
            <circle cx="24" cy="20" r="3" />
            <path d="M0 44l4-4 4 4-4 4zM40 44l4-4 4 4-4 4zM-4 0l4-4M44 0l4-4" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
