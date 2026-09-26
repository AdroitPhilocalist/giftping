import Link from "next/link";
import type { CSSProperties } from "react";
import type { MonthData } from "@/lib/diary/page-data";
import { OccasionSticker } from "../art/OccasionSticker";
import { tiltFor } from "@/lib/diary/present";
import { cn } from "@/lib/utils/cn";

const NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

/** One month of the year, drawn small: marked days are circled with the occasion's sticker in the corner; this month wears a ribbon and today a ring. */
export function MonthCard({ data, year, today, index, themeId }: { data: MonthData; year: number; today: string; index: number; themeId?: string }) {
  const [ty, tm, td] = today.split("-").map(Number);
  const isThisMonth = ty === year && tm === data.month;
  const cells: (number | null)[] = [...Array<number | null>(data.leading).fill(null), ...Array.from({ length: data.days }, (_, i) => i + 1)];
  const count = Object.values(data.marks).reduce((n, list) => n + list.length, 0);
  return (
    <section
      aria-label={`${NAMES[data.month - 1]} ${year}${count ? `, ${count} special ${count === 1 ? "day" : "days"}` : ""}`}
      className={cn("dy-note dy-note--cream relative px-3 pb-3 pt-4", isThisMonth && "dy-note--peach")}
      style={{ ["--torn" as string]: `var(--dy-torn-${(index % 4) + 1})`, ["--tilt" as string]: `${tiltFor(index, 1)}deg` } as CSSProperties}
    >
      {isThisMonth ? <span className="dy-ribbon !h-[3.4rem] !w-[1.2rem] !left-3 !top-[-0.5rem]" style={{ animation: "none" }} aria-hidden="true" /> : null}
      <h3 className="dy-hand-b text-[1.55rem] leading-none" style={{ paddingLeft: isThisMonth ? "1.6rem" : 0 }}>{NAMES[data.month - 1]}</h3>
      <div className="mt-1.5 grid grid-cols-7 gap-y-[1px] text-center" aria-hidden={count === 0 ? "true" : undefined}>
        {DOW.map((d, i) => <span key={i} className="dy-cap !text-[0.75rem] leading-4">{d}</span>)}
        {cells.map((day, i) => {
          if (day === null) return <span key={`b${i}`} />;
          const marks = data.marks[day];
          const isToday = isThisMonth && day === td;
          if (!marks?.length) return <span key={day} className={cn("dy-hand grid h-[1.3rem] place-items-center text-[0.9rem] leading-none", isToday && "rounded-full bg-[var(--gp-copper)] text-[var(--gp-on-copper)]")}>{day}</span>;
          return (
            <Link
              key={day}
              href={`/diary/people/${marks[0].contactId}`}
              title={marks.map((m) => m.label).join(" · ")}
              aria-label={`${day} ${NAMES[data.month - 1]}: ${marks.map((m) => m.label).join(", ")}`}
              className={cn("dy-hand relative grid h-[1.3rem] place-items-center rounded-full bg-[color-mix(in_srgb,var(--dy-blush)_75%,transparent)] text-[0.95rem] font-bold leading-none transition-transform hover:scale-110", isToday && "!bg-[var(--gp-copper)] text-[var(--gp-on-copper)]")}
            >
              {day}
              <OccasionSticker type={marks[0].eventType} themeId={themeId} className="absolute -right-[0.35rem] -top-[0.4rem] h-[0.9rem] w-[0.9rem]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
