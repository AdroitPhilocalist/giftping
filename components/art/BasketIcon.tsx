import type { SVGProps } from "react";

/**
 * A little woven basket in the same outline style as the header's other (lucide) icons — it replaces the generic shopping bag so the header's
 * cart icon is the thing a gift visibly drops into. Takes the same className/size props.
 */
export function BasketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <path d="M7 10c0-4 2.2-6.5 5-6.5s5 2.5 5 6.5" />
      <path d="M3 10h18l-1.6 8.6a2 2 0 0 1-2 1.6H6.6a2 2 0 0 1-2-1.6z" />
      <path d="M9 13.5v3.5M12 13.5v3.5M15 13.5v3.5" />
    </svg>
  );
}
