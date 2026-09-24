import { CalendarDays } from "lucide-react";
import type { GiftingScore } from "@/lib/diary/gifting-score";
import type { CalendarMarks, IdeaCardData, MomentCardData, PersonCardData } from "@/lib/diary/ui-types";
import { Book } from "./book/Book";
import { SectionTitle } from "./book/SectionTitle";
import { Corner } from "./Corner";
import { AddDateButton, AddPersonButton, type PersonOption } from "./forms/DiaryDialogs";
import { GiftIdeas } from "./GiftIdeas";
import { HomeHeader, MobileCover } from "./HomeHeader";
import { MemoNote } from "./MemoNote";
import { MomentTickets } from "./MomentTickets";
import { PaperCalendar } from "./PaperCalendar";
import { PeopleShelf } from "./PeopleShelf";
import { ScoreSeal } from "./ScoreSeal";
import { StreakBadge } from "./StreakBadge";

export interface HomeSpreadProps {
  name: string;
  today: string;
  moments: MomentCardData[];
  ideas: IdeaCardData[];
  /** "Mom's birthday" — the noun after "Gift ideas for" */
  ideasWho: string | null;
  ideasMoreHref: string | null;
  score: GiftingScore;
  streak: number;
  marks: CalendarMarks;
  people: PersonCardData[];
  options: PersonOption[];
  themeId?: string;
}

/** The diary's front page: a two-page spread (one long page on a phone). Pure layout over plain data — the page fetches, this draws. */
export function HomeSpread({ name, today, moments, ideas, ideasWho, ideasMoreHref, score, streak, marks, people, options, themeId }: HomeSpreadProps) {
  return (
    <>
      <MobileCover name={name} />
      <Book
        current="home"
        leftLabel="Special moments and gift ideas"
        rightLabel="Gifting score, calendar and people"
        left={
          <>
            <Corner at="bl" variant="daisy" />
            <HomeHeader name={name} />
            <MomentTickets moments={moments} themeId={themeId} className="mt-2 xl:mt-8" addAction={<AddDateButton people={options} />} />
            {ideas.length > 0 && ideasWho ? <GiftIdeas ideas={ideas} who={ideasWho} moreHref={ideasMoreHref ?? undefined} className="mt-9 pb-2" /> : null}
          </>
        }
        right={
          <>
            <ScoreSeal score={score} />
            {streak >= 3 ? <StreakBadge count={streak} compact className="mt-5" /> : null}
            <section aria-labelledby="cal-h" className="mt-8">
              <SectionTitle id="cal-h" icon={<CalendarDays />}>This Month</SectionTitle>
              <div className="mt-3 grid items-start gap-5 xl:grid-cols-[minmax(0,21rem)_1fr]">
                <PaperCalendar today={today} marks={marks} />
                <MemoNote className="mt-2 max-xl:hidden" tilt={2.5}>Small moments, big happiness</MemoNote>
              </div>
            </section>
            <PeopleShelf people={people} themeId={themeId} className="mt-9" actions={<><AddPersonButton /><AddDateButton people={options} /></>} />
            <Corner at="br" variant="wild" size="h-32 w-16" />
          </>
        }
      />
    </>
  );
}
