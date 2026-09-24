import type { ReactNode } from "react";
import { Gift } from "lucide-react";
import { Robin, hasRobinArt } from "@/components/art/Robin";
import { HeartDoodle } from "./art/Doodles";
import { Sprig } from "./art/Sprig";
import { WaxSeal } from "./art/WaxSeal";
import { cn } from "@/lib/utils/cn";

/** A small paper card for the diary's quiet moments — nothing coming up, no gifts yet, a gift sorted. */
function StateCard({ art, title, line, action, className, tape = "blush" }: { art: ReactNode; title: string; line?: string; action?: ReactNode; className?: string; tape?: "blush" | "sage" | "mustard" }) {
  return (
    <div className={cn("dy-note dy-note--cream flex flex-col items-center gap-1 px-5 pb-5 pt-6 text-center", className)} style={{ ["--torn" as string]: "var(--dy-torn-2)", ["--tilt" as string]: "-0.6deg" }}>
      <span className={`dy-tape dy-tape--${tape}`} style={{ top: "-0.6rem", left: "50%", marginLeft: "-2.5rem" }} aria-hidden="true" />
      <div className="relative">{art}</div>
      <p className="dy-hand-b mt-1 text-[1.6rem] leading-[1.05]">{title} <HeartDoodle className="text-[0.6em]" /></p>
      {line ? <p className="dy-hand max-w-[18rem] text-[1.2rem] leading-[1.15] text-[var(--dy-ink-soft)]">{line}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** "Nothing in the next 60 days" — the robin having a rest. Uses the sleeping pose once delivered, the peeking one until then. */
export function RobinSleeping({ title, line, action }: { title: string; line?: string; action?: ReactNode }) {
  const sleeping = hasRobinArt("sleeping");
  return (
    <StateCard
      title={title}
      line={line}
      action={action}
      art={
        <>
          <Robin pose={sleeping ? "sleeping" : "peeking"} title="" className="w-32" />
          {sleeping ? (
            <span className="pointer-events-none absolute -right-2 top-0 text-2xl" aria-hidden="true">
              <span className="dy-z absolute right-0 top-0" style={{ ["--z-delay" as string]: "0s" }}>z</span>
              <span className="dy-z absolute right-3 top-2 text-lg" style={{ ["--z-delay" as string]: "1s" }}>z</span>
            </span>
          ) : null}
        </>
      }
    />
  );
}

/** "No gifts logged yet" — an open, empty gift box waiting to be filled. */
export function NoGiftsYet({ title = "No gifts logged yet", line = "Start adding the people you love and their special moments.", action }: { title?: string; line?: string; action?: ReactNode }) {
  return (
    <StateCard
      tape="mustard"
      title={title}
      line={line}
      action={action}
      art={
        <svg viewBox="0 0 120 90" className="h-24 w-32" aria-hidden="true" focusable="false">
          <path d="M14 34l46-18 46 18-46 20z" fill="var(--dy-paper-lo)" stroke="var(--dy-paper-edge)" strokeWidth="1.5" />
          <path d="M14 34v34l46 18V54z" fill="var(--dy-blush)" /><path d="M106 34v34L60 86V54z" fill="var(--dy-rose)" />
          <path d="M14 34l46 20 46-20" fill="none" stroke="var(--dy-paper-edge)" strokeWidth="1.5" />
          <path d="M60 54v32" stroke="var(--dy-mustard)" strokeWidth="6" />
          <path d="M30 76c-12 4-20-2-14-8 6-5 13 1 14 8zM90 76c12 4 20-2 14-8-6-5-13 1-14 8z" fill="var(--dy-rose)" opacity="0.8" />
          <path d="M40 8l2 6M60 2v7M80 8l-2 6" stroke="var(--dy-gold)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      }
    />
  );
}

/** "Gift sorted!" — the green wax seal with a gift on it. */
export function GiftSorted({ title = "Gift sorted!", line = "You're one step closer to a happier tomorrow." }: { title?: string; line?: string }) {
  return (
    <StateCard
      tape="sage"
      title={title}
      line={line}
      art={
        <div className="relative">
          <Sprig variant="wild" className="absolute -left-9 top-0 h-24 w-12" />
          <Sprig variant="wild" flip className="absolute -right-9 top-0 h-24 w-12" />
          <WaxSeal size={104} tone="green" animate><Gift className="h-11 w-11" strokeWidth={1.7} aria-hidden="true" /></WaxSeal>
        </div>
      }
    />
  );
}

/** The loading state: the robin turning a page. */
export function RobinTurningPage({ line = "Finding the perfect gifts for you…" }: { line?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="relative w-36">
        <Robin pose="perched" title="" className="dy-flip" />
      </div>
      <p className="dy-hand dy-on-wood text-[1.6rem]">{line}</p>
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => <span key={i} className="dy-dot-load" style={{ ["--d" as string]: `${i * 0.2}s` }} />)}
      </div>
    </div>
  );
}
