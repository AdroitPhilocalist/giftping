import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { OccasionSticker } from "./art/OccasionSticker";
import { Sprig } from "./art/Sprig";
import { SectionTitle } from "./book/SectionTitle";
import { RobinSleeping } from "./EmptyStates";
import { daysLabel, tiltFor } from "@/lib/diary/present";
import type { MomentCardData } from "@/lib/diary/ui-types";
import { cn } from "@/lib/utils/cn";

const TAPES = ["blush", "sage", "mustard"] as const;
const NOTE_TONES = ["dy-note--cream", "dy-note--peach", "dy-note--sage"] as const;

/** "Next 3 special moments": torn paper tickets, tilted like they were pinned by hand. The nearest one you haven't sorted offers "Choose a gift". */
export function MomentTickets({ moments, themeId, addAction, className }: { moments: MomentCardData[]; themeId?: string; addAction?: React.ReactNode; className?: string }) {
  const shown = moments.slice(0, 3);
  const firstOpen = shown.findIndex((m) => !m.handled);
  return (
    <section aria-labelledby="moments-h" className={className}>
      <SectionTitle id="moments-h" icon={<Sparkles />}>Next {shown.length === 1 ? "special moment" : shown.length === 2 ? "2 special moments" : "3 special moments"}</SectionTitle>
      {shown.length === 0 ? (
        <div className="mt-4"><RobinSleeping title="Nothing in the next 60 days" line="Relax! You're all caught up." action={addAction} /></div>
      ) : (
        <ul className="mt-5 grid gap-5 sm:grid-cols-3">
          {shown.map((m, i) => (
            <li key={m.key} className="dy-in" style={{ ["--in-delay" as string]: `${140 + i * 110}ms` } as CSSProperties}>
              <Link
                href={`/diary/people/${m.contactId}?event=${m.eventId}#plan`}
                className={cn("dy-note block h-full min-h-[10.5rem] pb-4 pt-5", NOTE_TONES[i % 3])}
                style={{ ["--tilt" as string]: `${tiltFor(i, 1.8)}deg`, ["--torn" as string]: `var(--dy-torn-${(i % 4) + 1})` } as CSSProperties}
              >
                <span className={`dy-tape dy-tape--${TAPES[i % 3]}`} style={{ top: "-0.55rem", left: "38%", ["--tape-rot" as string]: `${i % 2 ? 5 : -5}deg` } as CSSProperties} aria-hidden="true" />
                <div className="flex items-start justify-between gap-2">
                  <OccasionSticker type={m.eventType} themeId={themeId} className="h-[2.9rem] w-[2.9rem] shrink-0" />
                  <p className="dy-cap pt-0.5 text-right leading-[1.1]">{m.dateLabel}</p>
                </div>
                <p className="dy-hand-b mt-1.5 break-words text-[1.5rem] leading-[1.02]">{m.title}</p>
                <p className="dy-num mt-2 text-[2.3rem] text-[var(--dy-ink)]">{daysLabel(m.daysAway)}{m.daysAway > 1 ? <span className="sr-only"> away</span> : null}</p>
                {m.handled ? (
                  <span className="dy-hand mt-1.5 inline-flex items-center gap-1.5 text-[1.15rem] text-[var(--gp-primary)]"><Check className="h-4 w-4" aria-hidden="true" /> Gift sorted</span>
                ) : i === firstOpen ? (
                  <span className="dy-btn dy-btn--copper dy-btn--sm mt-2">Choose a gift →</span>
                ) : (
                  <span className="dy-link mt-1.5 inline-block">Plan a gift →</span>
                )}
                <Sprig variant={i % 2 ? "wild" : "daisy"} className="absolute -bottom-1 right-0.5 h-20 w-10 opacity-80" flip={i % 2 === 1} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
