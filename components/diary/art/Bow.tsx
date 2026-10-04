import { cn } from "@/lib/utils/cn";

/**
 * A small gift-ribbon bow, drawn once and reused wherever the diary shows a "pulled tighter" countdown (DateRibbon) — the same drawing the shop's own
 * free-delivery ribbon rides (components/shop/DeliveryRibbon.tsx), coloured from the same copper tokens, so the two "ribbon filling up" moments in the
 * app read as one idea rather than two different widgets that happen to share a word.
 */
export function Bow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={cn("h-5 w-7", className)} aria-hidden="true" focusable="false">
      <path d="M14 10C10 2 2 1 1 6s6 6 13 4z" fill="var(--gp-copper-dark)" />
      <path d="M14 10c4-8 12-9 13-4s-6 6-13 4z" fill="var(--gp-copper-dark)" />
      <path d="M14 10C10 17 4 19 2 15s5-5 12-5z" fill="var(--gp-copper)" opacity="0.85" />
      <path d="M14 10c4 7 10 9 12 5s-5-5-12-5z" fill="var(--gp-copper)" opacity="0.85" />
      <circle cx="14" cy="10" r="3.2" fill="var(--gp-copper-dark)" />
      <circle cx="13" cy="9" r="1" fill="var(--dy-petal)" opacity="0.6" />
    </svg>
  );
}
