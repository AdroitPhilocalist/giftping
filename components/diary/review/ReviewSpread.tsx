import Link from "next/link";
import { Gift, Users } from "lucide-react";
import { Robin } from "@/components/art/Robin";
import { occasionPlural, tiltFor } from "@/lib/diary/present";
import type { YearReview } from "@/lib/diary/memories";
import { Book } from "../book/Book";
import { Corner } from "../Corner";
import { HeartDoodle } from "../art/Doodles";
import { OccasionSticker } from "../art/OccasionSticker";
import { Sprig } from "../art/Sprig";
import { Polaroid } from "../book/Polaroid";
import { SectionTitle } from "../book/SectionTitle";
import { StreakBadge } from "../StreakBadge";
import { ShareYearButton } from "./ShareYearButton";

export interface ReviewPerson {
  id: string;
  name: string;
  photoUrl: string | null;
  /** a word for the share card that doesn't identify them ("Mother"), or null */
  relationship: string | null;
}

export function shareTextFor(review: YearReview): string {
  const parts = [`${review.momentsRemembered} ${review.momentsRemembered === 1 ? "moment" : "moments"} remembered`, `${review.peopleMadeHappy} ${review.peopleMadeHappy === 1 ? "person" : "people"} made happy`];
  if (review.favouriteOccasion) parts.push(`favourite occasion: ${occasionPlural(review.favouriteOccasion.type).toLowerCase()}`);
  return `My gifting year on GiftPing — ${parts.join(", ")}.`;
}

function Stat({ icon, number, label, tone, tilt, delay }: { icon: React.ReactNode; number: React.ReactNode; label: string; tone: string; tilt: number; delay: number }) {
  return (
    <li className="dy-in" style={{ ["--in-delay" as string]: `${delay}ms` }}>
      <div className={`dy-note ${tone} flex h-full items-center gap-3 px-4 py-4`} style={{ ["--tilt" as string]: `${tilt}deg`, ["--torn" as string]: "var(--dy-torn-2)" }}>
        <span className="dy-tape dy-tape--blush" style={{ top: "-0.55rem", left: "18%" }} aria-hidden="true" />
        <span className="shrink-0 text-[var(--gp-copper)]" aria-hidden="true">{icon}</span>
        <p className="dy-hand text-[1.25rem] leading-[1.05]"><span className="dy-num block text-[2.8rem]">{number}</span>{label}</p>
      </div>
    </li>
  );
}

/** "Your gifting year": what the diary remembers of the year — the numbers, the people, a card to share — and a way into the next one. */
export function ReviewSpread({ year, review, streak, people, isCurrentYear, themeId }: { year: number; review: YearReview; streak: number; people: ReviewPerson[]; isCurrentYear: boolean; themeId?: string }) {
  const empty = review.giftsGiven === 0 && review.momentsRemembered === 0;
  const fav = review.favouriteOccasion;
  return (
    <Book
      current="review"
      leftLabel={`Your gifting year ${year}`}
      rightLabel="A card to share"
      left={
        <>
          <Corner at="bl" variant="daisy" />
          <Sprig variant="daisy" className="absolute -left-1 top-3 hidden h-32 w-[4.5rem] sm:block" />
          <header className="relative sm:pl-14">
            <h1 className="dy-title dy-in" style={{ fontSize: "clamp(2.6rem, 4.6vw, 4rem)" }}>{isCurrentYear ? "Your gifting year" : `Your ${year}`} <HeartDoodle className="align-top text-[0.3em]" /></h1>
            <p className="dy-in mt-3" style={{ ["--in-delay" as string]: "120ms" }}><span className="dy-marker dy-sub">So many beautiful moments, and many more to come.</span></p>
            <p className="dy-cap mt-2">{year}</p>
          </header>

          {empty ? (
            <div className="dy-note dy-note--cream mt-8 flex flex-col items-center gap-2 px-6 py-8 text-center" style={{ ["--torn" as string]: "var(--dy-torn-1)" }}>
              <Robin pose="peeking" title="" className="w-28" />
              <p className="dy-hand-b text-[1.7rem] leading-[1.05]">This year is just beginning</p>
              <p className="dy-hand max-w-sm text-[1.25rem] leading-[1.15] text-[var(--dy-ink-soft)]">Log the gifts you give and the moments you remember — they&apos;ll gather here, ready for you to look back on.</p>
              <Link href="/diary" className="dy-btn dy-btn--copper mt-2">Back to my diary <span aria-hidden="true">→</span></Link>
            </div>
          ) : (
            <>
              <ul className="mt-8 grid gap-4 sm:grid-cols-3">
                <Stat icon={<Gift className="h-8 w-8" strokeWidth={1.5} />} number={review.momentsRemembered} label={review.momentsRemembered === 1 ? "moment remembered" : "moments remembered"} tone="dy-note--cream" tilt={-1.2} delay={200} />
                <Stat icon={<Users className="h-8 w-8" strokeWidth={1.5} />} number={review.peopleMadeHappy} label={review.peopleMadeHappy === 1 ? "person made happy" : "people made happy"} tone="dy-note--peach" tilt={0.8} delay={300} />
                <Stat
                  icon={fav ? <OccasionSticker type={fav.type} themeId={themeId} className="h-10 w-10" /> : <Gift className="h-8 w-8" strokeWidth={1.5} />}
                  number={<span className="text-[1.55rem] leading-[1.6]">{fav ? occasionPlural(fav.type) : "—"}</span>}
                  label="Favourite occasion"
                  tone="dy-note--sage"
                  tilt={-0.6}
                  delay={400}
                />
              </ul>

              <section aria-labelledby="who-h" className="mt-9">
                <SectionTitle id="who-h">The people who made my year special</SectionTitle>
                {people.length === 0 ? (
                  <p className="dy-hand mt-4 text-[1.3rem] text-[var(--dy-ink-soft)]">Log a gift for someone and they&apos;ll appear here.</p>
                ) : (
                  <ul className="mt-6 grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-5">
                    {people.map((p, i) => (
                      <li key={p.id} className="dy-in" style={{ ["--in-delay" as string]: `${420 + i * 80}ms` }}>
                        <Polaroid href={`/diary/people/${p.id}`} name={p.name} photoUrl={p.photoUrl} tilt={tiltFor(i, 2.2)} tape={i % 2 ? "sage" : "blush"} caption={p.name} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <p className="dy-hand mt-8 max-w-md text-[1.35rem] leading-[1.12] text-[var(--dy-ink-soft)]">Here&apos;s to more gifts, more people and more moments that matter. <HeartDoodle /></p>
            </>
          )}
        </>
      }
      right={
        <>
          {empty ? null : (
            <div className="relative mx-auto mt-6 max-w-[24rem]">
              <div className="pointer-events-none absolute -top-[4.6rem] left-1/2 z-[3] w-32 -translate-x-1/2" aria-hidden="true"><div className="dy-bob"><Robin pose="celebrating" title="" /></div></div>
              <div className="dy-note dy-note--cream px-6 pb-6 pt-12 text-center" style={{ ["--torn" as string]: "var(--dy-torn-4)", ["--tilt" as string]: "1.6deg" }} aria-label="A card you can share">
                <span className="dy-tape dy-tape--mustard" style={{ top: "-0.5rem", left: "12%" }} aria-hidden="true" />
                <p className="dy-hand-b text-[2.3rem] leading-none">My gifting year {year} <HeartDoodle className="text-[0.5em]" /></p>
                <p className="dy-marker dy-hand mt-2 !text-[1.2rem]">So many beautiful moments</p>
                <ul className="mt-5 grid grid-cols-3 gap-2">
                  <li><span className="dy-num block text-[2.4rem]">{review.momentsRemembered}</span><span className="dy-hand block text-[1.05rem] leading-[1]">moments remembered</span></li>
                  <li><span className="dy-num block text-[2.4rem]">{review.peopleMadeHappy}</span><span className="dy-hand block text-[1.05rem] leading-[1]">people made happy</span></li>
                  <li><span className="dy-num block text-[1.6rem] leading-[2.4rem]">{fav ? occasionPlural(fav.type) : "—"}</span><span className="dy-hand block text-[1.05rem] leading-[1]">favourite occasion</span></li>
                </ul>
                {people.length > 0 ? (
                  <ul className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
                    {people.slice(0, 5).map((p, i) => (
                      <li key={p.id}><Polaroid name={p.relationship ?? "♥"} tilt={tiltFor(i, 3)} tape="none" caption={<span className="!text-[0.95rem]">{p.relationship ?? ""}</span>} className="w-[3.4rem] !p-1 !pb-0.5" /></li>
                    ))}
                  </ul>
                ) : null}
                {streak >= 3 ? <StreakBadge count={streak} compact className="mt-5 justify-center text-left" /> : null}
                <p className="dy-cap mt-4 tracking-widest">GIFTPING</p>
              </div>
            </div>
          )}
          <div className="mx-auto mt-8 flex max-w-[24rem] flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            {empty ? null : <ShareYearButton text={shareTextFor(review)} title="My gifting year" />}
            <Link href={`/diary/year?year=${year + 1}`} className="dy-btn dy-btn--lg dy-btn--paper">Plan next year <span aria-hidden="true">→</span></Link>
          </div>
          <Corner at="br" variant="wild" size="h-28 w-14" />
        </>
      }
    />
  );
}
