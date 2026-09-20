import { z } from "zod";
import { safeCtaUrl } from "@/lib/content/banners";
import { parseISODate } from "@/lib/diary/recurrence";

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optionalText = (max: number) => z.preprocess(blankToNull, z.string().trim().max(max, `Keep it under ${max} characters`).nullable().default(null));
const optionalDate = z.preprocess(blankToNull, z.string().refine((v) => parseISODate(v) !== null, "Enter a valid date").nullable().default(null));

export const bannerSchema = z
  .object({
    headline: optionalText(80),
    subheading: optionalText(200),
    ctaText: optionalText(30),
    ctaUrl: z.preprocess(
      blankToNull,
      z.string().refine((v) => safeCtaUrl(v) !== null, "Use a page on this site (like /categories/birthday) or a full https:// link").nullable().default(null),
    ),
    altText: optionalText(160),
    audience: z.enum(["all", "customer", "vendor"]).default("all"),
    startsOn: optionalDate,
    endsOn: optionalDate,
    isActive: z.boolean().default(true),
    /** returned by the upload route; required when creating, optional when editing (keeps the current image) */
    imagePath: z.preprocess(blankToNull, z.string().nullable().default(null)),
  })
  .superRefine((v, ctx) => {
    if (v.ctaText && !v.ctaUrl) ctx.addIssue({ code: "custom", path: ["ctaUrl"], message: "Add the link the button should open" });
    if (v.startsOn && v.endsOn && v.endsOn < v.startsOn) ctx.addIssue({ code: "custom", path: ["endsOn"], message: "The end date can't be before the start date" });
  });

export type BannerInput = z.input<typeof bannerSchema>;
export type BannerData = z.output<typeof bannerSchema>;
