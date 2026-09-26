import { Users } from "lucide-react";
import { Robin } from "@/components/art/Robin";
import { daysShort, tiltFor } from "@/lib/diary/present";
import type { PersonCardData } from "@/lib/diary/ui-types";
import { OccasionSticker } from "../art/OccasionSticker";
import { Polaroid } from "../book/Polaroid";
import { AddDateButton, AddPersonButton, type PersonOption } from "../forms/DiaryDialogs";
import { MemoNote } from "../MemoNote";
import { PageHeading } from "./PageBits";

export const PEOPLE_PER_PAGE = 6;

/** One page of the diary's people, six to a page — and a new page appears when a seventh person is added. */
export function PeoplePage({ people, first, total, options, themeId }: { people: PersonCardData[]; first: boolean; total: number; options: PersonOption[]; themeId?: string }) {
  return (
    <div className="flex h-full flex-col">
      {first ? (
        <PageHeading sub={`${total} ${total === 1 ? "person" : "people"} who make life more special`} action={<><AddPersonButton /><AddDateButton people={options} /></>}>My People</PageHeading>
      ) : (
        <PageHeading sub="Tap anyone to open their page"><span className="inline-flex items-center gap-2"><Users className="h-6 w-6 text-[var(--gp-copper)]" aria-hidden="true" /> More people</span></PageHeading>
      )}
      <ul className="mt-6 grid grid-cols-3 content-start gap-x-4 gap-y-6">
        {people.map((p, i) => (
          <li key={p.id} className="dy-in" style={{ ["--in-delay" as string]: `${100 + i * 70}ms` }}>
            <Polaroid href={`/diary/people/${p.id}`} name={p.name} photoUrl={p.photoUrl} tilt={tiltFor(i, 2.2)} tape={i % 3 === 0 ? "blush" : i % 3 === 1 ? "apricot" : "sage"} className="dy-tight-photo [--photo-ratio:5/4]" caption={<>{p.name}{p.isFavorite ? <span className="ml-0.5 text-[var(--dy-gold)]" aria-label="favourite"> ★</span> : null}</>}>
              <span className="dy-hand flex items-center justify-center gap-1 pb-0.5 text-[1.05rem] leading-none whitespace-nowrap text-[var(--gp-copper-dark)]">
                {p.next ? <><OccasionSticker type={p.next.eventType} themeId={themeId} className="h-5 w-5" />{daysShort(p.next.daysAway)}</> : <span className="text-[var(--dy-ink-soft)]">no dates yet</span>}
              </span>
            </Polaroid>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The blank page waiting at the end of the people — the diary's invitation to add someone else. */
export function AddPersonPage({ options }: { options: PersonOption[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="w-28"><Robin pose="peeking" title="" /></div>
      <p className="dy-hand-b text-[2rem] leading-[1.05]">Someone else on your mind?</p>
      <p className="dy-hand max-w-xs text-[1.3rem] leading-[1.15] text-[var(--dy-ink-soft)]">Every person you add gets a page of their own — and a new page appears here when this one fills.</p>
      <div className="flex flex-wrap justify-center gap-2"><AddPersonButton size="md" /><AddDateButton people={options} /></div>
      <MemoNote className="dy-hide-short mt-2" tilt={-2}>The best gifts come from a remembering heart</MemoNote>
    </div>
  );
}
