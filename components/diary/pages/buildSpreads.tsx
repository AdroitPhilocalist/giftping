import type { HomeBookData } from "@/lib/diary/home-book";
import type { SpreadDef } from "../flip/DiaryBook";
import { AgendaPage, CalendarPage } from "./MonthPages";
import { IdeasPage, IdeasRestPage } from "./IdeasPage";
import { BackCoverPage, LogPage } from "./LogPages";
import { AddPersonPage, PEOPLE_PER_PAGE, PeoplePage } from "./PeoplePages";
import { ReviewPage, ScorePage } from "./ScoreReviewPages";
import { FrontLeftPage, FrontRightPage } from "./FrontPages";
import { YearMonthsPage } from "./YearPages";
import { diaryPersonHref } from "@/lib/diary/links";
import { PersonCardData } from "@/lib/diary/ui-types";

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/**
 * The pages of the diary, in order, two to a spread:
 *   1–2   The front spread — everything in small: what is coming up, a few ideas | gifting score, this month, your people
 *   3–4   This month: the calendar  |  the next sixty days
 *   5–6   Gift ideas for the next two moments
 *   7…    My people: six to a page — a new page appears as people are added
 *   …     The year ahead: January–June | July–December
 *   …     Gifting score  |  your gifting year (and a way to share it)
 *   …     The gift log  |  the inside of the back cover
 * Each small piece on the front spread has a "see more" that turns to its full page below.
 */
export function buildHomeSpreads(name: string, d: HomeBookData, themeId?: string, options: { preview?: boolean } = {}): SpreadDef[] {
  const { preview = false } = options;
  const moreHref = (set: (typeof d.ideaSets)[number]) => (preview ? diaryPersonHref(set.contactId, true, set.eventId) : set.moreHref);
  const peoplePages = chunk<PersonCardData>(d.people, PEOPLE_PER_PAGE);
  const peopleRight: React.ReactNode[] = peoplePages.map((people, i) => <PeoplePage key={i} people={people} first={i === 0} total={d.people.length} options={d.options} themeId={themeId} preview={preview} />);
  if (peopleRight.length % 2 === 1) peopleRight.push(<AddPersonPage key="add" options={d.options} />);
  const peopleSpreadCount = Math.max(1, peopleRight.length / 2);

  const spreads: SpreadDef[] = [
    {
      id: "today", tab: "today", label: "Today",
      left: <FrontLeftPage name={name} moments={d.moments} plans={d.plans} ideaSet={d.ideaSets[0]} options={d.options} themeId={themeId} preview={preview} />,
      right: <FrontRightPage today={d.today} marks={d.marks} score={d.score} streak={d.streak} summary={d.summary} people={d.people} themeId={themeId} preview={preview} />,
    },
    {
      id: "month", tab: "month", label: "This month",
      left: <CalendarPage today={d.today} marks={d.marks} preview={preview} />,
      right: <AgendaPage moments={d.moments} options={d.options} themeId={themeId} preview={preview} />,
    },
    {
      id: "ideas", tab: "ideas", label: "Gift ideas",
      left: d.ideaSets[0] ? <IdeasPage who={d.ideaSets[0].who} ideas={d.ideaSets[0].ideas} moreHref={moreHref(d.ideaSets[0])} /> : <IdeasRestPage title="Every moment is sorted" line="Nothing coming up needs a gift right now." />,
      right: d.ideaSets[1] ? <IdeasPage who={d.ideaSets[1].who} ideas={d.ideaSets[1].ideas} moreHref={moreHref(d.ideaSets[1])} /> : <IdeasRestPage />,
    },
    ...Array.from({ length: peopleSpreadCount }, (_, i): SpreadDef => ({
      id: i === 0 ? "people" : `people-${i + 1}`, tab: "people", label: "My people",
      left: peopleRight[i * 2] ?? <AddPersonPage options={d.options} />,
      right: peopleRight[i * 2 + 1] ?? <AddPersonPage options={d.options} />,
    })),
    {
      id: "year", tab: "year", label: "The year ahead",
      left: <YearMonthsPage year={d.year} today={d.today} months={d.months} half={0} themeId={themeId} summary={d.summary} preview={preview} />,
      right: <YearMonthsPage year={d.year} today={d.today} months={d.months} half={1} themeId={themeId} preview={preview} />,
    },
    {
      id: "gifting", tab: "gifting", label: "Gifting score",
      left: <ScorePage score={d.score} streak={d.streak} summary={d.summary} year={d.year} />,
      right: <ReviewPage year={d.year} review={d.review} people={d.reviewPeople} themeId={themeId} preview={preview} />,
    },
    {
      id: "log", tab: "log", label: "The gift log",
      left: <LogPage gifts={d.log} themeId={themeId} preview={preview} />,
      right: <BackCoverPage options={d.options} year={d.year} preview={preview} />,
    },
  ];
  return spreads;
}
