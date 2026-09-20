/**
 * Diary date maths — pure, no I/O, no `Date` local-time surprises. Dates are plain "YYYY-MM-DD" strings (the DB column is
 * a `date`, with no time and no zone) and every calculation is done in UTC day-numbers so a server in any timezone gives
 * the same answer. The one place a timezone matters is deciding what "today" is for a given user: `localDateIn()`.
 *
 * Decisions worth knowing:
 *  - A Feb 29 event is celebrated on **Feb 28** in non-leap years (and on Feb 29 in leap years).
 *  - A recurring event's next occurrence is the first one on or AFTER today; today itself counts (0 days away).
 *  - A non-recurring event has one occurrence, its own date, and none once it has passed.
 */
export type ISODate = string;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function parseISODate(value: string): { year: number; month: number; day: number } | null {
  const m = ISO.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");
export const formatISODate = (year: number, month: number, day: number): ISODate => `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

function dayNumber(date: ISODate): number {
  const p = parseISODate(date);
  if (!p) throw new Error(`Invalid date: ${date}`);
  return Date.UTC(p.year, p.month - 1, p.day) / 86_400_000;
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = new Date((dayNumber(date) + days) * 86_400_000);
  return formatISODate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Where the event's month/day falls in `year` (Feb 29 -> Feb 28 in non-leap years). */
export function occurrenceInYear(eventDate: ISODate, year: number): ISODate {
  const p = parseISODate(eventDate);
  if (!p) throw new Error(`Invalid date: ${eventDate}`);
  const day = p.month === 2 && p.day === 29 && !isLeapYear(year) ? 28 : p.day;
  return formatISODate(year, p.month, day);
}

/** The next occurrence on or after `today`, or null for a non-recurring event that has already passed. */
export function nextOccurrence(eventDate: ISODate, isRecurring: boolean, today: ISODate): ISODate | null {
  if (!isRecurring) return daysBetween(today, eventDate) >= 0 ? eventDate : null;
  const todayYear = parseISODate(today)!.year;
  const thisYear = occurrenceInYear(eventDate, todayYear);
  return daysBetween(today, thisYear) >= 0 ? thisYear : occurrenceInYear(eventDate, todayYear + 1);
}

export function daysUntilNext(eventDate: ISODate, isRecurring: boolean, today: ISODate): number | null {
  const next = nextOccurrence(eventDate, isRecurring, today);
  return next === null ? null : daysBetween(today, next);
}

/** "Turning N" / "Nth anniversary": whole years between the original date and this occurrence (0 if it's the first year). */
export function milestoneYears(eventDate: ISODate, occurrence: ISODate): number {
  return Math.max(0, parseISODate(occurrence)!.year - parseISODate(eventDate)!.year);
}

/** The user's calendar date right now in their IANA timezone (falls back to Asia/Kolkata for an unknown zone). */
export function localDateIn(timeZone: string, now: Date = new Date()): ISODate {
  const format = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  try {
    return format(timeZone);
  } catch {
    return format("Asia/Kolkata");
  }
}

export interface DueReminder {
  occurrence: ISODate;
  daysBefore: number;
}

/**
 * Which reminders are due TODAY for an event: one per configured lead time whose day-count matches exactly.
 * Matching exactly (rather than "within N days") is what makes the daily cron safe to run once a day and to re-run:
 * a given reminder is due on exactly one calendar day per occurrence. An event created only 5 days before its date
 * therefore never gets its 7-day reminder — it isn't late-fired.
 */
export function dueReminders(args: { eventDate: ISODate; isRecurring: boolean; reminderDays: number[]; today: ISODate }): DueReminder[] {
  const occurrence = nextOccurrence(args.eventDate, args.isRecurring, args.today);
  if (!occurrence) return [];
  const away = daysBetween(args.today, occurrence);
  return Array.from(new Set(args.reminderDays))
    .filter((d) => d === away)
    .map((daysBefore) => ({ occurrence, daysBefore }));
}
