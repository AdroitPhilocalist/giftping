import { countdownPhase, ribbonPercent } from "@/lib/diary/countdown";
import { Bow } from "./art/Bow";
import { cn } from "@/lib/utils/cn";

/**
 * "12 days to Mom's birthday" drawn as a gift ribbon pulling tighter the closer the date gets — the same idea as the shop's free-delivery ribbon, just
 * counting down days instead of rupees. `size="lg"` is the ticket/plan-header size; `"sm"` fits inline on a date card. On the day itself the ribbon is
 * fully cinched and a small burst of paper confetti plays once (a plain CSS animation — the site-wide reduced-motion rule already neutralises it).
 * Pure presentation: `daysAway` in, nothing computed here that `lib/diary/countdown.ts` doesn't already do and test.
 */
export function DateRibbon({ daysAway, label, size = "lg", className }: { daysAway: number; label: string; size?: "lg" | "sm"; className?: string }) {
  const phase = countdownPhase(daysAway);
  const pct = ribbonPercent(daysAway);
  return (
    <span className={cn("dy-count-ribbon", `dy-count-ribbon--${size}`, phase === "today" && "dy-count-ribbon--today", className)} role="img" aria-label={daysAway <= 0 ? "Today" : label}>
      {phase === "today" ? (
        <span className="dy-confetti" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => <i key={i} />)}
        </span>
      ) : null}
      <span className="dy-count-track" aria-hidden="true">
        <span className="dy-count-fill" style={{ width: `${pct}%` }} />
        <span className="dy-count-bow" style={{ left: `clamp(0.6rem, ${pct}%, calc(100% - 0.6rem))` }}><Bow /></span>
      </span>
      <span className="dy-count-label dy-hand-b" aria-hidden="true">{label}</span>
    </span>
  );
}
