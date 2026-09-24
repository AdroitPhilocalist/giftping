import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { DeskProps } from "../art/DeskProps";
import { caveat } from "../fonts";
import "../diary.css";

/**
 * The warm wooden desk every diary screen sits on: the wood, the lamp light and (on wide screens) a few out-of-focus things beside the book —
 * a brass plate of marigolds, a cup of chai, a fountain pen. It also brings the diary's handwriting font and stylesheet with it, so any page
 * that renders inside it (the real diary, the design preview) is styled the same way.
 */
export function DiaryDesk({ children, className, props = true }: { children: ReactNode; className?: string; props?: boolean }) {
  return (
    <div className={cn(caveat.variable, "dy-desk", className)}>
      {props ? <DeskProps /> : null}
      {children}
    </div>
  );
}
