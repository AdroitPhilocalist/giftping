import { z } from "zod";
import { parseISODate } from "@/lib/diary/recurrence";

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optionalText = (max: number) => z.preprocess(blankToNull, z.string().trim().max(max, `Keep it under ${max} characters`).nullable().default(null));
const optionalDate = z.preprocess(blankToNull, z.string().refine((v) => parseISODate(v) !== null, "Enter a valid date").nullable().default(null));

// themeId isn't a static enum here (the registry in lib/theme/themes.ts grows over time) — the action layer
// checks it against schedulableThemes() before every write, which is the real gate.
export const themeScheduleSchema = z
  .object({
    themeId: z.string().min(1, "Choose a theme"),
    note: optionalText(100),
    startsOn: optionalDate,
    endsOn: optionalDate,
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.startsOn && v.endsOn && v.endsOn < v.startsOn) ctx.addIssue({ code: "custom", path: ["endsOn"], message: "The end date can't be before the start date" });
  });

export type ThemeScheduleInput = z.input<typeof themeScheduleSchema>;
export type ThemeScheduleData = z.output<typeof themeScheduleSchema>;
