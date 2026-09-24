/**
 * The shapes the diary's presentational components take. They are plain data — the pages build them from database rows — so the same
 * components render the real diary, the design preview and (later) anything else without knowing where the data came from.
 */
export interface MomentCardData {
  key: string;
  contactId: string;
  eventId: string;
  name: string;
  /** "Mom's Birthday", "Diwali" */
  title: string;
  eventType: string;
  /** "3 Oct 2026" */
  dateLabel: string;
  daysAway: number;
  /** a gift has been arranged for it */
  handled: boolean;
  /** years since the original date, for "turns 60" style lines (0 = not a milestone) */
  milestone: number;
}

export interface PersonCardData {
  id: string;
  name: string;
  relationship: string | null;
  photoUrl: string | null;
  isFavorite: boolean;
  next: { daysAway: number; eventType: string } | null;
}

export interface IdeaCardData {
  productId: string;
  slug: string;
  name: string;
  price: number;
  thumbnail: string | null;
  vendorName: string | null;
  reason: string | null;
  wished?: boolean;
}

export interface CalendarMark {
  contactId: string;
  label: string;
  eventType: string;
}
/** "2026-10-20" -> the moments on that day */
export type CalendarMarks = Record<string, CalendarMark[]>;
