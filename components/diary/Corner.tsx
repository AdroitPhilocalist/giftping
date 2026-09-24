import { Sprig, type SprigVariant } from "./art/Sprig";
import { cn } from "@/lib/utils/cn";

const POSITIONS = {
  bl: "bottom-1 left-1 rotate-[6deg]",
  br: "bottom-1 right-1 -rotate-[6deg]",
  tl: "left-1 top-1 -rotate-[8deg]",
  tr: "right-1 top-1 rotate-[8deg]",
} as const;

/** A sprig tucked into a page corner (behind the content). Decorative only. */
export function Corner({ at, variant = "daisy", className, size = "h-28 w-14" }: { at: keyof typeof POSITIONS; variant?: SprigVariant; className?: string; size?: string }) {
  return <Sprig variant={variant} flip={at === "br" || at === "tr"} className={cn("dy-corner", size, POSITIONS[at], className)} />;
}
