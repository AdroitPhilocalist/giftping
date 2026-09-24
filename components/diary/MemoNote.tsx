import type { ReactNode } from "react";
import { HeartDoodle } from "./art/Doodles";
import { Sprig } from "./art/Sprig";
import { cn } from "@/lib/utils/cn";

/** A little torn note with a line of handwriting — used for encouragement, quotes and "did you know" asides. */
export function MemoNote({ children, className, tone = "cream", tilt = 2 }: { children: ReactNode; className?: string; tone?: "cream" | "peach" | "blush" | "sage"; tilt?: number }) {
  return (
    <div className={cn("dy-note dy-hand flex items-center gap-3 px-5 py-5 text-[1.45rem] leading-[1.12]", `dy-note--${tone}`, className)} style={{ ["--tilt" as string]: `${tilt}deg`, ["--torn" as string]: "var(--dy-torn-4)" }}>
      <span className="dy-tape dy-tape--mustard" style={{ top: "-0.6rem", left: "1.6rem" }} aria-hidden="true" />
      <span>{children} <HeartDoodle /></span>
      <Sprig variant="wild" className="ml-auto h-16 w-8 shrink-0 opacity-90" />
    </div>
  );
}
