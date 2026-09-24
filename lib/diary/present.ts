import { EVENT_TYPE_LABEL } from "../validation/diary.schema";

/**
 * Small pure helpers the diary pages share for turning raw rows into the words on the page ("Mom's Birthday", "9 days").
 * No I/O, unit-tested — the pages stay layout only.
 */
export const firstName = (fullName: string | null | undefined): string => (fullName ?? "").trim().split(/\s+/)[0] || "Your";

/** "Priya" -> "Priya's", "Mom" -> "Mom's". One rule everywhere (no "James'" vs "James's" mix-ups). */
export const possessive = (name: string): string => `${name.trim()}'s`;

/** "9 days", "Tomorrow", "Today" — the big number on a ticket. */
export function daysLabel(daysAway: number): string {
  if (daysAway <= 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  return `${daysAway} days`;
}

/** The same, for a small caption under a photo ("9 days") — "1 day" instead of "Tomorrow" reads better there. */
export function daysShort(daysAway: number): string {
  if (daysAway <= 0) return "Today";
  return daysAway === 1 ? "1 day" : `${daysAway} days`;
}

export function occasionName(eventType: string, title: string | null): string {
  return title?.trim() || EVENT_TYPE_LABEL[eventType as keyof typeof EVENT_TYPE_LABEL] || eventType;
}

/** "Mom's Birthday", "Diwali" (a festival title stands alone), "Priya & Arjun's Anniversary" style names are up to the user's own title. */
export function momentTitle(contactName: string, eventType: string, title: string | null): string {
  const custom = title?.trim();
  if (custom && eventType === "festival") return custom;
  return `${possessive(contactName)} ${custom || EVENT_TYPE_LABEL[eventType as keyof typeof EVENT_TYPE_LABEL] || eventType}`;
}

export const MONOGRAM_TONES = ["blush", "apricot", "sage", "sky", "mustard", "rose"] as const;
export type MonogramTone = (typeof MONOGRAM_TONES)[number];

/** A stable soft colour for a person without a photo: the same name always gets the same tint. */
export function monogramTone(seed: string): MonogramTone {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MONOGRAM_TONES[h % MONOGRAM_TONES.length];
}

/** The letter shown on a person's card: first letter of their name, upper-cased ("mom" -> "M"), or "♥" for a name with no letters. */
export function initialOf(name: string): string {
  const match = name.trim().match(/\p{L}/u);
  return match ? match[0].toUpperCase() : "♥";
}

/** A small, stable tilt for a card in a row, so a shelf of polaroids looks hand-placed without ever changing between renders. */
export function tiltFor(index: number, spread = 2.4): number {
  const pattern = [-1, 0.6, -0.4, 1, -0.8, 0.4, -0.6, 0.9];
  return Math.round(pattern[index % pattern.length] * spread * 10) / 10;
}

/** "Mom's birthday", "Diwali" — the phrase that follows "Gift ideas for …" (lower-case occasion, a festival's own name kept as written). */
export function momentPhrase(contactName: string, eventType: string, title: string | null): string {
  const custom = title?.trim();
  if (custom && eventType === "festival") return custom;
  const occasion = custom || EVENT_TYPE_LABEL[eventType as keyof typeof EVENT_TYPE_LABEL] || eventType;
  return `${possessive(contactName)} ${occasion.toLowerCase()}`;
}

const PLURAL: Record<string, string> = { birthday: "Birthdays", anniversary: "Anniversaries", wedding: "Weddings", housewarming: "Housewarmings", graduation: "Graduations", "thank-you": "Thank-yous", festival: "Festivals", other: "Special days" };
/** "Birthdays" — for "Favourite occasion: …". */
export const occasionPlural = (eventType: string): string => PLURAL[eventType] ?? occasionName(eventType, null);
