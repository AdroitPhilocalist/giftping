import { z } from "zod";
import { parseISODate } from "@/lib/diary/recurrence";

export const EVENT_TYPES = ["birthday", "anniversary", "wedding", "housewarming", "graduation", "festival", "thank-you", "other"] as const;
export const EVENT_TYPE_LABEL: Record<(typeof EVENT_TYPES)[number], string> = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  wedding: "Wedding",
  housewarming: "Housewarming",
  graduation: "Graduation",
  festival: "Festival",
  "thank-you": "Thank you",
  other: "Other",
};

export const RELATIONSHIPS = ["Mother", "Father", "Wife", "Husband", "Sister", "Brother", "Daughter", "Son", "Friend", "Colleague", "Boss", "Partner", "Grandparent", "Other"] as const;

const optionalText = (max: number) => z.string().trim().max(max).nullish().transform((v) => (v ? v : null));

/** "coffee, Books ,, travel" -> ["coffee","books","travel"]: lower-cased, de-duplicated, capped (the DB also caps at 15). */
export function parseInterests(value: string | string[] | null | undefined): string[] {
  const list = Array.isArray(value) ? value : (value ?? "").split(",");
  return Array.from(new Set(list.map((i) => i.trim().toLowerCase()).filter((i) => i.length > 0 && i.length <= 30)));
}

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter their name").max(100),
  relationship: optionalText(40),
  interests: z
    .union([z.string(), z.array(z.string())])
    .nullish()
    .transform((v) => parseInterests(v))
    .refine((v) => v.length <= 15, "Keep it to 15 interests or fewer"),
  giftPreferences: optionalText(500),
  notes: optionalText(1000),
  budgetMax: z.preprocess(
    (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? null : v),
    z.coerce.number().positive("Enter a budget above zero").max(10_000_000).nullable(),
  ),
  isFavorite: z.boolean().default(false),
});
export type ContactInput = z.input<typeof contactSchema>;

const isoDate = z
  .string()
  .refine((v) => parseISODate(v) !== null, "Enter a valid date")
  .refine((v) => Number(v.slice(0, 4)) >= 1900 && Number(v.slice(0, 4)) <= 2200, "Enter a year between 1900 and 2200");

export const eventSchema = z.object({
  contactId: z.string().uuid("Choose a person"),
  eventType: z.enum(EVENT_TYPES, { error: "Choose an occasion" }),
  title: optionalText(80),
  eventDate: isoDate,
  isRecurring: z.boolean().default(true),
  reminderDays: z
    .array(z.coerce.number().int().min(1, "Reminders are 1–60 days before").max(60, "Reminders are 1–60 days before"))
    .max(4, "Choose up to 4 reminders")
    .default([7, 3])
    .transform((d) => Array.from(new Set(d)).sort((a, b) => b - a)),
  notes: optionalText(500),
});
export type EventInput = z.input<typeof eventSchema>;

export const giftSchema = z.object({
  contactId: z.string().uuid("Choose a person"),
  giftName: z.string().trim().min(1, "What did you give?").max(120),
  eventType: z.enum(EVENT_TYPES).nullish().transform((v) => v ?? null),
  amount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? null : v),
    z.coerce.number().min(0).max(10_000_000).nullable(),
  ),
  notes: optionalText(500),
  giftedOn: isoDate.nullish().transform((v) => v ?? null),
});
export type GiftInput = z.input<typeof giftSchema>;
