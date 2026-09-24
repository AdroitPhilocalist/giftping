import { notFound } from "next/navigation";
import { DiaryDesk } from "@/components/diary/book/DiaryDesk";
import { FirstRun } from "@/components/diary/FirstRun";
import { HomeSpread } from "@/components/diary/HomeSpread";
import { PersonSpread } from "@/components/diary/person/PersonSpread";
import { ReviewSpread } from "@/components/diary/review/ReviewSpread";
import { YearSpread } from "@/components/diary/year/YearSpread";
import { reviewYear, summariseYear } from "@/lib/diary/memories";
import { toMonthData } from "@/lib/diary/page-data";
import { CONTACTS, EVENTS, GIFTS, IDEAS, MARKS, MOMENTS, MOM_MOMENTS, OPTIONS, PEOPLE, PLAN, SCORE, TIMELINE, TODAY } from "./fixtures";

export const metadata = { title: "Diary preview — GiftPing", robots: { index: false, follow: false } };

/** Development-only gallery of the diary screens over sample data (404s in production): ?screen=home | first | person | year | review */
export default async function DiaryPreviewPage({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { screen = "home" } = await searchParams;

  if (screen === "first") return <DiaryDesk><FirstRun firstName="Priya" /></DiaryDesk>;

  if (screen === "year") {
    const months = toMonthData(EVENTS, CONTACTS, 2026);
    return <DiaryDesk><YearSpread year={2026} today={TODAY} months={months} summary={summariseYear({ events: EVENTS, contacts: CONTACTS, gifts: GIFTS, today: TODAY, year: 2026 })} /></DiaryDesk>;
  }

  if (screen === "review") {
    const review = reviewYear({ events: EVENTS, contacts: CONTACTS, gifts: GIFTS, today: "2026-12-30", year: 2026 });
    return (
      <DiaryDesk>
        <ReviewSpread year={2026} review={{ ...review, giftsGiven: 23, peopleMadeHappy: 9, momentsRemembered: 23, favouriteOccasion: { type: "birthday", count: 9 } }} streak={5} isCurrentYear people={CONTACTS.map((c) => ({ id: c.id, name: c.name, photoUrl: null, relationship: c.relationship }))} />
      </DiaryDesk>
    );
  }

  if (screen === "person") {
    return (
      <DiaryDesk>
        <PersonSpread
          contact={CONTACTS[0]}
          photoUrl={null}
          events={EVENTS.filter((e) => e.contact_id === "1")}
          moments={MOM_MOMENTS}
          timeline={TIMELINE}
          plan={PLAN}
          ideas={IDEAS}
          ideasWho="Mom's birthday"
          pick={{ eventId: "e1", occasionDate: "2026-10-03", pickedProductId: "p1" }}
          defaultEventType="birthday"
          giftsHref="/gifts-for/parents"
        />
      </DiaryDesk>
    );
  }

  return (
    <DiaryDesk>
      <HomeSpread
        name="Priya"
        today={TODAY}
        moments={MOMENTS}
        ideas={IDEAS.slice(0, 3)}
        ideasWho="Mom's birthday"
        ideasMoreHref="/diary/people/1#ideas"
        score={SCORE}
        streak={4}
        marks={MARKS}
        people={PEOPLE}
        options={OPTIONS}
      />
    </DiaryDesk>
  );
}
