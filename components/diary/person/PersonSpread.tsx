import Link from "next/link";
import { ArrowLeft, Gift } from "lucide-react";
import { Robin, hasRobinArt } from "@/components/art/Robin";
import { GIFT_GIVEN_EVENT, OrderCelebration } from "@/components/orders/OrderCelebration";
import type { IdeaCardData } from "@/lib/diary/ui-types";
import type { DiaryContactRow, DiaryEventRow, Moment } from "@/lib/diary/view";
import { Book } from "../book/Book";
import { Corner } from "../Corner";
import { GiftIdeas } from "../GiftIdeas";
import { DateCards } from "./DateCards";
import { GiftTimeline, type TimelineGift } from "./GiftTimeline";
import { LovesBoard } from "./LovesBoard";
import { PersonHeader } from "./PersonHeader";
import { PickButton } from "./PickButton";
import { PlanSheet, type PlanViewData } from "./PlanSheet";
import { PrivateNotes } from "./PrivateNotes";

export interface PersonSpreadProps {
  contact: DiaryContactRow;
  /** true for the one page load right after adding them — see NewPersonReveal */
  justAdded?: boolean;
  photoUrl: string | null;
  events: DiaryEventRow[];
  moments: Moment[];
  timeline: TimelineGift[];
  plan: PlanViewData | null;
  ideas: IdeaCardData[];
  /** "Mom's birthday" (or just the name when there is no upcoming date) */
  ideasWho: string;
  /** the occasion a "Pick this" adds to, and the idea already picked */
  pick: { eventId: string; occasionDate: string; pickedProductId: string | null } | null;
  defaultEventType?: string;
  giftsHref: string;
  themeId?: string;
}

/** One person's page: the plan strip across the top, then the book — who they are, their dates and gifts on the left; what they love, ideas and notes on the right. */
export function PersonSpread({ contact, justAdded, photoUrl, events, moments, timeline, plan, ideas, ideasWho, pick, defaultEventType, giftsHref, themeId }: PersonSpreadProps) {
  const first = contact.name.trim().split(/\s+/)[0] || contact.name;
  const reading = hasRobinArt("reading");
  return (
    <>
      <OrderCelebration eventName={GIFT_GIVEN_EVENT} message={`Gift given — ${first} will remember it!`} />
      <div className="mx-auto mb-4 max-w-[78rem] space-y-5">
        <Link href="/diary" className="dy-hand dy-on-wood inline-flex items-center gap-1.5 text-[1.35rem] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to my diary</Link>
        {plan ? <PlanSheet key={`${plan.plan?.id ?? "none"}:${plan.plan?.status ?? ""}:${plan.plan?.note ?? ""}:${plan.plan?.giftName ?? ""}`} data={plan} personName={first} /> : null}
      </div>
      <Book
        current="people"
        robin={false}
        leftLabel={`${contact.name}: about them, dates and gifts given`}
        rightLabel={`${contact.name}: what they love, ideas and notes`}
        left={
          <>
            <Corner at="bl" variant="daisy" />
            <PersonHeader contact={contact} photoUrl={photoUrl} justAdded={justAdded} />
            <div className="mt-9"><DateCards contactId={contact.id} contactName={contact.name} events={events} moments={moments} themeId={themeId} /></div>
            <div className="mt-9 pb-2"><GiftTimeline contactId={contact.id} contactName={contact.name} gifts={timeline} themeId={themeId} defaultEventType={defaultEventType} /></div>
          </>
        }
        right={
          <>
            <LovesBoard key={contact.interests.join("\u0001")} contactId={contact.id} name={contact.name} interests={contact.interests} />
            {ideas.length > 0 ? (
              <GiftIdeas
                id="ideas"
                className="mt-9"
                ideas={ideas}
                who={ideasWho}
                reasonLine
                renderAction={pick ? (idea) => <PickButton eventId={pick.eventId} occasionDate={pick.occasionDate} productId={idea.productId} picked={pick.pickedProductId === idea.productId} personName={first} /> : undefined}
              />
            ) : (
              <p className="dy-hand mt-8 text-[1.3rem] text-[var(--dy-ink-soft)]">Add a few things {contact.name} loves and we&apos;ll line up gift ideas.</p>
            )}
            <div className="mt-9"><PrivateNotes key={contact.notes ?? ""} contactId={contact.id} name={contact.name} notes={contact.notes} /></div>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
              <Link href={giftsHref} className="dy-btn dy-btn--lg dy-btn--sprig w-full sm:w-auto"><Gift className="h-5 w-5" aria-hidden="true" /> Find a gift for {contact.name} <span aria-hidden="true">→</span></Link>
              <div className="pointer-events-none w-24 shrink-0" aria-hidden="true"><Robin pose={reading ? "reading" : "perched"} title="" /></div>
            </div>
            <Corner at="br" variant="wild" size="h-32 w-16" />
          </>
        }
      />
    </>
  );
}
