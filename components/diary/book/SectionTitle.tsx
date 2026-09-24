import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { HeartDoodle, Squiggle } from "../art/Doodles";

/** A handwritten heading with a little icon, a heart and a wavy rule that runs out to an optional action on the right ("See more →", "+ Add a date"). */
export function SectionTitle({ id, icon, children, action, className, rule = true }: { id?: string; icon?: ReactNode; children: ReactNode; action?: ReactNode; className?: string; rule?: boolean }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-2", className)}>
      <h2 id={id} className="dy-h shrink-0">
        {icon ? <span className="dy-h-icon" aria-hidden="true">{icon}</span> : null}
        <span>{children}</span>
        <HeartDoodle className="ml-0.5 text-[0.62em]" />
      </h2>
      {rule ? <Squiggle className="hidden sm:block" /> : <span className="flex-1" />}
      {action ? <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
