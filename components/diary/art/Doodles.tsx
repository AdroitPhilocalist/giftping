import { cn } from "@/lib/utils/cn";

/** Little pen doodles that finish a heading: a heart, a wavy underline, a sparkle. currentColor, so a parent class sets the ink. */
export function HeartDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" aria-hidden="true" focusable="false" className={cn("inline-block h-[0.8em] w-[0.86em] text-[var(--gp-copper)]", className)}>
      <path d="M12 20C4 14 1.5 9.5 3.6 5.8 5.8 2.2 10.4 2.6 12 6.4c1.6-3.8 6.2-4.2 8.4-.6 2.1 3.7-.4 8.2-8.4 14.2z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true" focusable="false" className={cn("h-2.5 min-w-8 flex-1 text-[var(--dy-ink-soft)]", className)}>
      <path d="M1 6c6-6 12-6 18 0s12 6 18 0 12-6 18 0 12 6 18 0 12-6 18 0 12 6 20 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className={cn("inline-block h-4 w-4 text-[var(--dy-gold)]", className)}>
      <path d="M10 1l2 6.2L19 10l-7 2.8L10 19l-2-6.2L1 10l7-2.8z" fill="currentColor" />
    </svg>
  );
}

/** A hand-drawn underline stroke for a word. */
export function Underline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true" focusable="false" className={cn("h-2 w-full text-[var(--gp-copper)]", className)}>
      <path d="M2 8c30-5 60-6 96-4s70 3 100-1" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
