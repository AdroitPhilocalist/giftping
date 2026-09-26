import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Robin, hasRobinArt } from "@/components/art/Robin";
import { HeartDoodle } from "../art/Doodles";
import { OccasionSticker } from "../art/OccasionSticker";
import { Sprig } from "../art/Sprig";
import { WaxSeal } from "../art/WaxSeal";
import { NoGiftsYet } from "../EmptyStates";
import { AddDateButton, AddPersonButton, type PersonOption } from "../forms/DiaryDialogs";
import { PageHeading } from "./PageBits";
import { formatCurrency } from "@/lib/utils/format";

export interface LogGift {
  id: string;
  contactId: string | null;
  who: string;
  dateLabel: string;
  name: string;
  note: string | null;
  amount: number | null;
  eventType: string | null;
  image: string | null;
}

/** The gift log: the last few things you gave, and who they were for, with what they said. */
export function LogPage({ gifts, themeId }: { gifts: LogGift[]; themeId?: string }) {
  return (
    <div className="flex h-full flex-col">
      <PageHeading sub="Everything you write down here comes back next year in your reminders">What I&apos;ve Given Lately</PageHeading>
      {gifts.length === 0 ? (
        <div className="mt-6 max-w-sm"><NoGiftsYet title="No gifts logged yet" line="Open a person's page and press “Log a gift” — or mark a plan as given." /></div>
      ) : (
        <ol className="mt-4 space-y-2.5" aria-label="Gifts given, newest first">
          {gifts.slice(0, 6).map((g, i) => (
            <li key={g.id} className="dy-in flex items-center gap-3" style={{ ["--in-delay" as string]: `${80 + i * 70}ms` }}>
              <span className="dy-polaroid !p-[3px] block w-12 shrink-0" style={{ ["--tilt" as string]: `${i % 2 ? 2.5 : -2.5}deg` }} aria-hidden="true">
                <span className="dy-polaroid-photo relative block">
                  {g.image ? <Image src={g.image} alt="" fill sizes="48px" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center bg-[var(--dy-paper-lo)]"><OccasionSticker type={g.eventType} themeId={themeId} className="h-7 w-7" /></span>}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="dy-hand-b truncate text-[1.35rem] leading-[1.05]">{g.name}{g.amount ? <span className="dy-ui ml-2 text-[0.8rem] font-medium text-[var(--dy-ink-soft)]">{formatCurrency(g.amount)}</span> : null}</p>
                <p className="dy-cap truncate leading-[1.1]">{g.contactId ? <Link href={`/diary/people/${g.contactId}`} className="hover:text-[var(--gp-copper)]">for {g.who}</Link> : "for someone"} · {g.dateLabel}{g.note ? ` — “${g.note}”` : ""}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** The inside of the back cover: nothing more written yet, and the promise that it is private. */
export function BackCoverPage({ options, year }: { options: PersonOption[]; year: number }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="w-32"><Robin pose={hasRobinArt("sleeping") ? "sleeping" : "peeking"} title="" /></div>
      <p className="dy-hand-b text-[2rem] leading-[1.05]">That&apos;s all for now <HeartDoodle className="text-[0.55em]" /></p>
      <p className="dy-hand max-w-xs text-[1.3rem] leading-[1.15] text-[var(--dy-ink-soft)]">Every date you add and every gift you give writes a little more of this diary.</p>
      <div className="flex flex-wrap justify-center gap-2"><AddPersonButton /><AddDateButton people={options} /></div>
      <p className="dy-hand flex items-center gap-2 text-[1.2rem] leading-[1.1] text-[var(--dy-ink-soft)]"><WaxSeal size={30}><Lock className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" /></WaxSeal> Only you can open this</p>
      <Link href={`/diary/year?year=${year + 1}`} className="dy-link dy-hide-short">Look at another year →</Link>
      <Sprig variant="daisy" className="dy-corner !absolute bottom-6 left-0 h-28 w-14" />
    </div>
  );
}
