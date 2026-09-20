import { cn } from "@/lib/utils/cn";

/** A small ornamental rule (line · diamond · line). Drawn with currentColor, so it takes the theme's ornament colour. */
export function OrnamentDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 text-brand-ornament", className)} role="presentation" aria-hidden="true">
      <span className="h-px w-16 bg-current opacity-40" />
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 0l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></svg>
      <span className="h-px w-16 bg-current opacity-40" />
    </div>
  );
}
