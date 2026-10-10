/**
 * Festival calendar for "festival mode" — pure and tested. A festival is tied to a THEME (lib/theme/themes.ts, kind "festival"): when an admin schedules or
 * previews that theme, the site also gets the floating ambience and this countdown. Nothing here decides WHEN a theme is live — the schedule does; this only
 * answers "how long until the festival, and until when can a gift still arrive in time?".
 *
 * ⚠ TWO THINGS A HUMAN MUST CONFIRM BEFORE LAUNCH (they are in code on purpose so there is one place to correct):
 *   1. The dates. Lunar festivals move every year; these were written from the published 2026–27 calendars and must be checked against the panchang.
 *   2. `cutoffDays`: how many days before the festival an order must be placed to arrive in time. 4 is an assumption (typical courier time + vendor dispatch
 *      time) — it is the client's/operations' call, and it should reflect the slowest realistic boutique, not the best case.
 */
import type { AmbienceKind } from "@/components/shop/Ambience";

export interface Festival {
  id: string;
  /** the id of its theme in lib/theme/themes.ts */
  themeId: string;
  name: string;
  /** ISO calendar dates (Asia/Kolkata), one per year, ascending */
  dates: string[];
  cutoffDays: number;
  /** what to say next to the countdown */
  greeting: string;
  /** what floats across the site while it is live */
  ambience: AmbienceKind;
  /** the Festivals category the "shop" button leads to */
  shopHref: string;
}

export const FESTIVALS: Festival[] = [
  {
    id: "diwali",
    themeId: "diwali",
    name: "Diwali",
    dates: ["2026-11-08", "2027-10-29"],
    cutoffDays: 4,
    greeting: "Light up someone's Diwali",
    ambience: "diyas",
    shopHref: "/categories/festivals",
  },
  {
    id: "christmas",
    themeId: "christmas",
    name: "Christmas",
    // Fixed calendar date, unlike Diwali — but cutoffDays is still an assumption (December courier congestion is worse than an ordinary week)
    // and must be confirmed by the client/ops before this is scheduled live, same rule as every other entry in this file.
    dates: ["2026-12-25", "2027-12-25"],
    cutoffDays: 5,
    greeting: "The season of giving is here",
    ambience: "snow",
    shopHref: "/categories/festivals",
  },
];

export function festivalForTheme(themeId: string | null | undefined): Festival | null {
  return FESTIVALS.find((f) => f.themeId === themeId) ?? null;
}

const DAY_MS = 86_400_000;

/** Whole days from `from` to `to`, both ISO dates (YYYY-MM-DD). Calendar days, so DST/time-of-day never matters. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Today's calendar date in India — the shop's own clock, wherever the server runs. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type CountdownPhase = "ordering" | "last-chance" | "cutoff-passed" | "festival-day";

export interface FestivalCountdown {
  festival: Festival;
  date: string;
  daysToFestival: number;
  /** the last day an order is expected to arrive in time */
  orderBy: string;
  daysToCutoff: number;
  phase: CountdownPhase;
}

/** The next occurrence of the festival that hasn't passed (today counts), or null when the calendar has run out. */
export function festivalCountdown(festival: Festival, today: string): FestivalCountdown | null {
  const date = festival.dates.find((d) => d >= today);
  if (!date) return null;
  const daysToFestival = daysBetween(today, date);
  const orderBy = addDays(date, -festival.cutoffDays);
  const daysToCutoff = daysBetween(today, orderBy);
  const phase: CountdownPhase = daysToFestival === 0 ? "festival-day" : daysToCutoff < 0 ? "cutoff-passed" : daysToCutoff <= 2 ? "last-chance" : "ordering";
  return { festival, date, daysToFestival, orderBy, daysToCutoff, phase };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "4 Nov" — a plain day-and-month, no locale surprises between server and browser. */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** The sentence the countdown shows. Never promises more than the cut-off rule does. */
export function countdownLine(c: FestivalCountdown): { headline: string; detail: string } {
  const name = c.festival.name;
  const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  switch (c.phase) {
    case "festival-day":
      return { headline: `Happy ${name}!`, detail: "Wishing you light, sweetness and the people you love." };
    case "cutoff-passed":
      return { headline: `${days(c.daysToFestival)} to ${name}`, detail: `The ${shortDate(c.orderBy)} cut-off has passed — new orders may arrive after the festival.` };
    case "last-chance":
      return { headline: `${days(c.daysToFestival)} to ${name}`, detail: c.daysToCutoff === 0 ? `Last day to order for ${name} delivery — today.` : `Order by ${shortDate(c.orderBy)} for ${name} delivery — ${days(c.daysToCutoff)} left.` };
    default:
      return { headline: `${days(c.daysToFestival)} to ${name}`, detail: `Order by ${shortDate(c.orderBy)} for ${name} delivery.` };
  }
}
