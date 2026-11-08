import { BarChart3, CalendarCheck, Feather, Gift, Heart, Users } from "lucide-react";
import type { GiftingScore } from "@/lib/diary/gifting-score";
import type { IdeaSet, PlanChip } from "@/lib/diary/home-book";
import type { YearSummary } from "@/lib/diary/memories";
import { diaryPersonHref } from "@/lib/diary/links";
import { daysShort, possessive, tiltFor } from "@/lib/diary/present";
import type { CalendarMarks, MomentCardData, PersonCardData } from "@/lib/diary/ui-types";
import { HeartDoodle } from "../art/Doodles";
import { OccasionSticker } from "../art/OccasionSticker";
import { Sprig } from "../art/Sprig";
import { WaxSeal } from "../art/WaxSeal";
import { BookmarkSeal } from "../BookmarkSeal";
import { Polaroid } from "../book/Polaroid";
import { SectionTitle } from "../book/SectionTitle";
import { Corner } from "../Corner";
import { TurnLink } from "../flip/TurnLink";
import { AddDateButton, AddPersonButton, type PersonOption } from "../forms/DiaryDialogs";
import { IdeaCard } from "../GiftIdeas";
import { MemoNote } from "../MemoNote";
import { MomentTickets } from "../MomentTickets";
import { PaperCalendar } from "../PaperCalendar";
import { StreakBadge } from "../StreakBadge";

/**
 * The first two pages of the diary — the ones that greet you. Everything the diary holds is here in small: what is coming up, a few gift ideas, your gifting
 * score, this month, the people you keep. Each small piece has a way to turn to its full page ("See more →"), which is where the whole thing lives.
 * The pages are built to fit the window without scrolling: FitPage draws them a little smaller when the window is short, and lets go of the least important
 * extras (`dy-drop-1`, `dy-drop-2`) first.
 */

/** Page 1: whose diary this is, the next moments, and a few ideas for the nearest one. */
export function FrontLeftPage({ name, moments, plans, ideaSet, options, themeId, preview = false }: { name: string; moments: MomentCardData[]; plans: PlanChip[]; ideaSet?: IdeaSet; options: PersonOption[]; themeId?: string; preview?: boolean }) {
  return (
    <div className="flex h-full flex-col gap-3">
      <header className="relative pb-1 pt-1">
        <Sprig variant="daisy" className="absolute -left-2 top-2 h-28 w-[4.2rem]" />
        <div className="dy-head-pad relative pl-14 pr-[11.5rem]">
          <h1 className="dy-title dy-in dy-front-title">
            {possessive(name)}
            <br />
            Gifting Diary <HeartDoodle className="align-top text-[0.32em]" />
          </h1>
        </div>
        <p className="dy-in dy-tag-pad dy-drop-1 mt-2 pl-14 pr-[11.5rem]" style={{ ["--in-delay" as string]: "120ms" }}><span className="dy-marker dy-sub !text-[1.15rem]">Because the best gifts come from a remembering heart</span></p>
        <BookmarkSeal top="-1.35rem" className="dy-bookmark" />
      </header>

      <MomentTickets moments={moments} plans={plans} themeId={themeId} className="mt-1" addAction={<AddDateButton people={options} />} preview={preview} />

      {ideaSet ? (
        <section aria-labelledby="front-ideas-h" className="mt-auto">
          <SectionTitle id="front-ideas-h" icon={<Gift />} action={<TurnLink to="ideas">See more →</TurnLink>}>Gift ideas for {ideaSet.who}</SectionTitle>
          <ul className="dy-ideas mt-3 grid grid-cols-3 gap-4 pb-1">
            {ideaSet.ideas.slice(0, 3).map((idea, i) => (
              <li key={idea.productId} className="dy-in" style={{ ["--in-delay" as string]: `${420 + i * 100}ms` }}>
                <IdeaCard idea={idea} tilt={tiltFor(i + 2, 1.7)} tape={i % 3 === 0 ? "blush" : i % 3 === 1 ? "sage" : "mustard"} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <MemoNote className="mt-auto max-w-[21rem] self-start" tilt={-1.5}>Every date you write down is a gift you will remember to give</MemoNote>
      )}
      <Corner at="bl" variant="daisy" />
    </div>
  );
}

const FACTOR_ICONS = { preparedness: Gift, knowing: Heart, coverage: CalendarCheck, consistency: Feather } as const;

/** The gifting score, small: the wax seal, four slim bars (one per thing it is made of) and what to do next. */
function ScoreGlance({ score, streak }: { score: GiftingScore; streak: number }) {
  return (
    <section aria-labelledby="glance-score-h" className="flex items-center gap-4">
      <div className="dy-glance-seal shrink-0" role="img" aria-label={`Gifting score ${score.score} out of 100: ${score.label}`}>
        <WaxSeal size={92} animate>
          <span className="block">
            <span className="dy-num block text-[2.4rem]">{score.score}</span>
            <span className="dy-hand block text-[1rem] leading-[1]">{score.label === "Gifting pro" ? "Gifting Pro" : score.label}</span>
          </span>
        </WaxSeal>
      </div>
      <div className="min-w-0 flex-1">
        <SectionTitle id="glance-score-h" icon={<BarChart3 />} action={<>{streak >= 3 ? <StreakBadge count={streak} variant="chip" /> : null}<TurnLink to="gifting">How it&apos;s scored →</TurnLink></>}>Gifting Score</SectionTitle>
        <ul className="mt-2 grid grid-cols-4 gap-2.5">
          {score.breakdown.map((b) => {
            const Icon = FACTOR_ICONS[b.key];
            const pct = Math.round((b.points / b.max) * 100);
            return (
              <li key={b.key} title={`${b.label}: ${pct}%`}>
                <Icon className="h-[1.1rem] w-[1.1rem] text-[var(--gp-copper)]" strokeWidth={1.7} aria-hidden="true" />
                <div className="dy-bar mt-1" role="presentation"><i style={{ ["--pct" as string]: `${pct}%` }} /></div>
                <span className="sr-only">{b.label}: {pct}%</span>
              </li>
            );
          })}
        </ul>
        <p className="dy-hand mt-1.5 text-[1.2rem] leading-[1.1] text-[var(--dy-ink-soft)]">{score.nextBestAction}</p>
      </div>
    </section>
  );
}

/** "This year so far", as a scrap of paper — the same three numbers the year page gives. */
function YearScrap({ summary }: { summary: YearSummary }) {
  return (
    <div className="dy-note dy-note--peach dy-in px-4 pb-3 pt-4" style={{ ["--tilt" as string]: "2deg", ["--torn" as string]: "var(--dy-torn-2)", ["--in-delay" as string]: "300ms" }}>
      <span className="dy-tape dy-tape--mustard" style={{ top: "-0.6rem", left: "1.4rem" }} aria-hidden="true" />
      <p className="dy-hand-b text-[1.35rem] leading-[1]">{summary.year} so far</p>
      <dl className="mt-1 grid grid-cols-3 gap-1 text-center">
        {[["moments", summary.total], ["remembered", summary.remembered], ["to go", summary.toGo]].map(([label, n]) => (
          <div key={label}>
            <dd className="dy-num text-[1.9rem] leading-none text-[var(--gp-copper-dark)]">{n}</dd>
            <dt className="dy-cap leading-[1.1]">{label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

const PEOPLE_TILES = 6;

/** The people you keep: up to six polaroids with the days to their next moment; a seventh person turns the last tile into "+N more". */
function PeopleGlance({ people, themeId, preview = false }: { people: PersonCardData[]; themeId?: string; preview?: boolean }) {
  const overflow = people.length > PEOPLE_TILES;
  const shown = overflow ? people.slice(0, PEOPLE_TILES - 1) : people;
  return (
    <section aria-labelledby="glance-people-h" className="mt-auto">
      <SectionTitle id="glance-people-h" icon={<Users />} action={<><TurnLink to="people">See everyone →</TurnLink><AddPersonButton /></>}>My People</SectionTitle>
      <ul className="dy-people-glance mt-3 grid grid-cols-6 gap-x-3 pb-1">
        {shown.map((p, i) => (
          <li key={p.id} className="dy-in" style={{ ["--in-delay" as string]: `${360 + i * 70}ms` }}>
            <Polaroid
              href={diaryPersonHref(p.id, preview)}
              name={p.name}
              photoUrl={p.photoUrl}
              tilt={tiltFor(i, 2.6)}
              tape={i % 3 === 0 ? "blush" : i % 3 === 1 ? "apricot" : "sage"}
              className="dy-mini-polaroid"
              caption={<span className="block truncate">{p.name}{p.isFavorite ? <span className="text-[var(--dy-gold)]" aria-label="favourite"> ★</span> : null}</span>}
            >
              <span className="dy-hand flex items-center justify-center gap-0.5 pb-0.5 text-[0.95rem] leading-none whitespace-nowrap text-[var(--gp-copper-dark)]">
                {p.next ? <><OccasionSticker type={p.next.eventType} themeId={themeId} className="h-4 w-4" />{daysShort(p.next.daysAway)}</> : <span className="text-[var(--dy-ink-soft)]">no dates</span>}
              </span>
            </Polaroid>
          </li>
        ))}
        {overflow ? (
          <li className="flex items-center justify-center">
            <TurnLink to="people" className="dy-hand-b dy-more-tile">+{people.length - shown.length}<span className="dy-cap block">more</span></TurnLink>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/** Page 2: the gifting score, this month, and the people — small, with a way to open each. */
export function FrontRightPage({ today, marks, score, streak, summary, people, themeId, preview = false }: { today: string; marks: CalendarMarks; score: GiftingScore; streak: number; summary: YearSummary; people: PersonCardData[]; themeId?: string; preview?: boolean }) {
  return (
    <div className="relative flex h-full flex-col gap-3">
      <ScoreGlance score={score} streak={streak} />

      <section aria-label="This month" className="grid items-start gap-4 [grid-template-columns:minmax(0,17.5rem)_1fr]">
        <div>
          <PaperCalendar today={today} marks={marks} compact hintExtra={<TurnLink to="month">Open the month →</TurnLink>} preview={preview} />
        </div>
        <div className="flex flex-col gap-3 pt-4">
          <div className="dy-drop-1"><YearScrap summary={summary} /></div>
          <MemoNote className="dy-drop-2 !px-3 !py-3 !text-[1.25rem]" tilt={-2}>Small moments, big happiness</MemoNote>
        </div>
      </section>

      <PeopleGlance people={people} themeId={themeId} preview={preview} />
      <Corner at="br" variant="wild" size="h-24 w-12" className="!bottom-9" />
    </div>
  );
}
