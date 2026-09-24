import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import type { MonthData } from "@/lib/diary/page-data";
import type { YearSummary } from "@/lib/diary/memories";
import { Book } from "../book/Book";
import { Corner } from "../Corner";
import { HeartDoodle } from "../art/Doodles";
import { OccasionSticker, type OccasionType } from "../art/OccasionSticker";
import { MemoNote } from "../MemoNote";
import { MonthCard } from "./MonthCard";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const LEGEND: { type: OccasionType; label: string }[] = [
  { type: "birthday", label: "Birthday" }, { type: "anniversary", label: "Anniversary" }, { type: "wedding", label: "Wedding" }, { type: "housewarming", label: "Housewarming" },
  { type: "graduation", label: "Graduation" }, { type: "festival", label: "Festival" }, { type: "thank-you", label: "Thank you" }, { type: "other", label: "Other" },
];

/** "The year at a glance": twelve small months across the two pages, with how the year is going in a note at the top. */
export function YearSpread({ year, today, months, summary, themeId }: { year: number; today: string; months: MonthData[]; summary: YearSummary; themeId?: string }) {
  const thisYear = Number(today.slice(0, 4));
  return (
    <Book
      current="year"
      leftLabel={`${year}: January to June`}
      rightLabel={`${year}: July to December`}
      left={
        <>
          <Corner at="bl" variant="wild" size="h-28 w-14" />
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="dy-title" style={{ fontSize: "clamp(2.6rem, 4.2vw, 3.6rem)" }}>This Year <HeartDoodle className="align-top text-[0.3em]" /></h1>
            <nav aria-label="Change year" className="flex items-center gap-2">
              <Link href={`/diary/year?year=${year - 1}`} aria-label={`${year - 1}`} className="dy-cal-arrow"><ChevronLeft className="h-4 w-4" /></Link>
              <span className="dy-num text-[2rem]" aria-current="date">{year}</span>
              <Link href={`/diary/year?year=${year + 1}`} aria-label={`${year + 1}`} className="dy-cal-arrow"><ChevronRight className="h-4 w-4" /></Link>
              {year !== thisYear ? <Link href="/diary/year" className="dy-link ml-1">This year</Link> : null}
            </nav>
          </header>
          <div className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-stretch">
            <div className="dy-note dy-note--cream px-5 py-4" style={{ ["--torn" as string]: "var(--dy-torn-2)", ["--tilt" as string]: "-1.2deg" }}>
              <span className="dy-tape dy-tape--mustard" style={{ top: "-0.55rem", left: "1.2rem" }} aria-hidden="true" />
              <ul className="dy-hand space-y-0.5 text-[1.3rem] leading-[1.1]">
                <li><span className="dy-num text-[2.6rem]">{summary.total}</span> moments this {year === thisYear ? "year" : "year"}</li>
                <li><span className="dy-num text-[2.6rem] text-[var(--gp-primary)]">{summary.remembered}</span> remembered <HeartDoodle /></li>
                <li><span className="dy-num text-[2.6rem] text-[var(--gp-copper-dark)]">{summary.toGo}</span> to go</li>
              </ul>
            </div>
            {summary.busiest ? (
              <div className="dy-note dy-note--blush flex items-center gap-3 px-5 py-4" style={{ ["--torn" as string]: "var(--dy-torn-3)", ["--tilt" as string]: "1deg" }}>
                <BarChart3 className="h-9 w-9 shrink-0 text-[var(--gp-copper)]" strokeWidth={1.6} aria-hidden="true" />
                <p className="dy-hand text-[1.35rem] leading-[1.1]">Busiest month:<br /><span className="dy-hand-b text-[1.9rem]">{MONTH_NAMES[summary.busiest.month - 1]}</span>{summary.busiest.highlights.length ? <span className="dy-cap block !text-[1.15rem]">({summary.busiest.highlights.join(" + ")})</span> : null}</p>
              </div>
            ) : (
              <MemoNote tone="blush" tilt={1}>More moments with the people who matter</MemoNote>
            )}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6">
            {months.slice(0, 6).map((m, i) => <MonthCard key={m.month} data={m} year={year} today={today} index={i} themeId={themeId} />)}
          </div>
        </>
      }
      right={
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-1">
            {months.slice(6).map((m, i) => <MonthCard key={m.month} data={m} year={year} today={today} index={i + 6} themeId={themeId} />)}
          </div>
          <div className="mt-8" aria-label="What the little pictures mean">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {LEGEND.map((l) => <li key={l.type} className="dy-hand inline-flex items-center gap-1.5 text-[1.1rem]"><OccasionSticker type={l.type} themeId={themeId} className="h-6 w-6" /> {l.label}</li>)}
            </ul>
          </div>
          <Corner at="br" variant="daisy" size="h-28 w-14" />
        </>
      }
    />
  );
}
