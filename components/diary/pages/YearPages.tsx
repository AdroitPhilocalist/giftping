import type { MonthData } from "@/lib/diary/page-data";
import type { YearSummary } from "@/lib/diary/memories";
import { diaryYearHref } from "@/lib/diary/links";
import { HeartDoodle } from "../art/Doodles";
import { OccasionSticker, type OccasionType } from "../art/OccasionSticker";
import { MonthCard } from "../year/MonthCard";
import { PageHeading } from "./PageBits";
import Link from "next/link";

const LEGEND: { type: OccasionType; label: string }[] = [
  { type: "birthday", label: "Birthday" }, { type: "anniversary", label: "Anniversary" }, { type: "wedding", label: "Wedding" }, { type: "housewarming", label: "Housewarming" },
  { type: "graduation", label: "Graduation" }, { type: "festival", label: "Festival" }, { type: "thank-you", label: "Thank you" }, { type: "other", label: "Other" },
];

/** Six months of the year on one page (January–June, then July–December). */
export function YearMonthsPage({ year, today, months, half, themeId, summary, preview = false }: { year: number; today: string; months: MonthData[]; half: 0 | 1; themeId?: string; summary?: YearSummary; preview?: boolean }) {
  const shown = months.slice(half * 6, half * 6 + 6);
  return (
    <div className="flex h-full flex-col">
      <PageHeading sub={half === 0 ? "January to June" : "July to December"} action={summary ? <span className="dy-hand text-[1.15rem] text-[var(--dy-ink-soft)]"><span className="dy-hand-b text-[1.5rem] text-[var(--dy-ink)]">{summary.total}</span> moments · <span className="dy-hand-b text-[1.5rem] text-[var(--gp-primary)]">{summary.remembered}</span> remembered <HeartDoodle /></span> : null}>The Year Ahead · {year}</PageHeading>
      <div className="mt-5 grid grid-cols-3 content-start gap-x-3 gap-y-5">
        {shown.map((m, i) => <MonthCard key={m.month} data={m} year={year} today={today} index={i + half * 6} themeId={themeId} preview={preview} />)}
      </div>
      {half === 1 ? (
        <div className="dy-hide-short mt-auto pt-3">
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5" aria-label="What the little pictures mean">
            {LEGEND.map((l) => <li key={l.type} className="dy-hand inline-flex items-center gap-1 text-[1.05rem]"><OccasionSticker type={l.type} themeId={themeId} className="h-5 w-5" /> {l.label}</li>)}
          </ul>
          <p className="mt-2"><Link href={diaryYearHref(year + 1, preview)} className="dy-link">Look at {year + 1} →</Link></p>
        </div>
      ) : null}
    </div>
  );
}
