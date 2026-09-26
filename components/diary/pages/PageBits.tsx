import type { ReactNode } from "react";
import { HeartDoodle } from "../art/Doodles";
import { cn } from "@/lib/utils/cn";

/** The big handwritten title at the top of a diary page, with an optional line under it and an action on the right. */
export function PageHeading({ children, sub, action, className }: { children: ReactNode; sub?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-1", className)}>
      <div className="min-w-0">
        <h2 className="dy-pg-title">{children} <HeartDoodle className="align-top text-[0.32em]" /></h2>
        {sub ? <p className="dy-sub mt-1 !text-[1.2rem]">{sub}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}
