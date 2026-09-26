import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { CalendarMarks, MomentCardData } from "@/lib/diary/ui-types";
import { daysLabel } from "@/lib/diary/present";
import { OccasionSticker } from "../art/OccasionSticker";
import { RobinSleeping } from "../EmptyStates";
import { MemoNote } from "../MemoNote";
import { PaperCalendar } from "../PaperCalendar";
import { AddDateButton, type PersonOption } from "../forms/DiaryDialogs";
import { PageHeading } from "./PageBits";
import { Check } from "lucide-react";

/** The month, drawn large enough to write on: tap a marked day to see who it is. */
export function CalendarPage({ today, marks }: { today: string; marks: CalendarMarks }) {
  return (
    <div className="flex h-full flex-col">
      <PageHeading sub="Tap a circled day to see who it is for">This Month</PageHeading>
      <PaperCalendar today={today} marks={marks} className="mt-4" />
      <MemoNote className="dy-hide-short mt-auto max-w-[17rem] self-end" tilt={2}>Small moments, big happiness</MemoNote>
    </div>
  );
}

/** The next sixty days as a list, nearest first — the planner page. */
export function AgendaPage({ moments, options, themeId }: { moments: MomentCardData[]; options: PersonOption[]; themeId?: string }) {
  const shown = moments.slice(0, 7);
  return (
    <div className="flex h-full flex-col">
      <PageHeading sub={moments.length ? `${moments.length} ${moments.length === 1 ? "moment" : "moments"} in the next 60 days` : undefined} action={<AddDateButton people={options} />}>Coming Up</PageHeading>
      {shown.length === 0 ? (
        <div className="mt-6"><RobinSleeping title="Nothing in the next 60 days" line="Relax! You're all caught up." /></div>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {shown.map((m) => (
            <li key={m.key}>
              <Link href={`/diary/people/${m.contactId}?event=${m.eventId}#plan`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--dy-blush)_40%,transparent)]">
                <OccasionSticker type={m.eventType} themeId={themeId} className="h-10 w-10 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="dy-hand-b block truncate text-[1.45rem] leading-[1.05]">{m.title}</span>
                  <span className="dy-cap block leading-[1.1]">{m.dateLabel}</span>
                </span>
                {m.handled ? <span className="dy-hand inline-flex items-center gap-1 text-[1.1rem] text-[var(--gp-primary)]"><Check className="h-4 w-4" aria-hidden="true" /> Sorted</span> : null}
                <span className="dy-marker dy-hand-b !text-[1.2rem]" style={{ ["--mark" as string]: m.daysAway <= 7 ? "var(--dy-blush)" : "var(--dy-mustard)" }}>{m.daysAway <= 0 ? "Today!" : daysLabel(m.daysAway)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {moments.length > shown.length ? <p className="dy-hand mt-2 flex items-center gap-1.5 text-[1.15rem] text-[var(--dy-ink-soft)]"><CalendarDays className="h-4 w-4" aria-hidden="true" /> and {moments.length - shown.length} more — see the calendar</p> : null}
    </div>
  );
}
