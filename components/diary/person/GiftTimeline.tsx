import Image from "next/image";
import { Gift } from "lucide-react";
import { OccasionSticker } from "../art/OccasionSticker";
import { SectionTitle } from "../book/SectionTitle";
import { NoGiftsYet } from "../EmptyStates";
import { LogGiftButton, RemoveButton } from "../forms/DiaryDialogs";
import { formatCurrency } from "@/lib/utils/format";

export interface TimelineGift {
  id: string;
  year: string;
  name: string;
  note: string | null;
  amount: number | null;
  eventType: string | null;
  image: string | null;
}

/** "What I've given Mom": a dotted line through the years, each gift with its picture and what she said about it. */
export function GiftTimeline({ contactId, contactName, gifts, themeId, defaultEventType }: { contactId: string; contactName: string; gifts: TimelineGift[]; themeId?: string; defaultEventType?: string }) {
  return (
    <section aria-labelledby="given-h">
      <SectionTitle id="given-h" icon={<Gift />} action={<LogGiftButton contactId={contactId} contactName={contactName} defaultEventType={defaultEventType} />}>What I&apos;ve given {contactName}</SectionTitle>
      {gifts.length === 0 ? (
        <div className="mt-5 max-w-sm"><NoGiftsYet title="Nothing logged yet" line={`When you give ${contactName} something, write it down here — we'll remember it next year.`} /></div>
      ) : (
        <ol className="dy-timeline mt-5 space-y-4" aria-label={`Gifts given to ${contactName}, newest first`}>
          {gifts.map((g, i) => (
            <li key={g.id} className="dy-in grid grid-cols-[2.6rem_0.85rem_1fr] items-center gap-x-3" style={{ ["--in-delay" as string]: `${100 + i * 80}ms` }}>
              <span className="dy-num text-[1.35rem] text-[var(--dy-ink)]">{g.year}</span>
              <span className="dy-dot" aria-hidden="true" />
              <div className="flex items-center gap-3">
                <span className="dy-polaroid !p-[3px] block w-[3.6rem] shrink-0" style={{ ["--tilt" as string]: `${i % 2 ? 2.5 : -2.5}deg` }} aria-hidden="true">
                  <span className="dy-polaroid-photo relative block">
                    {g.image ? <Image src={g.image} alt="" fill sizes="64px" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center bg-[var(--dy-paper-lo)]"><OccasionSticker type={g.eventType} themeId={themeId} className="h-8 w-8" /></span>}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="dy-hand-b break-words text-[1.35rem] leading-[1.05]">{g.name}{g.amount ? <span className="dy-ui ml-2 text-[0.8rem] font-medium text-[var(--dy-ink-soft)]">{formatCurrency(g.amount)}</span> : null}</p>
                  {g.note ? <p className="dy-hand break-words text-[1.15rem] leading-[1.12] text-[var(--dy-ink-soft)]">{g.note}</p> : null}
                </div>
                <RemoveButton kind="gift" id={g.id} name={g.name} className="shrink-0 opacity-60 hover:opacity-100"><span className="sr-only">Remove</span><span aria-hidden="true">×</span></RemoveButton>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
