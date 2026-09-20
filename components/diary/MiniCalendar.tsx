import { daysInMonth, parseISODate, type ISODate } from "@/lib/diary/recurrence";
import { calendarMarks, type Moment } from "@/lib/diary/view";
import { cn } from "@/lib/utils/cn";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A month grid (Sunday-first) with a dot on every day that has an occasion. Server-rendered, no dependencies. */
export function MiniCalendar({ today, moments }: { today: ISODate; moments: Moment[] }) {
  const { year, month, day: todayDay } = parseISODate(today)!;
  const marks = calendarMarks(moments, year, month);
  const leading = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: (number | null)[] = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1)];

  return (
    <section aria-labelledby="cal-heading" className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-5">
      <h2 id="cal-heading" className="font-heading text-lg text-brand-dark">{MONTHS[month - 1]} {year}</h2>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-xs">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="pb-1 text-brand-dark/40">{d}</span>)}
        {cells.map((day, i) => {
          if (day === null) return <span key={`b${i}`} />;
          const on = marks.get(day);
          return (
            <span
              key={day}
              title={on?.map((m) => `${m.contact.name} — ${m.event.title ?? m.event.event_type}`).join(", ")}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full",
                day === todayDay && "bg-brand-primary text-brand-light",
                day !== todayDay && on && "bg-brand-accent font-medium text-brand-dark",
                day !== todayDay && !on && "text-brand-dark/70",
              )}
            >
              {day}
              {on ? <span className={cn("absolute bottom-0.5 h-1 w-1 rounded-full", day === todayDay ? "bg-brand-secondary" : "bg-brand-secondary-dark")} /> : null}
            </span>
          );
        })}
      </div>
    </section>
  );
}
