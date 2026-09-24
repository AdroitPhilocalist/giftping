import { addDays, daysInMonth, parseISODate, type ISODate } from "./recurrence";
import { occurrencesInYear } from "./memories";
import { momentTitle } from "./present";
import { longDate } from "./format";
import type { CalendarMarks, IdeaCardData, MomentCardData, PersonCardData } from "./ui-types";
import type { CandidatePool } from "./candidates";
import type { Suggestion } from "./suggestion-matcher";
import type { DiaryContactRow, DiaryEventRow, Moment } from "./view";

/**
 * Turns the diary's rows into the plain shapes the presentational components take. Pure and unit-tested: the pages fetch, this shapes, the components draw.
 */
export function toMomentCard(m: Moment): MomentCardData {
  return {
    key: `${m.event.id}:${m.occurrence}`,
    contactId: m.contact.id,
    eventId: m.event.id,
    name: m.contact.name,
    title: momentTitle(m.contact.name, m.event.event_type, m.event.title),
    eventType: m.event.event_type,
    dateLabel: longDate(m.occurrence),
    daysAway: m.daysAway,
    handled: m.handled,
    milestone: m.milestone,
  };
}

/** Favourites first, then whoever's next moment is soonest, then those with no dates, each group A→Z. */
export function toPersonCards(contacts: DiaryContactRow[], nextByContact: Map<string, Moment>, photoUrls: Map<string, string>): PersonCardData[] {
  return contacts
    .map((c) => {
      const next = nextByContact.get(c.id);
      return {
        id: c.id,
        name: c.name,
        relationship: c.relationship,
        photoUrl: c.photo_url ? photoUrls.get(c.photo_url) ?? null : null,
        isFavorite: c.is_favorite,
        next: next ? { daysAway: next.daysAway, eventType: next.event.event_type } : null,
      };
    })
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || (a.next?.daysAway ?? 1e9) - (b.next?.daysAway ?? 1e9) || a.name.localeCompare(b.name));
}

/** Every marked day within a year either side of today, keyed by ISO date, for the paper calendar (which pages through months without asking the server). */
export function toCalendarMarks(events: DiaryEventRow[], contacts: DiaryContactRow[], today: ISODate): CalendarMarks {
  const year = parseISODate(today)!.year;
  const lo = addDays(today, -400);
  const hi = addDays(today, 400);
  const marks: CalendarMarks = {};
  for (const y of [year - 1, year, year + 1]) {
    for (const o of occurrencesInYear(events, contacts, y)) {
      if (o.date < lo || o.date > hi) continue;
      (marks[o.date] ??= []).push({ contactId: o.contact.id, label: momentTitle(o.contact.name, o.event.event_type, o.event.title), eventType: o.event.event_type });
    }
  }
  return marks;
}

export function toIdeaCards(suggestions: Suggestion[], pool: CandidatePool, wished: Set<string>): IdeaCardData[] {
  return suggestions.flatMap((s) => {
    const p = pool.byId.get(s.productId);
    return p ? [{ productId: p.id, slug: p.slug, name: p.name, price: p.price, thumbnail: p.thumbnail, vendorName: p.vendorName, reason: s.reasons[0] ?? null, wished: wished.has(p.id) }] : [];
  });
}

export interface MonthData {
  month: number;
  /** blank cells before the 1st, for a Sunday-first grid */
  leading: number;
  days: number;
  /** day of month -> what falls on it */
  marks: Record<number, { contactId: string; label: string; eventType: string }[]>;
}

/** All twelve months of a year for the year-at-a-glance spread: the grid shape and what is marked on each day. */
export function toMonthData(events: DiaryEventRow[], contacts: DiaryContactRow[], year: number): MonthData[] {
  const months: MonthData[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    leading: new Date(Date.UTC(year, i, 1)).getUTCDay(),
    days: daysInMonth(year, i + 1),
    marks: {},
  }));
  for (const o of occurrencesInYear(events, contacts, year)) {
    const month = Number(o.date.slice(5, 7));
    const day = Number(o.date.slice(8, 10));
    (months[month - 1].marks[day] ??= []).push({ contactId: o.contact.id, label: momentTitle(o.contact.name, o.event.event_type, o.event.title), eventType: o.event.event_type });
  }
  return months;
}
