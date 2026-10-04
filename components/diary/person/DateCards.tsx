import { CalendarDays } from "lucide-react";
import type { CSSProperties } from "react";
import { OccasionSticker } from "../art/OccasionSticker";
import { DateRibbon } from "../DateRibbon";
import { Sprig } from "../art/Sprig";
import { SectionTitle } from "../book/SectionTitle";
import { AddDateButton, EditDateButton, RemoveButton, ReminderSwitch } from "../forms/DiaryDialogs";
import { daysLabel, occasionName, tiltFor } from "@/lib/diary/present";
import { longDate } from "@/lib/diary/format";
import type { DiaryEventRow, Moment } from "@/lib/diary/view";

/** "Important dates": one torn ticket per date, with a reminder switch. The nearest one wears its countdown on a highlighter stripe. */
export function DateCards({ contactId, contactName, events, moments, themeId }: { contactId: string; contactName: string; events: DiaryEventRow[]; moments: Moment[]; themeId?: string }) {
  const byEvent = new Map(moments.map((m) => [m.event.id, m]));
  const sorted = [...events].sort((a, b) => (byEvent.get(a.id)?.daysAway ?? 1e9) - (byEvent.get(b.id)?.daysAway ?? 1e9));
  return (
    <section aria-labelledby="dates-h">
      <SectionTitle id="dates-h" icon={<CalendarDays />} action={<AddDateButton contactId={contactId} contactName={contactName} />}>Dates</SectionTitle>
      {sorted.length === 0 ? (
        <p className="dy-hand mt-4 text-[1.3rem] text-[var(--dy-ink-soft)]">No dates yet — add a birthday or anniversary and we&apos;ll remind you in time.</p>
      ) : (
        <ul className="mt-5 grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {sorted.map((e, i) => {
            const m = byEvent.get(e.id);
            return (
              <li key={e.id} className="dy-in" style={{ ["--in-delay" as string]: `${120 + i * 90}ms` }}>
                <div className={`dy-note ${["dy-note--cream", "dy-note--peach", "dy-note--sage"][i % 3]} h-full pb-3 pt-4`} style={{ ["--torn" as string]: `var(--dy-torn-${(i % 4) + 1})`, ["--tilt" as string]: `${tiltFor(i, 1.4)}deg` } as CSSProperties}>
                  <span className={`dy-tape dy-tape--${["blush", "sage", "mustard"][i % 3]}`} style={{ top: "-0.55rem", left: "42%" }} aria-hidden="true" />
                  <div className="flex items-start justify-between gap-2">
                    <OccasionSticker type={e.event_type} themeId={themeId} className="h-[2.9rem] w-[2.9rem] shrink-0" />
                    <p className="dy-cap pt-0.5 text-right leading-[1.1]">{m ? longDate(m.occurrence) : longDate(e.event_date)}{e.is_recurring ? "" : " · once"}</p>
                  </div>
                  <p className="dy-hand-b mt-1.5 break-words text-[1.5rem] leading-[1.02]">{occasionName(e.event_type, e.title)}</p>
                  {m ? (
                    <p className="mt-2"><DateRibbon daysAway={m.daysAway} label={m.daysAway <= 0 ? "Today!" : `In ${daysLabel(m.daysAway)}`} size="sm" /></p>
                  ) : <p className="dy-cap mt-2">This date has passed</p>}
                  <div className="mt-3 space-y-2">
                    <ReminderSwitch id={e.id} active={e.is_active} />
                    <span className="flex items-center gap-3">
                      <EditDateButton contactId={contactId} contactName={contactName} event={e} label={occasionName(e.event_type, e.title)} />
                      <RemoveButton kind="event" id={e.id} name={occasionName(e.event_type, e.title)} />
                    </span>
                  </div>
                  <Sprig variant={i % 2 ? "wild" : "daisy"} className="absolute -bottom-1 right-1 h-16 w-8 opacity-70" flip={i % 2 === 1} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
