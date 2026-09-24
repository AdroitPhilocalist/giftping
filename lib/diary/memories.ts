import { addDays, occurrenceInYear, parseISODate, type ISODate } from "./recurrence";
import { HANDLED_WINDOW_DAYS, type DiaryContactRow, type DiaryEventRow, type DiaryGiftRow } from "./view";

/**
 * What the diary remembers over time: last year's gift, how a year went, and a streak of moments you never let slip.
 * Pure functions over the rows the pages already load — no I/O, unit-tested.
 *
 * A moment counts as "remembered" when a gift was logged (or ordered) for that person in the 45 days before it, or the day after — the same rule
 * the dashboard uses for "Gift sorted". And a moment can only be "missed" if the date was already in the diary: nobody is blamed for a birthday
 * that passed before they had written it down.
 */
const giftDay = (g: Pick<DiaryGiftRow, "gifted_at">): ISODate => g.gifted_at.slice(0, 10);
const createdDay = (e: Pick<DiaryEventRow, "created_at">): ISODate | null => (e.created_at ? e.created_at.slice(0, 10) : null);

export interface Occurrence {
  event: DiaryEventRow;
  contact: DiaryContactRow;
  date: ISODate;
  /** years since the original date (0 = the first) */
  milestone: number;
}

/** Every active date's occurrence inside one calendar year (a one-off date only in the year it falls in). */
export function occurrencesInYear(events: DiaryEventRow[], contacts: DiaryContactRow[], year: number): Occurrence[] {
  const byId = new Map(contacts.map((c) => [c.id, c]));
  const out: Occurrence[] = [];
  for (const event of events) {
    const contact = byId.get(event.contact_id);
    const original = parseISODate(event.event_date);
    if (!contact || !original || !event.is_active) continue;
    if (!event.is_recurring && original.year !== year) continue;
    if (event.is_recurring && year < original.year) continue; // a birthday can't recur before it began
    const date = event.is_recurring ? occurrenceInYear(event.event_date, year) : event.event_date;
    out.push({ event, contact, date, milestone: Math.max(0, year - original.year) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.contact.name.localeCompare(b.contact.name));
}

export function isRemembered(gifts: DiaryGiftRow[], contactId: string, date: ISODate): boolean {
  return gifts.some((g) => g.contact_id === contactId && giftDay(g) >= addDays(date, -HANDLED_WINDOW_DAYS) && giftDay(g) <= addDays(date, 1));
}

/** Could this moment have been missed — i.e. was it already in the diary when it happened? */
const wasTrackable = (o: Occurrence): boolean => {
  const added = createdDay(o.event);
  return added === null || o.date >= added;
};

export interface YearSummary {
  year: number;
  /** all active moments in the year */
  total: number;
  /** passed, already in the diary, and had a gift */
  remembered: number;
  /** still ahead (today counts as ahead) */
  toGo: number;
  perMonth: number[];
  busiest: { month: number; count: number; highlights: string[] } | null;
}

const SINGULAR: Record<string, string> = { birthday: "birthday", anniversary: "anniversary", wedding: "wedding", housewarming: "housewarming", graduation: "graduation", "thank-you": "thank-you", festival: "festival", other: "special day" };
const PLURAL: Record<string, string> = { birthday: "birthdays", anniversary: "anniversaries", wedding: "weddings", housewarming: "housewarmings", graduation: "graduations", "thank-you": "thank-yous", festival: "festivals", other: "special days" };

export function summariseYear(args: { events: DiaryEventRow[]; contacts: DiaryContactRow[]; gifts: DiaryGiftRow[]; today: ISODate; year: number }): YearSummary {
  const list = occurrencesInYear(args.events, args.contacts, args.year);
  const perMonth = Array<number>(12).fill(0);
  let remembered = 0;
  let toGo = 0;
  for (const o of list) {
    perMonth[Number(o.date.slice(5, 7)) - 1] += 1;
    if (o.date >= args.today) toGo += 1;
    else if (wasTrackable(o) && isRemembered(args.gifts, o.contact.id, o.date)) remembered += 1;
  }

  let busiest: YearSummary["busiest"] = null;
  const top = Math.max(0, ...perMonth);
  if (top >= 2) {
    const month = perMonth.indexOf(top) + 1;
    const inMonth = list.filter((o) => Number(o.date.slice(5, 7)) === month);
    const named = inMonth.filter((o) => (o.event.event_type === "festival" || o.event.event_type === "other") && o.event.title?.trim()).map((o) => o.event.title!.trim());
    const counts = new Map<string, number>();
    for (const o of inMonth) {
      if ((o.event.event_type === "festival" || o.event.event_type === "other") && o.event.title?.trim()) continue;
      counts.set(o.event.event_type, (counts.get(o.event.event_type) ?? 0) + 1);
    }
    const kinds = Array.from(counts.entries()).map(([type, n]) => (n === 1 ? `1 ${SINGULAR[type] ?? type}` : `${n} ${PLURAL[type] ?? type}`));
    busiest = { month, count: top, highlights: [...Array.from(new Set(named)), ...kinds].slice(0, 3) };
  }
  return { year: args.year, total: list.length, remembered, toGo, perMonth, busiest };
}

export interface YearReview {
  year: number;
  giftsGiven: number;
  peopleMadeHappy: number;
  momentsRemembered: number;
  favouriteOccasion: { type: string; count: number } | null;
  /** the people you gave to most this year, most first */
  topPeople: { contactId: string; gifts: number }[];
}

export function reviewYear(args: { events: DiaryEventRow[]; contacts: DiaryContactRow[]; gifts: DiaryGiftRow[]; today: ISODate; year: number }): YearReview {
  const inYear = args.gifts.filter((g) => g.gifted_at.startsWith(`${args.year}-`));
  const perPerson = new Map<string, number>();
  const perType = new Map<string, number>();
  for (const g of inYear) {
    if (g.contact_id) perPerson.set(g.contact_id, (perPerson.get(g.contact_id) ?? 0) + 1);
    if (g.event_type) perType.set(g.event_type, (perType.get(g.event_type) ?? 0) + 1);
  }
  let favourite: YearReview["favouriteOccasion"] = null;
  for (const [type, count] of perType) if (!favourite || count > favourite.count || (count === favourite.count && type < favourite.type)) favourite = { type, count };
  if (!favourite) {
    // no gifts carry an occasion — fall back to the kind of date the diary has most of
    const kinds = new Map<string, number>();
    for (const o of occurrencesInYear(args.events, args.contacts, args.year)) kinds.set(o.event.event_type, (kinds.get(o.event.event_type) ?? 0) + 1);
    for (const [type, count] of kinds) if (!favourite || count > favourite.count || (count === favourite.count && type < favourite.type)) favourite = { type, count };
  }
  const summary = summariseYear(args);
  return {
    year: args.year,
    giftsGiven: inYear.length,
    peopleMadeHappy: perPerson.size,
    momentsRemembered: summary.remembered,
    favouriteOccasion: favourite,
    topPeople: Array.from(perPerson.entries()).map(([contactId, gifts]) => ({ contactId, gifts })).sort((a, b) => b.gifts - a.gifts || a.contactId.localeCompare(b.contactId)).slice(0, 5),
  };
}

/**
 * How many special days in a row you have remembered, counting back from the most recent one that has passed. Looks back five years.
 * A single miss ends it; days that passed before the date was in the diary are skipped, not counted against you.
 */
export function rememberedStreak(args: { events: DiaryEventRow[]; contacts: DiaryContactRow[]; gifts: DiaryGiftRow[]; today: ISODate }): number {
  const thisYear = parseISODate(args.today)!.year;
  const past: Occurrence[] = [];
  for (let year = thisYear; year >= thisYear - 5; year--) {
    for (const o of occurrencesInYear(args.events, args.contacts, year)) if (o.date < args.today && wasTrackable(o)) past.push(o);
  }
  past.sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const o of past) {
    if (!isRemembered(args.gifts, o.contact.id, o.date)) break;
    streak += 1;
  }
  return streak;
}

/** The gift you gave this person around this occasion last year (the nearest one within the usual window), or null. */
export function lastYearsGift(args: { gifts: DiaryGiftRow[]; contactId: string; occurrence: ISODate; eventType: string | null }): DiaryGiftRow | null {
  const p = parseISODate(args.occurrence);
  if (!p) return null;
  const then = occurrenceInYear(args.occurrence, p.year - 1);
  const lo = addDays(then, -HANDLED_WINDOW_DAYS);
  const hi = addDays(then, 1);
  const near = args.gifts.filter((g) => g.contact_id === args.contactId && giftDay(g) >= lo && giftDay(g) <= hi);
  if (near.length === 0) return null;
  const distance = (g: DiaryGiftRow) => Math.abs(Date.parse(giftDay(g)) - Date.parse(then));
  const sameKind = near.filter((g) => args.eventType && g.event_type === args.eventType);
  return (sameKind.length ? sameKind : near).sort((a, b) => distance(a) - distance(b))[0];
}
