import type { DiaryRows } from "@/lib/db/diary";
import type { CandidatePool } from "./candidates";
import { computeGiftingScore, type GiftingScore } from "./gifting-score";
import { longDate } from "./format";
import { rememberedStreak, reviewYear, summariseYear, type YearReview, type YearSummary } from "./memories";
import { toCalendarMarks, toIdeaCards, toMomentCard, toMonthData, toPersonCards, type MonthData } from "./page-data";
import { effectivePlanStatus } from "./plans";
import { momentPhrase, momentTitle } from "./present";
import { parseISODate, type ISODate } from "./recurrence";
import { suggestGifts } from "./suggestion-matcher";
import type { CalendarMarks, IdeaCardData, MomentCardData, PersonCardData } from "./ui-types";
import { buildDiaryView } from "./view";

/**
 * Everything the diary BOOK shows, as plain data, worked out from the diary's rows. Pure (the pages fetch, this shapes) so it is testable, and so the design
 * preview can build the very same book from sample rows.
 */
export interface PlanChip {
  key: string;
  contactId: string;
  eventId: string;
  title: string;
  eventType: string;
  daysAway: number;
  status: import("./plans").PlanStatus;
  giftName: string | null;
}
export interface IdeaSet {
  who: string;
  contactId: string;
  eventId: string;
  moreHref: string;
  ideas: IdeaCardData[];
}
export interface BookReviewPerson {
  id: string;
  name: string;
  photoUrl: string | null;
  relationship: string | null;
}
export interface BookLogGift {
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
export interface HomeBookData {
  today: ISODate;
  year: number;
  moments: MomentCardData[];
  plans: PlanChip[];
  marks: CalendarMarks;
  ideaSets: IdeaSet[];
  people: PersonCardData[];
  options: { id: string; name: string }[];
  months: MonthData[];
  summary: YearSummary;
  review: YearReview;
  reviewPeople: BookReviewPerson[];
  score: GiftingScore;
  streak: number;
  log: BookLogGift[];
}

export function buildHomeBookData(args: { rows: DiaryRows; pool: CandidatePool; wished: Set<string>; photoUrls: Map<string, string>; today: ISODate }): HomeBookData {
  const { rows, pool, wished, photoUrls, today } = args;
  const view = buildDiaryView({ contacts: rows.contacts, events: rows.events, gifts: rows.gifts, today });
  const year = parseISODate(today)!.year;
  const byContact = new Map(rows.contacts.map((c) => [c.id, c]));

  // gift plans still in progress, for occasions that have not passed
  const plans: PlanChip[] = [];
  for (const plan of rows.plans) {
    if (plan.status === "given" || plan.occasion_date < today) continue;
    const moment = view.moments.find((m) => m.event.id === plan.event_id && m.occurrence === plan.occasion_date);
    if (!moment) continue;
    const product = plan.product_id ? pool.byId.get(plan.product_id) : undefined;
    plans.push({
      key: plan.id,
      contactId: moment.contact.id,
      eventId: moment.event.id,
      title: momentTitle(moment.contact.name, moment.event.event_type, moment.event.title),
      eventType: moment.event.event_type,
      daysAway: moment.daysAway,
      status: effectivePlanStatus(plan, rows.linkedOrders.get(plan.id) ?? null),
      giftName: plan.gift_name ?? product?.name ?? null,
    });
  }
  plans.sort((a, b) => a.daysAway - b.daysAway);

  // ideas for the first two moments that still need a gift
  const ideaSets: IdeaSet[] = view.upcoming
    .filter((m) => !m.handled)
    .slice(0, 2)
    .map((m) => {
      const giftedBy = new Set(rows.gifts.filter((g) => g.contact_id === m.contact.id && g.product_id).map((g) => g.product_id!));
      return {
        who: momentPhrase(m.contact.name, m.event.event_type, m.event.title),
        contactId: m.contact.id,
        eventId: m.event.id,
        moreHref: `/diary/people/${m.contact.id}?event=${m.event.id}#ideas`,
        ideas: toIdeaCards(
          suggestGifts({
            person: { relationship: m.contact.relationship, interests: m.contact.interests, giftPreferences: m.contact.gift_preferences },
            context: { eventType: m.event.event_type, budgetMax: m.contact.budget_max === null ? null : Number(m.contact.budget_max) },
            candidates: pool.candidates,
            alreadyGiftedProductIds: giftedBy,
            limit: 4,
          }),
          pool,
          wished,
        ),
      };
    })
    .filter((s) => s.ideas.length > 0);

  const review = reviewYear({ events: rows.events, contacts: rows.contacts, gifts: rows.gifts, today, year });
  const reviewPeople: BookReviewPerson[] = review.topPeople.flatMap((p) => {
    const c = byContact.get(p.contactId);
    return c ? [{ id: c.id, name: c.name, photoUrl: c.photo_url ? photoUrls.get(c.photo_url) ?? null : null, relationship: c.relationship }] : [];
  });

  const log: BookLogGift[] = rows.gifts.slice(0, 6).map((g) => ({
    id: g.id,
    contactId: g.contact_id,
    who: g.contact_id ? byContact.get(g.contact_id)?.name ?? "someone" : "someone",
    dateLabel: longDate(g.gifted_at.slice(0, 10)),
    name: g.gift_name ?? "A gift",
    note: g.notes ?? null,
    amount: g.amount === null ? null : Number(g.amount),
    eventType: g.event_type,
    image: (g.product_id ? pool.byId.get(g.product_id)?.thumbnail : null) ?? g.image ?? null,
  }));

  return {
    today,
    year,
    moments: view.upcoming.map(toMomentCard),
    plans,
    marks: toCalendarMarks(rows.events, rows.contacts, today),
    ideaSets,
    people: toPersonCards(rows.contacts, view.nextByContact, photoUrls),
    options: rows.contacts.map((c) => ({ id: c.id, name: c.name })),
    months: toMonthData(rows.events, rows.contacts, year),
    summary: summariseYear({ events: rows.events, contacts: rows.contacts, gifts: rows.gifts, today, year }),
    review,
    reviewPeople,
    score: computeGiftingScore(view.scoreInput),
    streak: rememberedStreak({ events: rows.events, contacts: rows.contacts, gifts: rows.gifts, today }),
    log,
  };
}
