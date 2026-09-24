import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { Book } from "@/components/diary/book/Book";
import { DiaryDesk } from "@/components/diary/book/DiaryDesk";
import { SectionTitle } from "@/components/diary/book/SectionTitle";
import { Corner } from "@/components/diary/Corner";
import { AddDateButton, AddPersonButton } from "@/components/diary/forms/DiaryDialogs";
import { HeartDoodle } from "@/components/diary/art/Doodles";
import { MemoNote } from "@/components/diary/MemoNote";
import { PeopleBrowser } from "@/components/diary/PeopleBrowser";
import { requireRole } from "@/lib/auth/session";
import { getDiaryRows } from "@/lib/db/diary";
import { toPersonCards } from "@/lib/diary/page-data";
import { localDateIn } from "@/lib/diary/recurrence";
import { buildDiaryView } from "@/lib/diary/view";
import { signedDiaryPhotoUrls } from "@/lib/storage/diary-photos";
import { getActiveTheme } from "@/lib/theme/active";

export const metadata = { title: "My people — GiftPing" };

export default async function DiaryPeoplePage() {
  const user = await requireRole("customer", "vendor", "admin");
  const [rows, theme] = await Promise.all([getDiaryRows(user.id), getActiveTheme()]);
  if (rows.contacts.length === 0) redirect("/diary");
  const view = buildDiaryView({ contacts: rows.contacts, events: rows.events, gifts: rows.gifts, today: localDateIn(rows.timezone), });
  const photoUrls = await signedDiaryPhotoUrls(rows.contacts.map((c) => c.photo_url));
  const people = toPersonCards(rows.contacts, view.nextByContact, photoUrls);
  const options = rows.contacts.map((c) => ({ id: c.id, name: c.name }));

  return (
    <DiaryDesk>
      <Book
        current="people"
        leftLabel="Everyone in your diary"
        rightLabel="A note"
        left={
          <>
            <Corner at="bl" variant="daisy" />
            <header className="flex flex-wrap items-end justify-between gap-3">
              <h1 className="dy-title" style={{ fontSize: "clamp(2.6rem, 4.2vw, 3.6rem)" }}>My people <HeartDoodle className="align-top text-[0.3em]" /></h1>
              <div className="flex flex-wrap gap-2"><AddPersonButton /><AddDateButton people={options} /></div>
            </header>
            <p className="dy-sub mt-2">{people.length} {people.length === 1 ? "person" : "people"} who make life more special</p>
            <PeopleBrowser people={people} themeId={theme.id} />
          </>
        }
        right={
          <>
            <SectionTitle icon={<Users />} rule={false}>A little note</SectionTitle>
            <MemoNote className="mt-6" tilt={-1.5}>The best gifts come from a remembering heart</MemoNote>
            <p className="dy-hand mt-8 max-w-sm text-[1.35rem] leading-[1.15] text-[var(--dy-ink-soft)]">Open anyone to see their dates, what they love, gift ideas picked for them and everything you&apos;ve given. Add a photo to make their page feel like them.</p>
            <Corner at="br" variant="wild" size="h-32 w-16" />
          </>
        }
      />
    </DiaryDesk>
  );
}
