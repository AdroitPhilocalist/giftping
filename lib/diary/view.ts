import { addDays, daysBetween, milestoneYears, nextOccurrence, type ISODate } from "./recurrence";
import type { GiftingScoreInput } from "./gifting-score";

/** Pure view-model for the diary dashboard: raw rows in, everything the page shows out. No I/O, unit-tested. */
export interface DiaryContactRow {
  id: string;
  name: string;
  relationship: string | null;
  interests: string[];
  gift_preferences: string | null;
  notes: string | null;
  budget_max: number | null;
  is_favorite: boolean;
}
export interface DiaryEventRow {
  id: string;
  contact_id: string;
  event_type: string;
  title: string | null;
  event_date: string;
  is_recurring: boolean;
  reminder_days: number[];
  is_active: boolean;
  notes: string | null;
}
export interface DiaryGiftRow {
  id: string;
  contact_id: string | null;
  gift_name: string | null;
  product_id: string | null;
  event_type: string | null;
  amount: number | null;
  gifted_at: string;
}

export interface Moment {
  event: DiaryEventRow;
  contact: DiaryContactRow;
  occurrence: ISODate;
  daysAway: number;
  milestone: number;
  /** A gift was logged/ordered for this person in the 45 days leading up to the occasion. */
  handled: boolean;
}

/** How far ahead the dashboard looks, and how early before an occasion a gift counts as "for it". */
export const HORIZON_DAYS = 60;
const HANDLED_WINDOW_DAYS = 45;

const giftDate = (g: DiaryGiftRow) => g.gifted_at.slice(0, 10);

export function buildDiaryView(args: { contacts: DiaryContactRow[]; events: DiaryEventRow[]; gifts: DiaryGiftRow[]; today: ISODate }) {
  const { contacts, events, gifts, today } = args;
  const contactById = new Map(contacts.map((c) => [c.id, c]));

  const isHandled = (contactId: string, occurrence: ISODate) =>
    gifts.some((g) => g.contact_id === contactId && giftDate(g) >= addDays(occurrence, -HANDLED_WINDOW_DAYS) && giftDate(g) <= addDays(occurrence, 1));

  const moments: Moment[] = [];
  for (const event of events) {
    const contact = contactById.get(event.contact_id);
    if (!contact) continue;
    const occurrence = nextOccurrence(event.event_date, event.is_recurring, today);
    if (!occurrence) continue;
    moments.push({
      event, contact, occurrence,
      daysAway: daysBetween(today, occurrence),
      milestone: milestoneYears(event.event_date, occurrence),
      handled: isHandled(contact.id, occurrence),
    });
  }
  moments.sort((a, b) => a.daysAway - b.daysAway || a.contact.name.localeCompare(b.contact.name));

  const active = moments.filter((m) => m.event.is_active);
  const upcoming = active.filter((m) => m.daysAway <= HORIZON_DAYS);

  const nextByContact = new Map<string, Moment>();
  for (const m of active) if (!nextByContact.has(m.contact.id)) nextByContact.set(m.contact.id, m);

  const within30 = active.filter((m) => m.daysAway <= 30);
  const yearAgo = addDays(today, -365);
  const scoreInput: GiftingScoreInput = {
    contactCount: contacts.length,
    contactsWithInterests: contacts.filter((c) => c.interests.length > 0).length,
    contactsWithEvents: new Set(events.map((e) => e.contact_id)).size,
    eventCount: events.length,
    upcoming30d: { total: within30.length, handled: within30.filter((m) => m.handled).length },
    giftsLast12Months: gifts.filter((g) => giftDate(g) >= yearAgo && giftDate(g) <= today).length,
  };

  return { moments, upcoming, nextByContact, scoreInput };
}

/** Days of the given month (1-based) that have an occasion on them, for the mini calendar's dots. */
export function calendarMarks(moments: Moment[], year: number, month: number): Map<number, Moment[]> {
  const prefix = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-`;
  const marks = new Map<number, Moment[]>();
  for (const m of moments) {
    if (!m.occurrence.startsWith(prefix)) continue;
    const day = Number(m.occurrence.slice(8, 10));
    marks.set(day, [...(marks.get(day) ?? []), m]);
  }
  return marks;
}
