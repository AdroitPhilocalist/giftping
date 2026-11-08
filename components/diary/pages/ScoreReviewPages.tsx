import Link from "next/link";
import { Gift, Users } from "lucide-react";
import { diaryPersonHref, diaryReviewHref } from "@/lib/diary/links";
import { occasionPlural, tiltFor } from "@/lib/diary/present";
import type { GiftingScore } from "@/lib/diary/gifting-score";
import type { YearReview, YearSummary } from "@/lib/diary/memories";
import { HeartDoodle } from "../art/Doodles";
import { OccasionSticker } from "../art/OccasionSticker";
import { Polaroid } from "../book/Polaroid";
import { MemoNote } from "../MemoNote";
import { ScoreSeal } from "../ScoreSeal";
import { StreakBadge } from "../StreakBadge";
import { ShareYearButton } from "../review/ShareYearButton";
import { shareTextFor, type ReviewPerson } from "../review/ReviewSpread";
import { PageHeading } from "./PageBits";

/** Your Gifting Score in wax, what it is made of, and how the year is going. */
export function ScorePage({ score, streak, summary, year }: { score: GiftingScore; streak: number; summary: YearSummary; year: number }) {
  return (
    <div className="flex h-full flex-col">
      <ScoreSeal score={score} streak={streak} />
      <div className="dy-note dy-note--cream mt-auto px-5 py-4" style={{ ["--torn" as string]: "var(--dy-torn-2)", ["--tilt" as string]: "-1deg" }}>
        <span className="dy-tape dy-tape--mustard" style={{ top: "-0.55rem", left: "1.2rem" }} aria-hidden="true" />
        <p className="dy-hand-b text-[1.4rem] leading-none">{year} so far</p>
        <ul className="dy-hand mt-1 grid grid-cols-3 gap-2 text-[1.1rem] leading-[1.05]">
          <li><span className="dy-num block text-[2.2rem]">{summary.total}</span>moments</li>
          <li><span className="dy-num block text-[2.2rem] text-[var(--gp-primary)]">{summary.remembered}</span>remembered <HeartDoodle /></li>
          <li><span className="dy-num block text-[2.2rem] text-[var(--gp-copper-dark)]">{summary.toGo}</span>to go</li>
        </ul>
      </div>
      <div className="dy-hide-tiny mt-3 flex justify-center">{streak >= 3 ? <StreakBadge count={streak} compact /> : <MemoNote tilt={1.5}>Remember three special days in a row and a badge appears</MemoNote>}</div>
    </div>
  );
}

/** The year in review: a few numbers, the people who made it special, and a way to share it (numbers only). */
export function ReviewPage({ year, review, people, themeId, preview = false }: { year: number; review: YearReview; people: ReviewPerson[]; themeId?: string; preview?: boolean }) {
  const fav = review.favouriteOccasion;
  const empty = review.giftsGiven === 0 && review.momentsRemembered === 0;
  return (
    <div className="flex h-full flex-col">
      <PageHeading sub="So many beautiful moments, and many more to come">Your Gifting Year</PageHeading>
      {empty ? (
        <MemoNote className="mt-8" tilt={-1.5}>This year is just beginning — log the gifts you give and they will gather here</MemoNote>
      ) : (
        <>
          <ul className="mt-5 grid grid-cols-3 gap-3">
            {[
              { icon: <Gift className="h-6 w-6" strokeWidth={1.5} />, n: review.momentsRemembered, l: review.momentsRemembered === 1 ? "moment remembered" : "moments remembered", tone: "dy-note--cream" },
              { icon: <Users className="h-6 w-6" strokeWidth={1.5} />, n: review.peopleMadeHappy, l: review.peopleMadeHappy === 1 ? "person made happy" : "people made happy", tone: "dy-note--peach" },
              { icon: fav ? <OccasionSticker type={fav.type} themeId={themeId} className="h-8 w-8" /> : <Gift className="h-6 w-6" strokeWidth={1.5} />, n: fav ? occasionPlural(fav.type) : "—", l: "favourite occasion", tone: "dy-note--sage" },
            ].map((s, i) => (
              <li key={s.l}>
                <div className={`dy-note ${s.tone} h-full px-3 py-3 text-center`} style={{ ["--torn" as string]: `var(--dy-torn-${i + 1})`, ["--tilt" as string]: `${[-1.2, 0.8, -0.6][i]}deg` }}>
                  <span className="dy-tape dy-tape--blush" style={{ top: "-0.5rem", left: "30%" }} aria-hidden="true" />
                  <span className="flex justify-center text-[var(--gp-copper)]">{s.icon}</span>
                  <span className={`dy-num block ${typeof s.n === "number" ? "text-[2.4rem]" : "text-[1.5rem] leading-[2.4rem]"}`}>{s.n}</span>
                  <span className="dy-hand block text-[1.05rem] leading-[1.05]">{s.l}</span>
                </div>
              </li>
            ))}
          </ul>
          {people.length > 0 ? (
            <div className="dy-hide-short mt-6">
              <p className="dy-hand-b text-[1.4rem] leading-none">The people who made {year} special <HeartDoodle className="text-[0.6em]" /></p>
              <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-4">
                {people.slice(0, 5).map((p, i) => <li key={p.id} className="w-[5.6rem] shrink-0"><Polaroid href={diaryPersonHref(p.id, preview)} name={p.name} photoUrl={p.photoUrl} tilt={tiltFor(i, 2.4)} tape={i % 2 ? "sage" : "blush"} caption={<span className="!text-[1.05rem]">{p.name}</span>} className="[--photo-ratio:1/1] !p-1 !pb-0.5" /></li>)}
              </ul>
            </div>
          ) : null}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            <ShareYearButton text={shareTextFor(review)} title="My gifting year" />
            <Link href={diaryReviewHref(year, preview)} className="dy-link">See the whole year →</Link>
          </div>
        </>
      )}
    </div>
  );
}
