"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarMarks } from "@/lib/diary/ui-types";
import { daysInMonth, formatISODate, parseISODate } from "@/lib/diary/recurrence";
import { OccasionSticker } from "./art/OccasionSticker";
import { cn } from "@/lib/utils/cn";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * A month drawn on the paper: days with a special date are circled in blush with a copper dot, today wears a small ribbon, and tapping a
 * marked day lists what's on it (with a link to each person). Month arrows move within a year either side of today. The marks are computed on
 * the server for that whole window and passed in, so moving between months needs no network round-trip.
 */
export function PaperCalendar({ today, marks, className, compact = false, hintExtra }: { today: string; marks: CalendarMarks; className?: string; compact?: boolean; /** compact only: something to sit after the "tap a circled day" hint (a link to the full month) */ hintExtra?: React.ReactNode }) {
  const t = parseISODate(today)!;
  const [cursor, setCursor] = useState({ year: t.year, month: t.month });
  const [picked, setPicked] = useState<string | null>(null);

  const monthIndex = (y: number, m: number) => y * 12 + (m - 1);
  const offset = monthIndex(cursor.year, cursor.month) - monthIndex(t.year, t.month);
  const move = (delta: number) => {
    const idx = monthIndex(cursor.year, cursor.month) + delta;
    setCursor({ year: Math.floor(idx / 12), month: (idx % 12) + 1 });
    setPicked(null);
  };

  const cells = useMemo(() => {
    const leading = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay();
    return [...Array<number | null>(leading).fill(null), ...Array.from({ length: daysInMonth(cursor.year, cursor.month) }, (_, i) => i + 1)];
  }, [cursor]);

  const pickedMarks = picked ? marks[picked] ?? [] : [];

  return (
    <div className={cn(compact && "dy-cal--compact", className)}>
      <div className={cn("flex items-center justify-center", compact ? "gap-2" : "gap-3")}>
        <button type="button" onClick={() => move(-1)} disabled={offset <= -12} aria-label="Previous month" className="dy-cal-arrow"><ChevronLeft className="h-4 w-4" /></button>
        <p className={cn("dy-hand text-[var(--gp-copper)]", compact ? "text-[1.4rem]" : "text-[1.6rem]")} aria-live="polite">{MONTHS[cursor.month - 1]} {cursor.year}</p>
        <button type="button" onClick={() => move(1)} disabled={offset >= 12} aria-label="Next month" className="dy-cal-arrow"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="dy-cal-grid mt-2">
        {WEEKDAYS.map((d) => <span key={d} className="dy-cap pb-1" aria-hidden="true">{d}</span>)}
        {cells.map((day, i) => {
          if (day === null) return <span key={`b${i}`} />;
          const iso = formatISODate(cursor.year, cursor.month, day);
          const on = marks[iso];
          const isToday = iso === today;
          const label = on?.length ? `${day} ${MONTHS[cursor.month - 1]}: ${on.map((m) => m.label).join(", ")}` : `${day} ${MONTHS[cursor.month - 1]}`;
          if (!on?.length) {
            return <span key={iso} className="dy-cal-day" data-today={isToday || undefined} aria-current={isToday ? "date" : undefined}>{day}</span>;
          }
          return (
            <button key={iso} type="button" className="dy-cal-day" data-moment="true" data-today={isToday || undefined} aria-current={isToday ? "date" : undefined} aria-label={label} aria-pressed={picked === iso} onClick={() => setPicked(picked === iso ? null : iso)}>
              {day}
            </button>
          );
        })}
      </div>
      <div className={cn(compact ? "mt-1.5 min-h-[1.5rem]" : "mt-3 min-h-[1.5rem]", pickedMarks.length === 0 && !compact && "hidden")} role="status">
        {pickedMarks.length === 0 && compact ? <p className="dy-cap text-center">Tap a circled day{hintExtra ? <> · {hintExtra}</> : null}</p> : null}
        <ul className="space-y-1">
          {(compact ? pickedMarks.slice(0, 1) : pickedMarks).map((m, i) => (
            <li key={`${m.contactId}-${i}`}>
              <Link href={`/diary/people/${m.contactId}`} className="dy-hand inline-flex items-center gap-2 text-[1.25rem] text-[var(--dy-ink)] hover:text-[var(--gp-copper)]">
                <OccasionSticker type={m.eventType} className="h-6 w-6" />
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
        {compact && pickedMarks.length > 1 ? <p className="dy-cap text-center">and {pickedMarks.length - 1} more that day</p> : null}
      </div>
    </div>
  );
}
