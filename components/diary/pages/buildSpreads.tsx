import type { HomeBookData } from "@/lib/diary/home-book";
import type { SpreadDef } from "../flip/DiaryBook";
import { AgendaPage, CalendarPage } from "./MonthPages";
import { ContentsPage, type ContentsEntry } from "./ContentsPage";
import { IdeasPage, IdeasRestPage } from "./IdeasPage";
import { BackCoverPage, LogPage } from "./LogPages";
import { AddPersonPage, PEOPLE_PER_PAGE, PeoplePage } from "./PeoplePages";
import { ReviewPage, ScorePage } from "./ScoreReviewPages";
import { WelcomePage } from "./WelcomePage";
import { YearMonthsPage } from "./YearPages";
import { PersonCardData } from "@/lib/diary/ui-types";

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/**
 * The pages of the diary, in order, two to a spread:
 *   1–2   Today: whose diary, what is coming up, gift plans  |  the contents
 *   3–4   This month: the calendar  |  the next sixty days
 *   5–6   Gift ideas for the next two moments
 *   7…    My people: six to a page — a new page appears as people are added
 *   …     The year ahead: January–June | July–December
 *   …     Gifting score  |  your gifting year (and a way to share it)
 *   …     The gift log  |  the inside of the back cover
 * Page numbers follow from the order, and the contents page is built from the same list — so it always matches.
 */
export function buildHomeSpreads(name: string, d: HomeBookData, themeId?: string): SpreadDef[] {
  const peoplePages = chunk<PersonCardData>(d.people, PEOPLE_PER_PAGE);
  const peopleRight: React.ReactNode[] = peoplePages.map((people, i) => <PeoplePage key={i} people={people} first={i === 0} total={d.people.length} options={d.options} themeId={themeId} />);
  if (peopleRight.length % 2 === 1) peopleRight.push(<AddPersonPage key="add" options={d.options} />);
  const peopleSpreadCount = Math.max(1, peopleRight.length / 2);

  // ids first, so the contents page can name the page each section starts on
  const ids = ["today", "month", "ideas", ...Array.from({ length: peopleSpreadCount }, (_, i) => (i === 0 ? "people" : `people-${i + 1}`)), "year", "gifting", "log"];
  const pageOf = (id: string) => ids.indexOf(id) * 2 + 1;
  const entries: ContentsEntry[] = [
    { to: "today", page: pageOf("today"), label: "Coming up & gift plans", kind: "today" },
    { to: "month", page: pageOf("month"), label: "This month", kind: "month" },
    { to: "ideas", page: pageOf("ideas"), label: "Gift ideas", kind: "ideas" },
    { to: "people", page: pageOf("people"), label: "My people", kind: "people" },
    { to: "year", page: pageOf("year"), label: "The year ahead", kind: "year" },
    { to: "gifting", page: pageOf("gifting"), label: "Gifting score & my year", kind: "gifting" },
    { to: "log", page: pageOf("log"), label: "What I've given", kind: "log" },
  ];

  const spreads: SpreadDef[] = [
    {
      id: "today", tab: "today", label: "Today",
      left: <WelcomePage name={name} moments={d.moments} plans={d.plans} options={d.options} themeId={themeId} />,
      right: <ContentsPage entries={entries} options={d.options} count={d.people.length} />,
    },
    {
      id: "month", tab: "month", label: "This month",
      left: <CalendarPage today={d.today} marks={d.marks} />,
      right: <AgendaPage moments={d.moments} options={d.options} themeId={themeId} />,
    },
    {
      id: "ideas", tab: "ideas", label: "Gift ideas",
      left: d.ideaSets[0] ? <IdeasPage who={d.ideaSets[0].who} ideas={d.ideaSets[0].ideas} moreHref={d.ideaSets[0].moreHref} /> : <IdeasRestPage title="Every moment is sorted" line="Nothing coming up needs a gift right now." />,
      right: d.ideaSets[1] ? <IdeasPage who={d.ideaSets[1].who} ideas={d.ideaSets[1].ideas} moreHref={d.ideaSets[1].moreHref} /> : <IdeasRestPage />,
    },
    ...Array.from({ length: peopleSpreadCount }, (_, i): SpreadDef => ({
      id: i === 0 ? "people" : `people-${i + 1}`, tab: "people", label: "My people",
      left: peopleRight[i * 2] ?? <AddPersonPage options={d.options} />,
      right: peopleRight[i * 2 + 1] ?? <AddPersonPage options={d.options} />,
    })),
    {
      id: "year", tab: "year", label: "The year ahead",
      left: <YearMonthsPage year={d.year} today={d.today} months={d.months} half={0} themeId={themeId} summary={d.summary} />,
      right: <YearMonthsPage year={d.year} today={d.today} months={d.months} half={1} themeId={themeId} />,
    },
    {
      id: "gifting", tab: "gifting", label: "Gifting score",
      left: <ScorePage score={d.score} streak={d.streak} summary={d.summary} year={d.year} />,
      right: <ReviewPage year={d.year} review={d.review} people={d.reviewPeople} themeId={themeId} />,
    },
    {
      id: "log", tab: "log", label: "The gift log",
      left: <LogPage gifts={d.log} themeId={themeId} />,
      right: <BackCoverPage options={d.options} year={d.year} />,
    },
  ];
  return spreads;
}
